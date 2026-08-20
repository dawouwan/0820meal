// 카테고리 칩 목록 (건수 배지 포함) — PRD F-03 / §6.1
// chips: [{ label, value, count }] — 0건 카테고리를 걸러내는 건 호출부(app.js) 책임.

export function renderCategoryChips(container, { chips, activeValue, onSelect }) {
  container.innerHTML = chips.map((chip) => {
    const active = activeValue === chip.value;
    const activeClasses = active
      ? 'border-secondary bg-surface-container-low text-secondary shadow-[0_0_8px_rgba(255,46,196,0.3)]'
      : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-primary hover:text-primary';
    return `<button type="button" data-cat="${chip.value}"
        class="flex-shrink-0 px-4 py-2 border-2 ${activeClasses} font-label-sm text-label-sm whitespace-nowrap active:scale-95 transition-all uppercase">
      // ${chip.label} ${chip.count}
    </button>`;
  }).join('');

  container.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.cat));
  });
}

export function clearCategoryChips(container) {
  container.innerHTML = '';
}
