import { requireSession, logout } from './auth.js';
import { getRestaurants, ConfigMissingError } from './api.js';
import { MOCK_RESTAURANTS } from './mockData.js';
import { DISPLAY_CATEGORIES } from './categoryMap.js';
import { DATA_AS_OF } from './config.js';
import { getBookmarks, toggleBookmark, isBookmarked as isBookmarkedId } from './bookmarks.js';

import { createRegionSelect } from './components/ui/RegionSelect.js';
import { renderCategoryChips, clearCategoryChips } from './components/ui/CategoryChip.js';
import { renderRestaurantCards } from './components/ui/RestaurantCard.js';
import { createDetailModal } from './components/ui/DetailModal.js';
import { createBottomNav } from './components/ui/BottomNav.js';
import { renderLoadingState, renderMessageState, renderErrorState } from './components/ui/StatusView.js';

requireSession();

const PAGE_SIZE = 20;

// 지역 필터는 서울로 고정 (시도 선택 UI 없음). regions.json 기준 sidoCode.
const SEOUL_SIDO_CODE = '11';

const state = {
  regions: [],
  sidoCode: SEOUL_SIDO_CODE,
  sigunguCode: '',
  category: '', // '' = 전체
  page: 1,
  allResults: [], // 현재 선택된 시군구의 정규화된 전체 목록
  usingMock: false,
  loading: false,
  // CART 탭 — 키워드/카테고리 검색 (F-신규). 별도 API 호출 없이 state.allResults + MOCK_RESTAURANTS만 사용.
  cartKeyword: '',
  cartCategory: '',
};

// ---------- DOM 참조 ----------

const el = {
  regionSelectRoot: document.getElementById('region-select-root'),
  categoryChips: document.getElementById('category-chips'),
  resultsInfo: document.getElementById('results-info'),
  resultsArea: document.getElementById('results-area'),
  loadMoreBtn: document.getElementById('load-more-btn'),
  bottomNavRoot: document.getElementById('bottom-nav-root'),
  detailModalRoot: document.getElementById('detail-modal-root'),
  logoutBtn: document.getElementById('logout-btn'),
  dataAsOf: document.getElementById('data-as-of'),
  tabPanels: document.querySelectorAll('[data-tab-panel]'),
  // CART 탭
  cartSearchInput: document.getElementById('cart-search-input'),
  cartCategoryChips: document.getElementById('cart-category-chips'),
  cartResultsInfo: document.getElementById('cart-results-info'),
  cartResultsArea: document.getElementById('cart-results-area'),
  bookmarksInfo: document.getElementById('bookmarks-info'),
  bookmarksArea: document.getElementById('bookmarks-area'),
};

// components/ui 인스턴스 — init()에서 마운트
let regionSelect;
let detailModal;
let bottomNav;

// ---------- URL 상태 동기화 (F-07) ----------

function parseUrlState() {
  const params = new URLSearchParams(window.location.search);
  // sidoCode는 항상 서울로 고정이라 URL에 담지 않는다.
  state.sigunguCode = params.get('sigungu') || '';
  state.category = params.get('cat') || '';
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.sigunguCode) params.set('sigungu', state.sigunguCode);
  if (state.category) params.set('cat', state.category);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

// ---------- 지역 셀렉트 이벤트 ----------

function onSigunguChange(sigunguCode) {
  state.sigunguCode = sigunguCode;
  state.category = '';
  syncUrl();
  if (state.sigunguCode) {
    loadResults();
  } else {
    state.allResults = [];
    renderResultsArea();
  }
}

// ---------- 데이터 로드 ----------

async function loadResults() {
  const sido = regionSelect.sido;
  const sigunguName = regionSelect.findSigunguName(state.sigunguCode);
  if (!sido || !sigunguName) return;

  state.loading = true;
  state.usingMock = false;
  renderResultsArea();

  try {
    const { data } = await getRestaurants(state.sidoCode, state.sigunguCode, sido.sidoName, sigunguName);
    state.allResults = data;
    state.loading = false;
    state.page = 1;
    renderAll();
  } catch (err) {
    state.loading = false;
    state.allResults = [];
    const isConfigMissing = err instanceof ConfigMissingError;
    renderErrorStateView(isConfigMissing);
  }
}

