// 상세 정보 모달 — PRD §6.2 / F-05. name/category/address/tel만 표시, 결측 필드는 행째 숨김.
// + 구글 리뷰 영역: 카드 클릭(=모달 open) 시 좌표가 있는 가게에 한해 자동으로 조회한다.

import { escapeHtml } from './domUtils.js';
import { getGoogleReview } from '../../googleReviews.js';

function reviewLoadingHtml() {
  return `<p class="font-code-md text-code-md text-outline">리뷰를 불러오는 중...</p>`;
}

function reviewUnavailableHtml() {
  return `<p class="font-code-md text-code-md text-outline">위치 정보가 없어 리뷰를 조회할 수 없어요.</p>`;
}

function reviewErrorHtml(message) {
  return `<p class="font-code-md text-code-md text-error">${escapeHtml(message || '리뷰를 불러오지 못했습니다.')}</p>`;
}

function reviewNotFoundHtml() {
  return `<p class="font-code-md text-code-md text-outline">이 가게를 구글에서 찾을 수 없어요.</p>`;
}

function reviewFoundHtml(data) {
  const reviewsHtml = data.reviews.length
    ? data.reviews.map((r) => `
        <div class="border border-outline-variant p-3">
          <div class="flex justify-between items-center gap-2 mb-1">
            <span class="font-code-md text-code-md text-on-surface truncate">${escapeHtml(r.author)}</span>
            <span class="text-secondary font-code-md text-code-md flex-shrink-0">⭐ ${r.rating ?? '-'}</span>
          </div>
          <p class="font-code-md text-code-md text-outline mb-1">${escapeHtml(r.relativeTime)}</p>
          <p class="font-body-md text-body-md text-on-surface">${escapeHtml(r.text || '(내용 없음)')}</p>
        </div>`).join('')
    : `<p class="font-code-md text-code-md text-outline">등록된 리뷰가 없어요.</p>`;

  const mapsLink = data.mapsUrl
    ? `<a href="${data.mapsUrl}" target="_blank" rel="noopener noreferrer"
        class="inline-block mt-3 px-4 py-2 border border-primary text-primary font-label-sm text-label-sm uppercase hover:bg-surface-container-high transition-colors">
        &gt; 구글맵에서 전체 리뷰 보기
      </a>`
    : '';

  return `
    <div class="flex items-center gap-2 mb-3">
      <span class="text-secondary font-code-md text-code-md font-bold">⭐ ${data.rating ?? '-'}</span>
      <span class="font-code-md text-code-md text-outline">(${data.reviewCount}개 리뷰)</span>
    </div>
    <div class="space-y-3 max-h-64 overflow-y-auto pr-1">${reviewsHtml}</div>
    ${mapsLink}`;
}

export function createDetailModal() {
  const root = document.createElement('div');
  root.id = 'detail-modal';
  root.className = 'hidden fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4';
  root.innerHTML = `
    <div class="w-full max-w-[440px] max-h-[85vh] overflow-y-auto bg-surface-container-lowest border-2 border-primary neon-border p-6 relative">
      <button id="detail-close" aria-label="Close" class="absolute top-3 right-3 text-outline hover:text-primary">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div id="detail-body"></div>
      <div class="border-t border-outline-variant pt-4 mt-4">
        <h3 class="font-label-sm text-label-sm text-primary uppercase mb-3">&gt; GOOGLE_REVIEWS</h3>
        <div id="detail-review-body"></div>
      </div>
    </div>`;

  const body = root.querySelector('#detail-body');
  const reviewBody = root.querySelector('#detail-review-body');
  const closeBtn = root.querySelector('#detail-close');

  // 모달을 빠르게 여러 번 열었을 때(다른 가게로 전환), 먼저 시작된 조회가 늦게 끝나
  // 나중 가게의 리뷰 영역을 덮어쓰지 않도록 토큰으로 최신 요청만 반영한다.
  let requestToken = 0;

  function close() {
    root.classList.add('hidden');
  }

  async function loadReview(restaurant, token) {
    if (restaurant.lat == null || restaurant.lng == null) {
      reviewBody.innerHTML = reviewUnavailableHtml();
      return;
    }

    reviewBody.innerHTML = reviewLoadingHtml();
    const data = await getGoogleReview(restaurant);
    if (token !== requestToken) return; // 그 사이 모달이 다른 가게로 재오픈됨

    if (data.error) {
      reviewBody.innerHTML = reviewErrorHtml(data.error);
    } else if (!data.found) {
      reviewBody.innerHTML = reviewNotFoundHtml();
    } else {
      reviewBody.innerHTML = reviewFoundHtml(data);
    }
  }

  function open(restaurant) {
    const rows = [
      { label: 'CATEGORY', value: restaurant.category },
      { label: 'ADDR', value: restaurant.roadAddress || restaurant.jibunAddress },
      { label: 'TEL', value: restaurant.tel },
      { label: 'DISTANCE', value: restaurant.distance ? `${restaurant.distance}m` : '' },
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

    requestToken += 1;
    loadReview(restaurant, requestToken);
  }

  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  return { root, open, close };
}
