// 실제 키를 넣는 파일은 secrets.local.js 입니다 (이 파일을 복사해서 만드세요, .gitignore에 등록되어 커밋되지 않습니다).
//   cp secrets.local.example.js secrets.local.js   (Windows: copy secrets.local.example.js secrets.local.js)
// 이 프로젝트에서 쓰는 API 키 3개를 전부 이 한 파일에 모아 둡니다. 다른 코드 파일은 건드릴 필요 없습니다.

// 1) 카카오 개발자센터(https://developers.kakao.com/) → 내 애플리케이션 → 앱 키 → JavaScript 키.
// 플랫폼 설정에 로컬 서버 주소(예: http://localhost:5501)를 Web 플랫폼으로 등록해야 동작합니다.
export const KAKAO_JS_KEY = '';

// 2) 같은 화면의 REST API 키 — 지금 코드에서는 사용하지 않지만 보관용으로 넣어둡니다.
export const KAKAO_REST_API_KEY = '';

// 3) 문화공공데이터광장(KCISA) 오픈API 서비스키. 비워두면 mockData.js로 대체됩니다.
export const KCISA_SERVICE_KEY = '';