function loadMockResults() {
  state.allResults = MOCK_RESTAURANTS.filter(
    (r) => r.sidoCode === state.sidoCode && r.sigunguCode === state.sigunguCode
  );
  state.usingMock = true;
  state.loading = false;
  state.page = 1;
  renderAll();
}

// ---------- 렌더링 ----------

function computeCategoryCounts(results) {
  const counts = {};
  for (const r of results) counts[r.category] = (counts[r.category] || 0) + 1;
  return counts;
}

function renderCategoryChipsView() {
  const counts = computeCategoryCounts(state.allResults);
  const total = state.allResults.length;

  const chips = [{ label: '전체', value: '', count: total }];
  for (const cat of DISPLAY_CATEGORIES) {
    if (!counts[cat]) continue; // 0건 카테고리는 숨김 (F-03)
    chips.push({ label: cat, value: cat, count: counts[cat] });
  }

  renderCategoryChips(el.categoryChips, {
    chips,
    activeValue: state.category,
    onSelect: (value) => {
      state.category = value;
      state.page = 1;
      syncUrl();
      renderListView();
      renderCategoryChipsView();
    },
  });
}

function renderResultsArea() {
  if (state.loading) {
    el.resultsInfo.textContent = '> LOADING...';
    renderLoadingState(el.resultsArea);
    el.loadMoreBtn.classList.add('hidden');
    clearCategoryChips(el.categoryChips);
    return;
  }

  if (!state.sigunguCode) {
    el.resultsInfo.textContent = '> 시군구를 선택해 주세요';
    renderMessageState(el.resultsArea, '시군구를 선택하면 결과가 표시됩니다.');
    el.loadMoreBtn.classList.add('hidden');
    clearCategoryChips(el.categoryChips);
  }
}

function renderErrorStateView(isConfigMissing) {
  clearCategoryChips(el.categoryChips);
  el.loadMoreBtn.classList.add('hidden');
  el.resultsInfo.textContent = '> ERROR';
  renderErrorState(el.resultsArea, {
    isConfigMissing,
    onRetry: loadResults,
    onUseMock: loadMockResults,
  });
}

function renderListView() {
  const filtered = state.category
    ? state.allResults.filter((r) => r.category === state.category)
    : state.allResults;

  const sido = regionSelect.sido;
  const sigunguName = regionSelect.findSigunguName(state.sigunguCode);
  const catLabel = state.category || '전체';
  const mockNote = state.usingMock ? ' (예시 데이터)' : '';
  el.resultsInfo.textContent = `// ${sido?.sidoName || ''} ${sigunguName} · ${catLabel} · ${filtered.length} RESULTS${mockNote}`;

  if (!filtered.length) {
    renderMessageState(el.resultsArea, '이 조건에 등록된 음식점이 없어요.');
    el.loadMoreBtn.classList.add('hidden');
    return;
  }

  const visible = filtered.slice(0, state.page * PAGE_SIZE);
  renderRestaurantCards(el.resultsArea, { restaurants: visible, onSelect: detailModal.open });

  if (visible.length < filtered.length) {
    el.loadMoreBtn.classList.remove('hidden');
  } else {
    el.loadMoreBtn.classList.add('hidden');
  }
}

function renderAll() {
  renderCategoryChipsView();
  renderListView();
}

// ---------- CART 탭: 키워드/카테고리 검색 + 담기 (F-신규) ----------
// 데이터 소스: 별도 API 호출 없이 (1) MENU 탭에서 이미 로드된 state.allResults(현재 선택 구)와
// (2) mockData.js의 MOCK_RESTAURANTS(다른 지역 포함 예시 데이터)를 합쳐 클라이언트에서만 필터링한다.
// KCISA 오픈API 일일 호출 한도(1,000건) 절약을 위해 25개 구를 순회 호출하는 방식은 쓰지 않는다.

function getCartSearchPool() {
  const pool = [];
  const seen = new Set();
  for (const r of [...state.allResults, ...MOCK_RESTAURANTS]) {
    if (!r || !r.id || seen.has(r.id)) continue;
    seen.add(r.id);
    pool.push(r);
  }
  return pool;
}

