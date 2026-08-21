// 로그인/회원가입 모달 — 이메일+비밀번호, 실제 인증/검증은 Supabase에 위임(auth.js 경유).
// 회원가입 성공 시 별도 이메일 인증 대기 없이 바로 로그인 상태가 된다.
// 로그인하지 않아도 앱의 기존 기능(메뉴 조회 등)은 그대로 쓸 수 있으므로, 이 모달은
// "떠 있는 선택적 레이어"일 뿐 앱 진입을 막지 않는다.

import { signIn, signUp } from '../../auth.js';

export function createAuthModal({ onAuthed } = {}) {
  const root = document.createElement('div');
  root.id = 'auth-modal';
  root.className = 'hidden fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4';
  root.innerHTML = `
    <div class="w-full max-w-[400px] bg-surface-container-lowest border-2 border-primary neon-border p-6 relative">
      <button id="auth-modal-close" type="button" aria-label="Close" class="absolute top-3 right-3 text-outline hover:text-primary">
        <span class="material-symbols-outlined">close</span>
      </button>

      <div class="flex mb-6 border border-primary/50">
        <button type="button" data-auth-tab="login" class="flex-1 py-3 font-label-caps text-label-caps uppercase tracking-widest transition-colors" aria-pressed="true">로그인</button>
        <button type="button" data-auth-tab="register" class="flex-1 py-3 font-label-caps text-label-caps uppercase tracking-widest transition-colors border-l border-primary/50" aria-pressed="false">회원가입</button>
      </div>

      <form id="auth-form" class="flex flex-col">
        <div class="mb-4">
          <label class="block font-label-caps text-label-caps text-primary mb-2" for="auth-email">이메일</label>
          <input id="auth-email" type="email" required autocomplete="email"
            class="w-full bg-surface-container-low border border-primary/50 px-4 py-3 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface/30 focus:outline-none neon-border"
            placeholder="you@example.com">
        </div>
        <div class="mb-2">
          <label class="block font-label-caps text-label-caps text-primary mb-2" for="auth-password">비밀번호</label>
          <input id="auth-password" type="password" required autocomplete="current-password"
            class="w-full bg-surface-container-low border border-primary/50 px-4 py-3 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface/30 focus:outline-none neon-border"
            placeholder="비밀번호">
        </div>

        <p id="auth-error" class="hidden font-code-md text-code-md text-error mt-4"></p>
        <p id="auth-info" class="hidden font-code-md text-code-md text-primary mt-4"></p>

        <button id="auth-submit" type="submit"
          class="w-full mt-6 bg-primary text-on-primary-container font-label-caps text-label-caps py-4 hover:bg-primary-fixed-dim transition-colors uppercase tracking-widest shadow-[0_0_15px_rgba(0,240,255,0.4)] disabled:opacity-60">
          로그인
        </button>
      </form>
    </div>`;

  const closeBtn = root.querySelector('#auth-modal-close');
  const tabLogin = root.querySelector('[data-auth-tab="login"]');
  const tabRegister = root.querySelector('[data-auth-tab="register"]');
  const form = root.querySelector('#auth-form');
  const emailInput = root.querySelector('#auth-email');
  const passwordInput = root.querySelector('#auth-password');
  const errorEl = root.querySelector('#auth-error');
  const infoEl = root.querySelector('#auth-info');
  const submitBtn = root.querySelector('#auth-submit');

  let mode = 'login';

  function applyMode() {
    const isRegister = mode === 'register';
    tabLogin.setAttribute('aria-pressed', String(!isRegister));
    tabRegister.setAttribute('aria-pressed', String(isRegister));
    tabLogin.classList.toggle('bg-primary', !isRegister);
    tabLogin.classList.toggle('text-on-primary-container', !isRegister);
    tabLogin.classList.toggle('text-primary', isRegister);
    tabRegister.classList.toggle('bg-primary', isRegister);
    tabRegister.classList.toggle('text-on-primary-container', isRegister);
    tabRegister.classList.toggle('text-primary', !isRegister);

    passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
    submitBtn.textContent = isRegister ? '회원가입' : '로그인';

    errorEl.classList.add('hidden');
    infoEl.classList.add('hidden');
  }

  tabLogin.addEventListener('click', () => { mode = 'login'; applyMode(); });
  tabRegister.addEventListener('click', () => { mode = 'register'; applyMode(); });

  function setBusy(busy) {
    submitBtn.disabled = busy;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    infoEl.classList.add('hidden');
    setBusy(true);

    const email = emailInput.value;
    const password = passwordInput.value;
    const result = mode === 'register' ? await signUp(email, password) : await signIn(email, password);

    setBusy(false);

    if (!result.ok) {
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
      return;
    }

    form.reset();
    close();
    onAuthed?.();
  });

  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  function open() {
    mode = 'login';
    applyMode();
    form.reset();
    root.classList.remove('hidden');
    emailInput.focus();
  }

  function close() {
    root.classList.add('hidden');
  }

  return { root, open, close };
}
