// 결과 카드 — PRD F-04 / §6.1. status/rating/review/username/T-MINUS는 API가 주지 않는
// 장식용 필드라 id 기반 시드 난수로 고정 생성한다(실데이터 아님).

import { escapeHtml } from './domUtils.js';

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededPick(id, salt, arr) {
  const rng = mulberry32(hashSeed(id + salt));
  return arr[Math.floor(rng() * arr.length)];
}

function seededRange(id, salt, min, max) {
  const rng = mulberry32(hashSeed(id + salt));
  return min + rng() * (max - min);
}

const STATUS_POOL = ['OPEN', 'RESERVED'];
const REVIEW_POOL = [
  '분위기도 좋고 음식도 정말 맛있어요! 재방문 의사 100%입니다.',
  '가성비 최고. 특히 메인 메뉴가 인상적이었어요.',
  '기념일에 방문했는데 서비스도 친절하고 만족스러웠습니다.',
  '줄 서서 먹을 만한 맛집. 다음에 또 올게요.',
  '조용하고 아늑한 분위기라 데이트 코스로 추천합니다.',
  '가족 모임으로 다녀왔는데 다들 만족했어요.',
  '메뉴 구성이 알차고 사장님이 친절하세요.',
  '동네에서 소문난 맛집, 기대 이상이었습니다.',
];
const USERNAME_POOL = [
  'USR_GOURMET_J', 'USR_FOODLOVER', 'USR_NIGHTOWL', 'USR_LOCALGUIDE',
  'USR_HUNGRYDEV', 'USR_CYBERCHEF', 'USR_NEONBITE', 'USR_TERMINAL_99',
];

function getMockCardFlourish(restaurantId) {
  return {
    status: seededPick(restaurantId, 'status', STATUS_POOL),
    rating: seededRange(restaurantId, 'rating', 3.6, 4.9).toFixed(1),
    review: seededPick(restaurantId, 'review', REVIEW_POOL),
    username: seededPick(restaurantId, 'username', USERNAME_POOL),
    tMinus: Math.round(seededRange(restaurantId, 'tminus', 4, 240)),
  };
}

// 담기 버튼 — showBookmark가 true일 때만 렌더링(옵션 미사용 호출부는 기존과 동일하게 버튼 없음).
function bookmarkButtonHtml(r, bookmarked) {
  const activeClasses = bookmarked
    ? 'border-secondary text-secondary shadow-[0_0_8px_rgba(255,46,196,0.3)]'
    : 'border-primary text-primary hover:bg-surface-container-high';
  const icon = bookmarked ? 'bookmark' : 'bookmark_border';
  const label = bookmarked ? '담김' : '담기';
  return `<button type="button" data-bookmark-id="${r.id}" aria-pressed="${bookmarked}"
      class="flex items-center gap-1 px-3 py-2 border-2 ${activeClasses} font-label-sm text-label-sm uppercase active:scale-95 transition-all">
    <span class="material-symbols-outlined text-sm">${icon}</span>&gt; ${label}
  </button>`;
}

function cardHtml(r, opts = {}) {
  const flourish = getMockCardFlourish(r.id);
  const { showBookmark = false, bookmarked = false } = opts;
  return `<article class="bg-surface-container-lowest border border-outline-variant overflow-hidden active:scale-[0.98] transition-transform duration-200 hover:border-primary hover:shadow-[0_0_12px_rgba(0,240,255,0.2)] cursor-pointer" data-detail-id="${r.id}">
    <div class="relative h-32 w-full hud-placeholder overflow-hidden border-b border-outline-variant flex items-center justify-center">
      <span class="material-symbols-outlined text-outline-variant text-[40px]">restaurant</span>
      <div class="absolute top-2 left-2 bg-surface-container-lowest/80 border border-primary px-2 py-1">
        <span class="font-code-md text-code-md text-primary text-xs">&gt; STATUS: ${flourish.status}</span>
      </div>
    </div>
    <div class="p-4">
      <div class="flex justify-between items-start mb-2 gap-2">
        <div class="min-w-0">
          <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface truncate">&gt; ${escapeHtml(r.name)}</h2>
          <span class="font-code-md text-code-md text-outline block mt-1">// TYPE: ${escapeHtml(r.category)}</span>
        </div>
        <div class="flex-shrink-0 flex items-center text-secondary font-code-md text-code-md font-bold border border-secondary px-2 py-1">
          RATING: ${flourish.rating}
        </div>
      </div>
      <p class="font-body-md text-body-md text-on-surface mb-3 line-clamp-2 mt-3 border-l-2 border-primary pl-3">${escapeHtml(flourish.review)}</p>
      <p class="font-code-md text-code-md text-outline truncate">// ${escapeHtml(r.roadAddress || r.jibunAddress || '주소 정보 없음')}</p>
      <div class="flex items-center justify-between border-t border-outline-variant pt-3 mt-3">
        <div class="flex items-center space-x-2">
          <span class="material-symbols-outlined text-primary text-sm">terminal</span>
          <span class="font-code-md text-code-md text-primary">${flourish.username}</span>
        </div>
        <span class="font-code-md text-code-md text-outline">T-MINUS ${flourish.tMinus}H</span>
      </div>
      ${showBookmark ? `<div class="flex justify-end mt-3">${bookmarkButtonHtml(r, bookmarked)}</div>` : ''}
    </div>
  </article>`;
}

// restaurants: 정규화된 음식점 배열. onSelect(restaurant)는 카드 클릭 시 호출.
// onBookmarkToggle(restaurant) / isBookmarked(id)는 옵션 — 둘 다 없으면 기존 동작과 100% 동일(담기 버튼 미표시).
export function renderRestaurantCards(container, { restaurants, onSelect, onBookmarkToggle, isBookmarked }) {
  const showBookmark = typeof onBookmarkToggle === 'function';
  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${restaurants
    .map((r) => cardHtml(r, { showBookmark, bookmarked: showBookmark && typeof isBookmarked === 'function' ? isBookmarked(r.id) : false }))
    .join('')}</div>`;

  container.querySelectorAll('[data-detail-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const restaurant = restaurants.find((r) => r.id === card.dataset.detailId);
      if (restaurant && typeof onSelect === 'function') onSelect(restaurant);
    });
  });

  if (showBookmark) {
    container.querySelectorAll('[data-bookmark-id]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const restaurant = restaurants.find((r) => r.id === btn.dataset.bookmarkId);
        if (restaurant) onBookmarkToggle(restaurant);
      });
    });
  }
}