function renderCartCategoryChips() {
  const pool = getCartSearchPool();
  const counts = computeCategoryCounts(pool);
  const total = pool.length;

  const chips = [{ label: '전체', value: '', count: total }];
  for (const cat of DISPLAY_CATEGORIES) {
    if (!counts[cat]) continue;
    chips.push({ label: cat, value: cat, count: counts[cat] });
  }

  renderCategoryChips(el.cartCategoryChips, {
    chips,
    activeValue: state.cartCategory,
    onSelect: (value) => {
      state.cartCategory = value;
      renderCartResults();
      renderCartCategoryChips();
    },
  });
}

function filterCartPool() {
  const pool = getCartSearchPool();
  const keyword = state.cartKeyword.trim().toLowerCase();

  return pool.filter((r) => {
    if (state.cartCategory && r.category !== state.cartCategory) return false;
    if (!keyword) return true;
    const name = (r.name || '').toLowerCase();
    const addr = (r.roadAddress || r.jibunAddress || '').toLowerCase();
    return name.includes(keyword) || addr.includes(keyword);
  });
}

function renderCartResults() {
  const filtered = filterCartPool();
  const catLabel = state.cartCategory || '전체';
  const keywordLabel = state.cartKeyword.trim() ? ` · "${state.cartKeyword.trim()}"` : '';
  el.cartResultsInfo.textContent = `// ${catLabel}${keywordLabel} · ${filtered.length} RESULTS`;

  if (!filtered.length) {
    renderMessageState(el.cartResultsArea, '조건에 맞는 음식점이 없어요.');
    return;
  }

  renderRestaurantCards(el.cartResultsArea, {
    restaurants: filtered,
    onSelect: detailModal.open,
    onBookmarkToggle: handleBookmarkToggle,
    isBookmarked: isBookmarkedId,
  });
}

function renderBookmarksView() {
  const bookmarks = getBookmarks();
  el.bookmarksInfo.textContent = `// ${bookmarks.length} SAVED`;

  if (!bookmarks.length) {
    renderMessageState(el.bookmarksArea, '아직 담은 맛집이 없어요. 위에서 검색 후 담기를 눌러보세요.');
    return;
  }

  renderRestaurantCards(el.bookmarksArea, {
    restaurants: bookmarks,
    onSelect: detailModal.open,
    onBookmarkToggle: handleBookmarkToggle,
    isBookmarked: isBookmarkedId,
  });
}

function handleBookmarkToggle(restaurant) {
  toggleBookmark(restaurant);
  renderCartResults();
  renderBookmarksView();
}

function refreshCartTab() {
  renderCartCategoryChips();
  renderCartResults();
  renderBookmarksView();
}

// ---------- 탭 전환 (MENU/ORDERS/CART/BIO) ----------

function switchTab(target) {
  bottomNav.setActive(target);
  el.tabPanels.forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.tabPanel !== target);
  });
  if (target === 'cart') {
    refreshCartTab();
  }
}

// ---------- 이벤트 바인딩 ----------

function bindEvents() {
  el.loadMoreBtn.addEventListener('click', () => {
    state.page += 1;
    renderListView();
  });

  el.logoutBtn.addEventListener('click', logout);

  el.cartSearchInput.addEventListener('input', (event) => {
    state.cartKeyword = event.target.value;
    renderCartResults();
  });
}

// ---------- 초기화 ----------

async function init() {
  el.dataAsOf.textContent = DATA_AS_OF ? `정보 기준일: ${DATA_AS_OF}` : '정보 기준일: 미확인';

  const res = await fetch('./regions.json');
  state.regions = await res.json();

  parseUrlState();

  regionSelect = createRegionSelect({
    regions: state.regions,
    onSigunguChange,
  });
  el.regionSelectRoot.appendChild(regionSelect.root);
  regionSelect.setValues(state.sigunguCode);

  detailModal = createDetailModal();
  el.detailModalRoot.appendChild(detailModal.root);

  bottomNav = createBottomNav({ onSelect: switchTab });
  el.bottomNavRoot.appendChild(bottomNav.root);

  bindEvents();
  switchTab('menu');

  if (state.sigunguCode) {
    await loadResults();
    if (state.category) renderCategoryChipsView();
  } else {
    renderResultsArea();
  }
}

init();
