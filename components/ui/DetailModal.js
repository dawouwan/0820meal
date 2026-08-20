// 상세 정보 모달 — PRD §6.2 / F-05. name/category/address/tel만 표시, 결측 필드는 행째 숨김.

import { escapeHtml } from './domUtils.js';

export function createDetailModal() {
  const root = document.createElement('div');
  root.id = 'detail-modal';
  root.className = 'hidden fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4';
  root.innerHTML = `
    <div class="w-full max-w-[440px] bg-surface-container-lowest border-2 border-primary neon-border p-6 relative">
      <button id="detail-close" aria-label="Close" class="absolute top-3 right-3 text-outline hover:text-primary">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div id="detail-body"></div>
    </div>`;

  const body = root.querySelector('#detail-body');
  const closeBtn = root.querySelector('#detail-close');

  function close() {
    root.classList.add('hidden');
  }

  function open(restaurant) {
    const rows = [
      { label: 'CATEGORY', value: restaurant.category },
      { label: 'ADDR', value: restaurant.roadAddress || restaurant.jibunAddress },
      { label: 'TEL', value: restaurant.tel },
    ].filter((row) => row.value);

    body.innerHTML = `
      <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-4">&gt; ${escapeHtml(restaurant.name)}</h2>
      <div class="border-t border-outline-variant pt-4 space-y-3">
        ${rows.map((row) => `
          <div class="flex gap-3">
            <span class="font-label-sm text-label-sm text-primary w-20 flex-shrink-0">${row.label}</span>
            <span class="font-body-md text-body-md text-on-surface">${escapeHtml(row.value)}</span>
          </div>`).join('')}
      </div>`;
    root.classList.remove('hidden');
  }

  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  return { root, open, close };
}
