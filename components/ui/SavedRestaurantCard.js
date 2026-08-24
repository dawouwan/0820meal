// 맛집주머니(Mypage.html) 카드 — RestaurantCard.js와 톤은 맞추되, 장식용 mock 필드
// (rating/review/username/T-MINUS) 없이 saved_restaurants 테이블의 실데이터만 사용한다.

import { escapeHtml } from './domUtils.js';

function formatDate(isoString) {
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function googleMapsUrl(row) {
  const query = row.lat != null && row.lng != null
    ? `${row.lat},${row.lng}`
    : encodeURIComponent(row.address || row.restaurant_name || '');
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function cardHtml(row) {
  return `<article class="bg-surface-container-lowest border border-outline-variant p-4 relative hover:border-primary hover:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-colors">
    <button type="button" data-delete-id="${row.id}" aria-label="삭제"
      class="absolute top-3 right-3 text-outline hover:text-error transition-colors">
      <span class="material-symbols-outlined text-lg">close</span>
    </button>
    <div class="pr-8">
      <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface truncate">&gt; ${escapeHtml(row.restaurant_name)}</h2>
      <span class="font-code-md text-code-md text-outline block mt-1">// TYPE: ${escapeHtml(row.category || '미분류')}</span>
    </div>
    <p class="font-code-md text-code-md text-outline truncate mt-3 border-t border-outline-variant pt-3">// ${escapeHtml(row.address || '주소 정보 없음')}</p>
    <div class="flex items-center justify-between mt-3">
      <span class="font-code-md text-code-md text-outline">담은 날짜: ${formatDate(row.created_at)}</span>
      <a href="${googleMapsUrl(row)}" target="_blank" rel="noopener noreferrer"
        class="flex items-center gap-1 px-3 py-1.5 border border-primary text-primary font-label-sm text-label-sm uppercase hover:bg-surface-container-high transition-colors">
        <span class="material-symbols-outlined text-sm">map</span>구글맵 보기
      </a>
    </div>
  </article>`;
}

// items: saved_restaurants 행 배열. onDelete(id)는 삭제(X) 버튼 클릭 시 호출.
export function renderSavedRestaurantCards(container, { items, onDelete }) {
  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${items.map(cardHtml).join('')}</div>`;

  container.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      onDelete(btn.dataset.deleteId);
    });
  });
}
