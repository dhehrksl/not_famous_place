import datetime
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_calendar_service():
    creds = None
    # token.json은 사용자의 액세스 및 리프레시 토큰을 저장합니다.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                return None # credentials.json이 없으면 서비스 불가
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    return build('calendar', 'v3', credentials=creds)

def add_event(summary, start_time_str, description=""):
    service = get_calendar_service()
    if not service: return "Google API 설정이 필요합니다."

    # 간단한 시간 파싱 (예: "2026-06-05T15:00:00")
    event = {
        'summary': summary,
        'description': description,
        'start': {'dateTime': start_time_str, 'timeZone': 'Asia/Seoul'},
        'end': {'dateTime': start_time_str, 'timeZone': 'Asia/Seoul'}, # 1시간 뒤로 설정 로직 추가 가능
    }
    
    event = service.events().insert(calendarId='primary', body=event).execute()
    return event.get('htmlLink')
