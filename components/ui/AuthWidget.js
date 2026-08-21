// 헤더 우측 로그인 상태 위젯 — "로그인" 버튼 ↔ "{이름}님 로그아웃" 전환.
// render(user)를 auth.js의 onAuthStateChange 콜백에 연결해 두면, 최초 로드(새로고침 후
// 세션 복원 포함)/로그인/로그아웃 시 자동으로 화면이 갱신된다.

import { escapeHtml } from './domUtils.js';
import { getDisplayName, signOut } from '../../auth.js';

export function createAuthWidget({ onLoginClick } = {}) {
  const root = document.createElement('div');
  root.className = 'flex items-center gap-3';

  function render(user) {
    if (!user) {
      root.innerHTML = `
        <button id="login-open-btn" type="button"
          class="px-3 py-1.5 border border-primary text-primary font-label-sm text-label-sm uppercase tracking-widest hover:bg-surface-container-high transition-colors">
          로그인
        </button>`;
      root.querySelector('#login-open-btn').addEventListener('click', () => onLoginClick?.());
      return;
    }

    const name = escapeHtml(getDisplayName(user));
    root.innerHTML = `
      <span class="font-code-md text-code-md text-on-surface whitespace-nowrap">${name}님</span>
      <button id="auth-logout-btn" type="button"
        class="px-3 py-1.5 border border-outline-variant text-outline font-label-sm text-label-sm uppercase tracking-widest hover:text-primary hover:border-primary transition-colors">
        로그아웃
      </button>`;
    root.querySelector('#auth-logout-btn').addEventListener('click', () => signOut());
  }

  render(null);

  return { root, render };
}
