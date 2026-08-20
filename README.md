# 밥집 찾기 (FOOD_TERM)

서울 지역 맛집 정보를 찾아주는 사이버펑크 터미널 컨셉의 개인용 웹앱입니다. 빌드 도구 없이 순수 HTML/CSS/JS(ES Modules)로 작성되었습니다.

## 주요 기능

- **로그인/회원가입**: `localStorage` 기반 간이 계정 시스템 (`auth.js`)
- **지역/카테고리 검색**: 서울 시군구 선택 + 업종 카테고리 필터로 맛집 목록 조회 (MENU 탭)
- **맛집 담기 (CART 탭)**: 키워드/카테고리로 검색해 카드 형태로 결과를 보고, 원하는 곳을 북마크에 저장
- **상세 정보 모달**: 카드를 클릭하면 주소/전화 등 상세 정보 확인
- **네온 디자인 시스템**: 시안/마젠타 톤의 발광 효과(`.neon-border`, `.neon-glow-*`, `.neon-text` 등)로 통일된 사이버펑크 톤 유지, `prefers-reduced-motion` 대응

## 기술 스택

- 순수 HTML + Vanilla JS (ES Modules) — 빌드 도구/프레임워크 없음
- [Tailwind CDN](https://tailwindcss.com/) + 커스텀 디자인 토큰 (`theme.js`)
- 데이터: [KCISA 문화공공데이터광장 오픈API](https://www.culture.go.kr/data/) (미설정 시 `mockData.js` 목업 데이터로 자동 대체)

## 실행 방법

ES Module을 사용하므로 `file://`로 직접 열지 말고 로컬 서버로 구동해야 합니다.

```bash
# Python
python -m http.server 5501

# 또는 VS Code Live Server 확장 (.vscode/settings.json에 포트 5501로 설정됨)
```

브라우저에서 `http://localhost:5501/login.html` 접속.

### 로그인

- 이메일/비밀번호로 회원가입 후 로그인
- **테스트용 마스터 키**: 비밀번호 칸에 `bapjip-master` 입력 시 이메일과 무관하게 즉시 로그인 (개인 로컬 도구 전용, 배포 대상 아님)

## API 설정

`config.js`에 KCISA 오픈API 서비스키와 요청 경로를 입력하면 실 데이터를 조회합니다. 값이 비어 있으면 자동으로 `mockData.js`의 목업 데이터를 사용합니다.

## 프로젝트 구조

```
index.html          메인 화면 (MENU / CART 탭)
login.html           로그인/회원가입 화면
app.js               메인 화면 오케스트레이션/상태 관리
auth.js              localStorage 기반 인증
bookmarks.js         맛집 담기(북마크) 저장소
api.js               KCISA API 연동
mockData.js          목업 데이터
categoryMap.js       카테고리 정규화/표시 매핑
regions.json         서울 시군구 목록
config.js            API 키/필드 매핑 설정 (사용자가 채워 넣는 파일)
theme.js             Tailwind 디자인 토큰 + 네온 색상 CSS 변수 동기화
styles.css           네온 발광 유틸리티 등 공용 스타일
components/ui/       화면 컴포넌트 (RegionSelect, CategoryChip, RestaurantCard, DetailModal, BottomNav, StatusView)
mealgifgma_prd0820.md  제품 요구사항 문서(PRD)
```
