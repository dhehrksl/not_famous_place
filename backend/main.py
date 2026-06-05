from fastapi import FastAPI, HTTPException, Depends, status, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import uvicorn
import shutil
import os
import httpx
import re
from bs4 import BeautifulSoup
from pydantic import BaseModel
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from auth import get_db, User, EmailHistory, UploadedFile, verify_password, get_password_hash, create_access_token, get_current_user
from main_logic import get_and_summarize_news, refine_and_save_email

# RAG & Tools
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

app = FastAPI(title="AI Agent Enterprise SaaS")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# CORS
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

CHROMA_PATH = "./chroma_db"
embeddings = OpenAIEmbeddings() if os.getenv("OPENAI_API_KEY") else None

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    persona: str = "General"

# --- [Reliability] 1. 자동 재시도 및 백오프 로직 ---
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def call_openai_with_retry(messages, system_prompt):
    return client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system_prompt}] + messages
    )

# --- [Security] 2. PII 보호 로직 ---
def mask_sensitive_info(text: str) -> str:
    text = re.sub(r'[\w\.-]+@[\w\.-]+', '[EMAIL_PROTECTED]', text)
    text = re.sub(r'\d{2,3}-\d{3,4}-\d{4}', '[PHONE_PROTECTED]', text)
    return text

# --- [Action] 3. URL 스크래퍼 ---
async def scrape_url(url: str):
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        try:
            res = await http_client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(res.text, "html.parser")
            for s in soup(["script", "style"]): s.decompose()
            return soup.get_text(separator=' ', strip=True)[:3000]
        except: return None

# --- Main Engine ---
@app.post("/api/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    raw_input = request.messages[-1]["content"]
    persona = request.persona
    logs = []
    
    # 보안 마스킹
    user_input = mask_sensitive_info(raw_input)
    if raw_input != user_input:
        logs.append("🛡️ 보안 엔진: 민감 정보(PII) 감지 및 마스킹 완료")

    # URL 감지 및 스크래핑
    if "http" in user_input:
        urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', user_input)
        if urls:
            logs.append(f"🔗 외부 데이터 소스 접속: {urls[0]}")
            web_content = await scrape_url(urls[0])
            if web_content:
                logs.append("✅ 실시간 웹 데이터 학습 성공")
                user_input = f"[웹사이트 참고내용: {web_content}]\n\n{user_input}"

    # RAG 내부 문서 검색
    user_db_path = f"{CHROMA_PATH}/{current_user.username}"
    context = ""
    if os.path.exists(user_db_path) and embeddings:
        logs.append("🔍 전용 지식 베이스(RAG) 탐색 중...")
        vectorstore = Chroma(persist_directory=user_db_path, embedding_function=embeddings)
        results = vectorstore.similarity_search(user_input, k=2)
        if results:
            context = "\n".join([r.page_content for r in results])
            logs.append(f"📚 내부 지식 조각 {len(results)}건 매칭")

    # 페르소나 및 안정적인 AI 호출
    system_prompts = {
        "General": "업무 지원 비서", "Expert": "시니어 컨설턴트", 
        "Creative": "감각적인 카피라이터", "Legal": "철저한 법률 조언가"
    }
    
    logs.append("🧠 AI 엔진: 신뢰 응답 생성 중 (Retry Enabled)")
    try:
        response = call_openai_with_retry(
            messages=[{"role": "user", "content": f"Context: {context}\n\nUser Input: {user_input}"}],
            system_prompt=f"당신은 {system_prompts.get(persona)}입니다. 전문적으로 답하세요."
        )
        ai_content = response.choices[0].message.content
        current_user.token_usage += len(ai_content)
        db.commit()
        return {"type": "ENTERPRISE", "content": ai_content, "logs": logs, "actions": ["결과 PDF 다운로드", "팀원에게 공유"]}
    except Exception as e:
        return {"type": "ERROR", "content": f"시스템 일시적 오류: {str(e)}", "logs": logs}

# --- SaaS Management APIs ---
@app.get("/api/files")
async def list_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(UploadedFile).filter(UploadedFile.owner_id == current_user.id).all()

@app.get("/api/usage")
async def get_usage(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "token_usage": current_user.token_usage, "token_limit": 50000, "tier": current_user.tier}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_path = f"./uploads/{file.filename}"
    os.makedirs("./uploads", exist_ok=True)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    loader = PyPDFLoader(file_path)
    splits = RecursiveCharacterTextSplitter(chunk_size=500).split_documents(loader.load())
    Chroma.from_documents(splits, embeddings, persist_directory=f"{CHROMA_PATH}/{current_user.username}")
    db.add(UploadedFile(filename=file.filename, file_size=file.size, owner_id=current_user.id))
    db.commit()
    return {"message": f"'{file.filename}' 지식화 완료"}

# Auth
@app.post("/api/signup")
async def signup(username: str, password: str, db: Session = Depends(get_db)):
    db.add(User(username=username, hashed_password=get_password_hash(password)))
    db.commit()
    return {"message": "success"}

@app.post("/api/login")
async def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password): raise HTTPException(401)
    return {"access_token": create_access_token(data={"sub": user.username}), "token_type": "bearer"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
