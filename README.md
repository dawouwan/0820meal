# 밥집 찾기 (FOOD_TERM)

서울 지역 맛집 정보를 찾아주는 사이버펑크 터미널 컨셉의 개인용 웹앱입니다. 빌드 도구 없이 순수 HTML/CSS/JS(ES Modules)로 작성되었습니다.

## 주요 기능

- **로그인/회원가입**: Supabase Auth 기반 이메일/비밀번호 로그인 (`auth.js`, `supabaseClient.js`). 헤더 우측 모달로 동작하며, 로그인하지 않아도 조회 기능은 그대로 사용 가능
- **내 주변(위치 기반) 검색**: 카카오 로컬 API로 현재 위치 반경의 실제 음식점을 거리순으로 조회 (MENU 탭 기본 모드, `nearbyApi.js`)
- **지역/카테고리 검색**: 서울 시군구 선택 + 업종 카테고리 필터로 맛집 목록 조회 (MENU 탭, "지역 선택" 모드)
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

브라우저에서 `http://localhost:5501/index.html` 접속.

### 로그인

- 헤더 우측 "로그인" 버튼 → 모달에서 이메일/비밀번호로 로그인 또는 회원가입
- 회원가입은 이메일 인증 대기 없이 바로 로그인 상태가 됨 (Supabase 프로젝트의 Authentication → Providers → Email → "Confirm email" 설정이 꺼져 있어야 함)
- 로그인하지 않아도 MENU/CART 탭 조회는 그대로 사용 가능. 로그인은 향후 "로그인한 사용자만 맛집 담기 허용" 기능을 위한 준비 단계(`getCurrentUser()`/`onAuthStateChange()`를 재사용)

## API 설정

실제 키는 git에 커밋되지 않는 `secrets.local.js`에 넣습니다. 처음 클론했다면:

```bash
# macOS/Linux
cp secrets.local.example.js secrets.local.js
# Windows
copy secrets.local.example.js secrets.local.js
```

그 후 `secrets.local.js`를 열어 값을 채웁니다.

- `KAKAO_JS_KEY` — [카카오 개발자센터](https://developers.kakao.com/)에서 앱 등록 후 JavaScript 키 발급. 플랫폼 설정에 로컬 서버 주소(예: `http://localhost:5501`)를 Web 플랫폼으로 등록해야 합니다. "내 주변" 위치 기반 검색에 사용됩니다.
- `KCISA_SERVICE_KEY` — 문화공공데이터광장 오픈API 서비스키. 비워 두면 자동으로 `mockData.js`의 목업 데이터를 사용합니다. 요청 경로 등 나머지 설정은 `config.js`에서 관리합니다.

### 구글 리뷰 API 키 (서버 전용, 별도 파일)

구글 리뷰 조회(`api/reviews.js`)는 위 3개와 달리 **브라우저에 노출되면 안 되는 서버 전용 키**라 `secrets.local.js`가 아니라 환경 변수로 따로 관리합니다.

```bash
# macOS/Linux
cp .env.local.example .env.local
# Windows
copy .env.local.example .env.local
```

`.env.local`을 열어 `GOOGLE_PLACES_API_KEY`를 채웁니다. 발급처는 Google Cloud Console → API 및 서비스 → 사용자 인증 정보이며, 해당 프로젝트에 **"Places API (New)"가 사용 설정**되어 있고 **결제(billing)가 켜져** 있어야 합니다.

- 로컬 테스트: `/api`는 서버리스 함수라 일반 정적 서버(`python -m http.server` 등)로는 동작하지 않습니다. [Vercel CLI](https://vercel.com/docs/cli)를 설치해 `vercel dev`로 실행하면 `.env.local`을 자동으로 읽습니다.
- 배포(Vercel): `.env.local`은 커밋되지 않으므로, Vercel 프로젝트 설정 → Environment Variables에 `GOOGLE_PLACES_API_KEY`를 동일한 이름으로 등록해야 배포본에서도 동작합니다.

## 프로젝트 구조

```
index.html                  메인 화면 (MENU / CART 탭) — 로그인 모달도 여기서 마운트
app.js                      메인 화면 오케스트레이션/상태 관리
auth.js                     Supabase Auth 연동 (로그인/회원가입/로그아웃/현재 사용자 조회)
supabaseClient.js           Supabase 클라이언트 싱글턴
bookmarks.js                맛집 담기(북마크) 저장소
api.js                      KCISA API 연동 (지역 선택 모드)
nearbyApi.js                카카오 로컬 API 연동 (내 주변 위치 기반 모드)
mockData.js                 목업 데이터
categoryMap.js               카테고리 정규화/표시 매핑
regions.json                 서울 시군구 목록
config.js                    비-비밀 설정 + secrets.local.js 재수출
secrets.local.example.js     API 키 템플릿 (커밋됨)
secrets.local.js             실제 API 키 (.gitignore 대상, 커밋 안 됨)
.env.local.example           구글 리뷰용 서버 전용 키 템플릿 (커밋됨)
.env.local                   실제 GOOGLE_PLACES_API_KEY (.gitignore 대상, 커밋 안 됨)
api/reviews.js                구글 리뷰 조회 서버리스 함수 (Places API New 프록시)
googleReviews.js             구글 리뷰 조회 클라이언트 + localStorage 캐시
theme.js                     Tailwind 디자인 토큰 + 네온 색상 CSS 변수 동기화
styles.css                   네온 발광 유틸리티 등 공용 스타일
components/ui/               화면 컴포넌트 (RegionSelect, CategoryChip, RestaurantCard, DetailModal, BottomNav, StatusView, AuthModal, AuthWidget)
mealgifgma_prd0820.md       제품 요구사항 문서(PRD)
```
