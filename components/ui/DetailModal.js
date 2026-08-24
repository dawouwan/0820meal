// 상세 정보 모달 — PRD §6.2 / F-05. name/category/address/tel만 표시, 결측 필드는 행째 숨김.
// + 구글 리뷰 영역: 카드 클릭(=모달 open) 시 좌표가 있는 가게에 한해 자동으로 조회한다.
// + AI 분석 영역: 리뷰가 1개 이상 로드되면 이어서 자동으로 제미나이 분석을 시작한다.

import { escapeHtml } from './domUtils.js';
import { getGoogleReview } from '../../googleReviews.js';
import { getReviewAnalysis } from '../../geminiAnalysis.js';

const SENTIMENT_COLOR = {
  positive: '#4ade80',
  negative: '#f87171',
};

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

// ---------- AI 분석 영역 ----------

function analysisLoadingHtml() {
  return `<p class="font-code-md text-code-md text-outline">AI가 리뷰를 분석하는 중...</p>`;
}

function analysisErrorHtml(message) {
  return `<p class="font-code-md text-code-md text-error">${escapeHtml(message || 'AI 분석에 실패했습니다.')}</p>`;
}

function sentimentBarHtml(counts) {
  const positive = counts.positive || 0;
  const neutral = counts.neutral || 0;
  const negative = counts.negative || 0;
  const total = positive + neutral + negative || 1;
  const pct = (n) => `${(n / total) * 100}%`;

  return `
    <div class="mb-4">
      <div class="flex h-3 w-full overflow-hidden border border-outline-variant">
        <div style="width:${pct(positive)}" class="bg-green-500"></div>
        <div style="width:${pct(neutral)}" class="bg-yellow-400"></div>
        <div style="width:${pct(negative)}" class="bg-red-500"></div>
      </div>
      <div class="flex justify-between mt-2 font-code-md text-code-md">
        <span class="text-green-400">긍정 ${positive}</span>
        <span class="text-yellow-300">보통 ${neutral}</span>
        <span class="text-red-400">부정 ${negative}</span>
      </div>
    </div>`;
}

function summaryBubbleHtml(summary) {
  return `
    <div class="relative bg-surface-container-low border border-secondary p-4 mb-5">
      <div class="flex items-center gap-2 mb-2">
        <span class="material-symbols-outlined text-secondary text-sm">chat_bubble</span>
        <span class="font-label-sm text-label-sm text-secondary uppercase">AI 총평</span>
      </div>
      <p class="font-body-md text-body-md text-on-surface">${escapeHtml(summary)}</p>
      <div class="absolute -bottom-2 left-6 w-4 h-4 bg-surface-container-low border-b border-r border-secondary rotate-45"></div>
    </div>`;
}

function wordCloudSectionHtml() {
  return `
    <div>
      <p class="font-label-sm text-label-sm text-primary uppercase mb-2">&gt; KEYWORDS</p>
      <canvas id="detail-wordcloud-canvas" height="220" class="w-full border border-outline-variant"></canvas>
    </div>`;
}

let wordCloudLoadPromise = null;

function loadWordCloudLib() {
  if (window.WordCloud) return Promise.resolve(window.WordCloud);
  if (wordCloudLoadPromise) return wordCloudLoadPromise;

  wordCloudLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/wordcloud@1.2.2/src/wordcloud2.js';
    script.onload = () => (window.WordCloud ? resolve(window.WordCloud) : reject(new Error('워드클라우드 라이브러리 로드에 실패했습니다.')));
    script.onerror = () => reject(new Error('워드클라우드 스크립트를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  wordCloudLoadPromise.catch(() => {
    wordCloudLoadPromise = null;
  });

  return wordCloudLoadPromise;
}

async function renderWordCloud(canvas, keywords) {
  const WordCloud = await loadWordCloudLib();
  const width = Math.floor(canvas.parentElement.clientWidth) || 360;
  canvas.width = width;

  const sentimentByWord = new Map(keywords.map((k) => [k.word, k.sentiment]));

  WordCloud(canvas, {
    list: keywords.map((k) => [k.word, k.score]),
    weightFactor: (size) => 12 + size * 3.2,
    fontFamily: "'Space Grotesk', sans-serif",
    backgroundColor: '#111a37',
    color: (word) => SENTIMENT_COLOR[sentimentByWord.get(word)] || '#849495',
    rotateRatio: 0,
    gridSize: 6,
  });
}

function analysisFoundHtml(data) {
  const keywordsHtml = data.keywords?.length
    ? wordCloudSectionHtml()
    : '';

  return `
    ${sentimentBarHtml(data.sentimentCounts || {})}
    ${summaryBubbleHtml(data.summary || '')}
    ${keywordsHtml}`;
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
      <div id="detail-analysis-section" class="hidden border-t border-outline-variant pt-4 mt-4">
        <h3 class="font-label-sm text-label-sm text-primary uppercase mb-3">&gt; AI_ANALYSIS</h3>
        <div id="detail-analysis-body"></div>
      </div>
    </div>`;

  const body = root.querySelector('#detail-body');
  const reviewBody = root.querySelector('#detail-review-body');
  const analysisSection = root.querySelector('#detail-analysis-section');
  const analysisBody = root.querySelector('#detail-analysis-body');
  const closeBtn = root.querySelector('#detail-close');

  // 모달을 빠르게 여러 번 열었을 때(다른 가게로 전환), 먼저 시작된 조회가 늦게 끝나
  // 나중 가게의 리뷰/분석 영역을 덮어쓰지 않도록 토큰으로 최신 요청만 반영한다.
  let requestToken = 0;

  function close() {
    root.classList.add('hidden');
  }

  async function loadAnalysis(restaurant, reviews, token) {
    // 리뷰가 하나도 없으면 분석을 시도하지 않고 영역 자체를 숨긴다.
    if (!reviews.length) {
      analysisSection.classList.add('hidden');
      analysisBody.innerHTML = '';
      return;
    }

    analysisSection.classList.remove('hidden');
    analysisBody.innerHTML = analysisLoadingHtml();

    const data = await getReviewAnalysis(restaurant, reviews);
    if (token !== requestToken) return;

    if (data.error) {
      analysisBody.innerHTML = analysisErrorHtml(data.error);
      return;
    }

    analysisBody.innerHTML = analysisFoundHtml(data);
    if (data.keywords?.length) {
      const canvas = analysisBody.querySelector('#detail-wordcloud-canvas');
      if (canvas) renderWordCloud(canvas, data.keywords);
    }
  }

  async function loadReview(restaurant, token) {
    analysisSection.classList.add('hidden');
    analysisBody.innerHTML = '';

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
      loadAnalysis(restaurant, data.reviews, token);
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
