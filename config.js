// ⚠️ 사용자 설정 파일 — KCISA 오픈API 정보를 여기에 채워 넣으세요.
// 데이터 소스: 문화공공데이터광장/문화빅데이터플랫폼(한국문화정보원)
//   openApiId=75493ae2-825d-49fb-893a-e2825d19fb9a (id=603) / API_CNV_063
// PRD §4.5 / §11 기준으로 아직 미확정인 값은 TODO로 표시되어 있습니다.

// 실제 서비스키/앱키는 이 파일이 아니라 secrets.local.js(.gitignore 대상)에 넣습니다.
// 처음 클론했다면 secrets.local.example.js를 secrets.local.js로 복사한 뒤 값을 채워주세요.
export { KCISA_SERVICE_KEY, KAKAO_JS_KEY, KAKAO_REST_API_KEY } from './secrets.local.js';

// Supabase 프로젝트 URL + publishable(anon) key — 클라이언트에 노출되는 것이 정상인 공개 키라
// secrets.local.js가 아니라 여기(커밋되는 파일)에 둔다.
export const SUPABASE_URL = 'https://lkbdhcblujmxveaikwci.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RFYX71rT6mMrztKPC25iZA_5-STPONd';

export const KCISA_BASE_URL = 'https://api.kcisa.kr/openapi/service/rest';

// TODO(user): Swagger/공공데이터포털 문서에서 실제 {service}/{operation} 경로를 확인해 채워주세요.
// 예: 'MetaDataService/getMetaData03' 같은 형태일 수 있습니다.
export const KCISA_SERVICE_PATH = '';

export const NUM_OF_ROWS = 100;
// 일일 호출 한도(1,000건, PRD §1.3) 보호용 안전장치 — 한 번의 지역 조회당 최대 페이지 수.
export const MAX_PAGES = 10;

// API가 시도/시군구, 업종 파라미터를 지원하는지 확인되면 true로 바꾸고
// 아래 파라미터명을 실제 값으로 채워 넣으세요. false인 동안 api.js는 전체 데이터를
// 받아와 주소 문자열 기준으로 클라이언트에서 필터링합니다(PRD §4.2).
export const SUPPORTS_REGION_PARAM = false;
export const SIDO_PARAM_NAME = ''; // 예: 'sido', 'ctprvnCd'
export const SIGUNGU_PARAM_NAME = ''; // 예: 'sigungu', 'signguCd'

export const SUPPORTS_CATEGORY_PARAM = false;
export const CATEGORY_PARAM_NAME = ''; // 예: 'induty', 'cate1'

// TODO(user): 실제 API 응답 필드명으로 교체하세요. 비워두면 api.js가 흔한 후보 필드명들을
// 자동으로 시도합니다(방어적 파싱) — 정확한 매핑을 알게 되면 여기에 명시하는 것을 권장합니다.
export const FIELD_MAP = {
  name: '', // 예: 'MAIN_TITLE', 'FCLTY_NM' 등
  category: '', // 예: 'CATE1', 'INDUTY_NM' 등
  roadAddress: '', // 예: 'RDNMADR'
  jibunAddress: '', // 예: 'LNM_ADDR'
  tel: '', // 예: 'TEL_NO'
  sido: null,
  sigungu: null,
};

// PRD §7/§8.5 — "정보 기준일" 표시용. 실제 데이터 확인 후 채우세요.
export const DATA_AS_OF = '';
