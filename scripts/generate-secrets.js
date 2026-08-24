// Vercel 빌드 시 실행되어 secrets.local.js를 환경 변수로부터 생성한다.
// secrets.local.js는 .gitignore 대상이라 배포본 저장소에 존재하지 않는데, config.js가
// 이 파일을 정적 import로 가져오므로 없으면 앱 전체(app.js 모듈 그래프)가 실행되지 않는다.
// 로컬 개발에서는 이 스크립트를 실행할 필요 없다 — secrets.local.example.js를 복사해
// 직접 채운 secrets.local.js를 그대로 쓰면 된다(이 스크립트가 있어도 덮어쓰지 않음, package.json의
// build 스크립트만 이 파일을 실행함).

const fs = require('fs');
const path = require('path');

const KAKAO_JS_KEY = process.env.KAKAO_JS_KEY || '';
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || '';
const KCISA_SERVICE_KEY = process.env.KCISA_SERVICE_KEY || '';

const outPath = path.join(__dirname, '..', 'secrets.local.js');

// 로컬에 이미 실제 값이 채워진 secrets.local.js가 있으면 덮어쓰지 않는다 — 이 스크립트는
// Vercel 빌드 환경(파일이 아예 없는 상태)을 위한 것이지, 로컬 작업 파일을 대체하기 위한 게 아니다.
if (fs.existsSync(outPath)) {
  console.log('secrets.local.js가 이미 존재해 건너뜁니다 (로컬 개발 환경으로 판단).');
  process.exit(0);
}

const content = `// Vercel 빌드 시 scripts/generate-secrets.js가 환경 변수로부터 자동 생성한 파일입니다.
// 로컬에서 직접 수정하지 마세요 — 로컬 개발은 secrets.local.example.js를 복사해서 쓰세요.
export const KAKAO_JS_KEY = ${JSON.stringify(KAKAO_JS_KEY)};
export const KAKAO_REST_API_KEY = ${JSON.stringify(KAKAO_REST_API_KEY)};
export const KCISA_SERVICE_KEY = ${JSON.stringify(KCISA_SERVICE_KEY)};
`;

fs.writeFileSync(outPath, content);
console.log('secrets.local.js를 환경 변수로부터 생성했습니다.');
