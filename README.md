# 🚀 AI Agent Max: Enterprise SaaS Workspace

Bixby Studio 개발 경험을 현대적인 **GenAI 아키텍처**로 재해석한 산업용 AI SaaS 플랫폼입니다. 단순한 챗봇을 넘어, 기업 지식 관리(RAG), 실시간 웹 브라우징, 그리고 철저한 데이터 보안 기능을 갖춘 **Production-Ready** 솔루션입니다.

## 🌟 핵심 상용화 기술 (Industrial Grade)

### 1. 지능형 지식 학습 엔진 (Advanced RAG)
- **Multi-Source Learning**: 사용자가 업로드한 PDF 문서와 실시간 웹 URL 데이터를 동시에 학습하여 답변에 반영합니다.
- **Vector Indexing**: `ChromaDB`를 활용하여 방대한 문서 데이터에서 고속으로 관련 컨텍스트를 추출합니다.

### 2. 기업용 보안 및 신뢰성 (Security & Reliability)
- **PII Protection**: 사용자의 입력 중 이메일, 전화번호 등 민감 정보를 AI 서버 전송 전 자동으로 마스킹(Masking) 처리합니다.
- **Exponential Backoff Retry**: 네트워크 지연이나 API 오류 발생 시 `Tenacity`를 활용한 지능형 자동 재시도 로직으로 서비스 안정성을 보장합니다.

### 3. SaaS 비즈니스 로직
- **Token Usage Tracking**: 실시간으로 사용자의 토큰 소비량을 추적하고 대시보드에 시각화합니다.
- **Tiered Access**: Free/Pro 티어 구분을 통한 비즈니스 모델 확장성을 확보했습니다.

### 4. Bixby 기반 Intent-Action 설계
- Bixby Studio에서의 NLU 설계 경험을 바탕으로, AI의 사고 과정(Reasoning Log)을 시각화하고 최적화된 액션 버튼(Smart Reply)을 제공합니다.

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14, Tailwind CSS, Framer Motion, Lucide Icons, React-Markdown |
| **Backend** | FastAPI (Python), SQLAlchemy, LangChain, Tenacity, BeautifulSoup4 |
| **Database** | SQLite (Metadata), ChromaDB (Vector Store) |
| **AI/ML** | OpenAI GPT-4o, OpenAI Embeddings |

## 📂 Project Structure

```text
ProjectOneSK/
├── frontend/             # Next.js 프론트엔드 (SaaS Dashboard)
│   └── app/page.tsx      # 프리미엄 UI 및 스트리밍 로직
├── backend/              # FastAPI 백엔드 (AI/Action Engine)
│   ├── main.py           # 메인 서비스 로직 & 보안 엔진
│   ├── auth.py           # JWT 인증 및 SaaS DB 모델
│   ├── main_logic.py     # 뉴스 & 요약 모듈
│   └── calendar_service.py # Google API 연동 모듈
└── README.md             # 프로젝트 기술서
```

## 🏃 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
python main.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
> 브라우저에서 `http://localhost:3000` 접속 후 '가입하기'부터 시작하세요.

---
**Developed with focus on Enterprise-grade AI Experience.**
