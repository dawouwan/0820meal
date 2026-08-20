// localStorage 기반 로컬 1계정 "인증" — 실제 서버 인증이 아님(PRD "서버·계정 없음" 원칙에 맞춰
// 진짜 백엔드 없이, 개인용 로컬 도구 편의를 위한 클라이언트 저장소 흉내).

const ACCOUNT_KEY = 'bapjip_account';
const SESSION_KEY = 'bapjip_session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

// 테스트용 마스터 키 — 비밀번호 칸에 이 문자열을 입력하면 이메일 값과 무관하게 즉시 로그인된다.
// 소스에 그대로 노출되는 값이라 진짜 비밀이 아님(로컬 개인용 도구라 배포 대상 아님을 전제).
const MASTER_KEY = 'bapjip-master';

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getAccount() {
  return readJSON(ACCOUNT_KEY);
}

export function getSession() {
  return readJSON(SESSION_KEY);
}

export function isLoggedIn() {
  return !!getSession();
}

export function validateEmail(email) {
  return EMAIL_RE.test((email || '').trim());
}

export function validatePassword(password) {
  return !!password && password.length >= MIN_PASSWORD_LENGTH;
}

// 명시적 회원가입 — 계정이 이미 있으면 실패(로컬 1계정 모델), 형식 검증 후 신규 생성.
export function attemptRegister(email, password, confirmPassword) {
  const trimmedEmail = (email || '').trim();

  if (!trimmedEmail || !password) {
    return { ok: false, error: '> REGISTER_FAILED: EMAIL/PASSWORD REQUIRED' };
  }
  if (!validateEmail(trimmedEmail)) {
    return { ok: false, error: '> REGISTER_FAILED: INVALID_EMAIL_FORMAT' };
  }
  if (!validatePassword(password)) {
    return { ok: false, error: `> REGISTER_FAILED: PASSWORD_TOO_SHORT (MIN ${MIN_PASSWORD_LENGTH} CHARS)` };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: '> REGISTER_FAILED: PASSWORD_CONFIRM_MISMATCH' };
  }
  if (getAccount()) {
    return { ok: false, error: '> REGISTER_FAILED: ACCOUNT_ALREADY_EXISTS — 로그인하거나 RESET_ACCOUNT를 사용하세요' };
  }

  if (!writeJSON(ACCOUNT_KEY, { email: trimmedEmail, password })) {
    return { ok: false, error: '> REGISTER_FAILED: STORAGE_WRITE_ERROR' };
  }
  if (!writeJSON(SESSION_KEY, { email: trimmedEmail, loggedInAt: Date.now() })) {
    return { ok: false, error: '> REGISTER_FAILED: SESSION_WRITE_ERROR' };
  }

  return { ok: true, created: true };
}

// 로그인 — 계정이 없으면 실패(회원가입 유도), 있으면 email+password를 비교한다.
export function attemptLogin(email, password) {
  const trimmedEmail = (email || '').trim();

  if (password === MASTER_KEY) {
    if (!writeJSON(SESSION_KEY, { email: trimmedEmail || 'MASTER', loggedInAt: Date.now(), master: true })) {
      return { ok: false, error: '> AUTH_FAILED: SESSION_WRITE_ERROR' };
    }
    return { ok: true, master: true };
  }

  if (!trimmedEmail || !password) {
    return { ok: false, error: '> AUTH_FAILED: EMAIL/PASSWORD REQUIRED' };
  }
  if (!validateEmail(trimmedEmail)) {
    return { ok: false, error: '> AUTH_FAILED: INVALID_EMAIL_FORMAT' };
  }

  const account = getAccount();
  if (!account) {
    return { ok: false, error: '> AUTH_FAILED: NO_ACCOUNT_FOUND — 먼저 회원가입하세요', noAccount: true };
  }

  if (account.email === trimmedEmail && account.password === password) {
    if (!writeJSON(SESSION_KEY, { email: trimmedEmail, loggedInAt: Date.now() })) {
      return { ok: false, error: '> AUTH_FAILED: SESSION_WRITE_ERROR' };
    }
    return { ok: true, created: false };
  }

  return { ok: false, error: '> AUTH_FAILED: EMAIL/PASSWORD MISMATCH' };
}

export function resetAccount() {
  removeKey(ACCOUNT_KEY);
  removeKey(SESSION_KEY);
}

// index.html의 로그아웃 버튼에 그대로 이벤트 핸들러로 연결되므로(인자로 클릭 이벤트가 들어올 수 있음)
// 별도 인자를 받지 않는다. login.html은 쿼리스트링으로 로그아웃 완료 여부를 확인한다.
export function logout() {
  try {
    removeKey(SESSION_KEY);
  } finally {
    window.location.href = 'login.html?logged_out=1';
  }
}

// index.html 최상단에서 호출 — 세션 없으면 즉시 로그인 화면으로 리다이렉트(콘텐츠 플래시 방지).
export function requireSession() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}
