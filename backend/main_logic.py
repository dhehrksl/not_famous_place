import httpx
from bs4 import BeautifulSoup
from openai import OpenAI
import os
from sqlalchemy.orm import Session
from auth import EmailHistory

# API 키가 없어도 에러가 나지 않도록 처리
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

async def get_and_summarize_news():
    url = "https://news.naver.com/section/105"
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(response.text, "html.parser")
            headlines = soup.select(".sa_text_strong")[:5]
            news_list = [h.get_text().strip() for h in headlines]
            
            if not client: return {"raw": news_list, "ai_summary": "OpenAI API 키가 설정되지 않아 요약을 제공할 수 없습니다."}

            news_text = "\n".join(news_list)
            prompt = f"다음 뉴스 제목들을 보고 전체적인 IT 트렌드를 요약해줘.\n\n{news_text}"
            ai_res = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}])
            return {"raw": news_list, "ai_summary": ai_res.choices[0].message.content}
    except Exception as e: 
        return {"raw": [], "ai_summary": f"오류 발생: {str(e)}"}

def refine_and_save_email(content: str, db: Session, user_id: int):
    if not client:
        refined = f"[AI 연동 필요] 다듬어진 내용: {content}"
    else:
        try:
            prompt = f"다음 내용을 정중한 비즈니스 문체로 다듬어줘.\n\n내용: {content}"
            res = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}])
            refined = res.choices[0].message.content
        except Exception as e:
            refined = f"AI 처리 중 오류: {str(e)}"

    db_history = EmailHistory(original_content=content, refined_content=refined, owner_id=user_id)
    db.add(db_history)
    db.commit()
    return refined
