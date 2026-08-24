// secrets.generated.js를 .env.local(또는 배포 환경 변수)로부터 생성한다. config.js가 이 파일을
// 정적 import로 가져오는데, 브라우저에서 실행되는 정적 JS라 process.env를 직접 읽을 수 없어서
// 이 빌드 단계가 필요하다. 이 프로젝트에서 API 키를 손으로 채우는 곳은 .env.local 하나뿐이며,
// secrets.generated.js는 절대 손으로 만들거나 수정하지 않는다(이름 그대로 순수 생성물).
//
// 여기 담기는 건 "브라우저 SDK가 직접 써야 해서 어차피 클라이언트에 공개되는" 키뿐이다
// (KAKAO_JS_KEY, KAKAO_REST_API_KEY). GOOGLE_PLACES_API_KEY/GEMINI_API_KEY/KCISA_SERVICE_KEY처럼
// 서버에서만 써도 되는 키는 절대 여기 넣지 않는다 — 그런 키는 api/*.js 서버리스 함수 안에서
// process.env로만 읽는다.
//
// 값의 출처는 하나 — 환경 변수 — 지만 두 경로로 채워진다:
//   1) Vercel 빌드: 프로젝트 설정 → Environment Variables에 등록한 값이 process.env로 들어온다.
//   2) 로컬(npm run build / npm run gen-secrets): .env.local 파일을 직접 읽어 process.env에
//      없는 값을 보충한다(별도 패키지 없이 최소 파서로 처리).
//
// 두 경우 모두 매번 이 스크립트가 실행될 때마다 secrets.generated.js를 새로 써서 최신 값을 반영한다.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadEnvLocalFile() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return {};

  const values = {};
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const envLocal = loadEnvLocalFile();

// process.env 우선(Vercel 빌드 환경), 없으면 .env.local 파일 값으로 보충(로컬 실행).
function readVar(name) {
  return process.env[name] || envLocal[name] || '';
}

const KAKAO_JS_KEY = readVar('KAKAO_JS_KEY');
const KAKAO_REST_API_KEY = readVar('KAKAO_REST_API_KEY');

const outPath = path.join(ROOT, 'secrets.generated.js');

const content = `// scripts/generate-secrets.js가 .env.local / 환경 변수로부터 자동 생성한 파일입니다.
// 직접 수정하지 마세요 — 값은 .env.local(로컬) 또는 Vercel 프로젝트 설정의
// Environment Variables(배포)에서 바꾸고 "npm run build"(또는 gen-secrets)를 다시 실행하세요.
export const KAKAO_JS_KEY = ${JSON.stringify(KAKAO_JS_KEY)};
export const KAKAO_REST_API_KEY = ${JSON.stringify(KAKAO_REST_API_KEY)};
`;

fs.writeFileSync(outPath, content);
console.log('secrets.generated.js를 .env.local/환경 변수로부터 생성했습니다.');
