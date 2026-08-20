// 하단 4탭 네비게이션 (MENU/ORDERS/CART/BIO) — MENU만 실기능, 나머지는 플레이스홀더.

const DEFAULT_TABS = [
  { target: 'menu', icon: 'restaurant', label: 'MENU', hoverClasses: '' },
  { target: 'orders', icon: 'receipt_long', label: 'ORDERS', hoverClasses: 'text-outline hover:text-primary-fixed hover:bg-surface-container' },
  { target: 'cart', icon: 'shopping_cart', label: 'CART', hoverClasses: 'text-outline hover:text-primary-fixed hover:bg-surface-container' },
  { target: 'bio', icon: 'fingerprint', label: 'BIO', hoverClasses: 'text-outline hover:text-primary-fixed hover:bg-surface-container' },
];

// onSelect(target)는 탭 버튼 클릭 시 호출된다. 탭 콘텐츠(패널) 전환은 호출부 책임.
export function createBottomNav({ tabs = DEFAULT_TABS, onSelect } = {}) {
  const nav = document.createElement('nav');
  nav.className = 'fixed bottom-0 left-0 w-full z-40 bg-surface-container-lowest border-t border-outline-variant';
  nav.innerHTML = `<div class="max-w-container-max mx-auto flex justify-around items-center h-20 px-2">
    ${tabs.map((tab) => `
      <button data-tab-target="${tab.target}" class="flex flex-col items-center justify-center p-2 flex-1 ${tab.hoverClasses || ''} transition-all duration-200">
        <span class="material-symbols-outlined" data-icon="${tab.icon}">${tab.icon}</span>
        <span class="font-label-sm text-label-sm mt-1 uppercase">// ${tab.label}</span>
      </button>`).join('')}
  </div>`;

  const buttons = nav.querySelectorAll('[data-tab-target]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.tabTarget));
  });

  function setActive(target) {
    buttons.forEach((btn) => {
      const active = btn.dataset.tabTarget === target;
      btn.classList.toggle('text-primary', active);
      btn.classList.toggle('bg-surface-container-highest', active);
      btn.classList.toggle('border-t-2', active);
      btn.classList.toggle('border-primary', active);
      btn.classList.toggle('shadow-[0_0_12px_rgba(0,240,255,0.5)]', active);
      btn.classList.toggle('text-outline', !active);
    });
  }

  return { root: nav, setActive };
}
