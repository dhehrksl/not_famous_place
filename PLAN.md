
    1 # 구현 계획: 언더그라운드 (안티 핫플 비밀 지도)
    2
    3 ## 1. 목표 (Objective)
    4 `UI_UX_PLAN.md`에 기반하여 "언더그라운드" 애플리케이션을 구현합니다. 기존 웹 기반의 "Iris Guard" 프로젝트 코드를
      걷어내고, Node.js (Express + SQLite) 백엔드와 React Native (Expo) 모바일 애플리케이션 구조로 전환합니다.
    5
    6 ## 2. 배경 및 동기 (Background & Motivation)
    7 사용자는 조용하고 로컬한 장소를 공유하되, 너무 유명해지면(특정 리뷰 수 초과 시) 지도에서 자동으로 영구
      삭제('폭파')되는 서비스를 구현하고자 합니다. 원본 기획서에는 MySQL을 사용하도록 명시되어 있으나, 현재 개발 환경의
      제약을 고려하여 핵심 기능을 모두 유지하되 로컬 테스트에 용이한 SQLite를 대신 사용하도록 조정합니다.
    8
    9 ## 3. 범위 및 영향 (Scope & Impact)
   10 - **백엔드 (`/backend`)**: 기존 Mongoose(MongoDB) 설정을 SQLite 및 Knex.js로 완전히 교체합니다. 장소 CRUD REST
      API와 폭파 엔진을 위한 스케줄러(Cron)를 구현합니다.
   11 - **프론트엔드 (`/frontend`)**: 기존 Vite/React 웹 설정을 Expo (React Native) 프로젝트로 교체합니다. 지도 렌더링,
      위치 기반 마커 표시, Lottie 애니메이션을 구현합니다.
   12
   13 ## 4. 제안하는 해결 방안 (Proposed Solution)
   14
   15 ### 1단계: 백엔드 인프라 (Node.js + Express + SQLite)
   16 1. **의존성 (Dependencies)**: MongoDB 관련 패키지를 제거하고 `sqlite3`, `knex`, `node-cron`, `cors`를 설치합니다.
   17 2. **데이터베이스 스키마**: Knex 마이그레이션을 사용하여 `places` 테이블을 생성합니다.
   18    - `id` (정수, 기본 키)
   19    - `name` (문자열)
   20    - `lat` (실수, 위도)
   21    - `lng` (실수, 경도)
   22    - `image_url` (문자열, Null 허용)
   23    - `review_count` (정수, 기본값 0)
   24    - `status` (문자열, 기본값 'ACTIVE', 'EXPLODED'로 변경 가능)
   25    - `created_at` (타임스탬프)
   26 3. **API 엔드포인트**:
   27    - `GET /api/places`: `lat`, `lng`, `radius`를 입력받습니다. SQLite는 공간 인덱스(Spatial Index) 함수를 지원하지
      않으므로, 먼저 사각형 형태의 영역(Bounding Box) 쿼리로 1차 필터링을 한 후, Node.js 서버 로직에서 Haversine 공식을
      사용해 정확한 반경 내 장소만 추려냅니다. `status: 'ACTIVE'`인 장소만 반환합니다.
   28    - `POST /api/places`: 새로운 장소를 등록합니다. 리뷰가 100개 이상인 핫플은 등록 즉시 거절(Reject)하는 로직(외부
      API 호출 시뮬레이션)을 포함합니다.
   29    - `GET /api/places/:id`: 특정 장소의 상세 정보를 조회합니다.
   30 4. **폭파 엔진 및 스케줄러 (Cron Job)**:
   31    - 주기적으로 실행되는 `node-cron` 스케줄러를 설정합니다. (실제 환경에서는 매일 새벽 구동, 테스트 시에는 매분
      구동)
   32    - 활성화된 장소들의 리뷰 수를 임의로 증가시키는 모의(Mock) 로직을 추가합니다.
   33    - `review_count`가 500을 돌파한 장소의 `status`를 `'EXPLODED'`로 업데이트합니다.
   34
   35 ### 2단계: 프론트엔드 구현 (React Native + Expo)
   36 1. **초기화**: Vite, Tailwind, React DOM 등의 기존 웹 의존성을 제거하고 표준 Expo 설정으로 초기화합니다.
   37 2. **의존성**: `react-native-maps`, `expo-location`, `lottie-react-native`, `axios`를 설치합니다.
   38 3. **핵심 UI 컴포넌트**:
   39    - **지도 화면 (Map Screen)**: 메인 화면입니다. `expo-location`을 사용해 유저의 현재 GPS 좌표를 가져오고,
      `react-native-maps`를 활용해 백엔드에서 받아온 활성화된 장소 마커를 지도에 렌더링합니다.
   40    - **등록 플로우**: 지도를 길게 누르면(Long Press) 해당 좌표에 마커를 꽂고, 장소 이름을 입력해 백엔드로 전송하는
      모달(Modal)을 띄웁니다.
   41    - **폭파 애니메이션**: 장소의 상태가 'EXPLODED'로 변경되었을 때, 유저가 마커를 탭하면 먼지처럼 사라지는 Lottie
      애니메이션을 재생한 뒤 지도에서 완전히 제거합니다.
   42
   43 ## 5. 검증 및 테스트 (Verification & Testing)
   44 1. **백엔드**: 수동 API 호출(curl/Postman) 또는 테스트 코드를 통해 CRUD 및 거리 계산 로직이 정상 동작하는지
      확인합니다. Cron 작업이 리뷰 수를 갱신하고 상태를 올바르게 바꾸는지 검증합니다.
   45 2. **프론트엔드**: Expo 웹 환경 또는 모바일 시뮬레이터(또는 실기기 엑스포 앱)에서 실행합니다. 위치 권한 허용, 지도
      정상 출력, 마커 렌더링 및 애니메이션 트리거가 원활한지 테스트합니다.