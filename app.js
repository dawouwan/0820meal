import { onAuthStateChange } from './auth.js';
import { getNearbyRestaurants } from './nearbyApi.js';
import { getCurrentPosition, GeolocationError } from './locationApi.js';
import { MOCK_RESTAURANTS } from './mockData.js';
import { DISPLAY_CATEGORIES } from './categoryMap.js';
import { getBookmarks, toggleBookmark, isBookmarked as isBookmarkedId, loadBookmarks } from './bookmarks.js';

import { renderCategoryChips, clearCategoryChips } from './components/ui/CategoryChip.js';
import { renderRestaurantCards } from './components/ui/RestaurantCard.js';
import { createDetailModal } from './components/ui/DetailModal.js';
import { createBottomNav } from './components/ui/BottomNav.js';
import { createAuthModal } from './components/ui/AuthModal.js';
import { createAuthWidget } from './components/ui/AuthWidget.js';
import { renderLoadingState, renderMessageState, renderErrorState, renderLoginRequiredState } from './components/ui/StatusView.js';

const PAGE_SIZE = 20;

const state = {
  mode: 'nearby', // 'nearby' | 'saved' — MENU 탭 검색 모드, 기본은 위치 기반 "내 주변"
  nearbyCoords: null,
  category: '', // '' = 전체
  page: 1,
  allResults: [], // 내 주변 조회 결과(정규화된 전체 목록)
  usingMock: false,
  loading: false,
  // CART 탭 — 키워드/카테고리 검색 (F-신규). 별도 API 호출 없이 state.allResults + MOCK_RESTAURANTS만 사용.
  cartKeyword: '',
  cartCategory: '',
  // 맛집 담기는 로그인한 사용자만 가능 — auth.js의 onAuthStateChange가 갱신해 준다.
  currentUser: null,
};

// ---------- DOM 참조 ----------

const el = {
  modeNearbyBtn: document.getElementById('mode-nearby-btn'),
  modeSavedBtn: document.getElementById('mode-saved-btn'),
  nearbyStatusRoot: document.getElementById('nearby-status-root'),
  nearbyStatusText: document.getElementById('nearby-status-text'),
  nearbyRetryBtn: document.getElementById('nearby-retry-btn'),
  categoryChips: document.getElementById('category-chips'),
  resultsInfo: document.getElementById('results-info'),
  resultsArea: document.getElementById('results-area'),
  loadMoreBtn: document.getElementById('load-more-btn'),
  bottomNavRoot: document.getElementById('bottom-nav-root'),
  detailModalRoot: document.getElementById('detail-modal-root'),
  authWidgetRoot: document.getElementById('auth-widget-root'),
  myBookmarksLink: document.getElementById('my-bookmarks-link'),
  authModalRoot: document.getElementById('auth-modal-root'),
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
let detailModal;
let bottomNav;
let authModal;
let authWidget;

// ---------- URL 상태 동기화 (F-07) ----------

function parseUrlState() {
  const params = new URLSearchParams(window.location.search);
  state.category = params.get('cat') || '';
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.category) params.set('cat', state.category);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

// ---------- 검색 모드 토글 (내 주변 / 담은 맛집) ----------

function setMode(mode) {
  state.mode = mode;
  state.page = 1;

  el.modeNearbyBtn.classList.toggle('border-primary', mode === 'nearby');
  el.modeNearbyBtn.classList.toggle('text-primary', mode === 'nearby');
  el.modeNearbyBtn.classList.toggle('border-outline-variant', mode !== 'nearby');
  el.modeNearbyBtn.classList.toggle('text-outline', mode !== 'nearby');

  el.modeSavedBtn.classList.toggle('border-primary', mode === 'saved');
  el.modeSavedBtn.classList.toggle('text-primary', mode === 'saved');
  el.modeSavedBtn.classList.toggle('border-outline-variant', mode !== 'saved');
  el.modeSavedBtn.classList.toggle('text-outline', mode !== 'saved');

  el.nearbyStatusRoot.classList.toggle('hidden', mode !== 'nearby');

  if (mode === 'nearby') {
    loadNearbyResults();
  } else {
    renderSavedMenuView();
  }
}

// ---------- 내 주변(위치 기반) 데이터 로드 ----------

async function loadNearbyResults() {
  state.loading = true;
  state.usingMock = false;
  el.nearbyStatusText.textContent = '// 내 위치 확인 중...';
  renderResultsArea();

  try {
    const { lat, lng } = await getCurrentPosition();
    state.nearbyCoords = { lat, lng };
    el.nearbyStatusText.textContent = '// 내 주변 맛집 조회 중...';
    const data = await getNearbyRestaurants(lat, lng);
    state.allResults = data;
    state.loading = false;
    state.page = 1;
    el.nearbyStatusText.textContent = `// 내 위치 반경 1.5km · ${data.length}건 조회됨`;
    renderAll();
  } catch (err) {
    state.loading = false;
    state.allResults = [];
    el.nearbyStatusText.textContent = '// 조회 실패';
    renderNearbyErrorStateView(err);
  }
}

function nearbyErrorHint(err) {
  if (err instanceof GeolocationError) {
    if (err.code === 'denied') return '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.';
    if (err.code === 'unsupported') return '이 브라우저는 위치 정보를 지원하지 않습니다.';
    return '위치 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '내 주변 정보를 불러오지 못했어요. 네트워크 상태를 확인해 주세요.';
}

function renderNearbyErrorStateView(err) {
  clearCategoryChips(el.categoryChips);
  el.loadMoreBtn.classList.add('hidden');
  el.resultsInfo.textContent = '> ERROR';
  renderErrorState(el.resultsArea, {
    hint: nearbyErrorHint(err),
    onRetry: loadNearbyResults,
    onUseMock: loadMockResults,
  });
}

// ---------- 데이터 로드 ----------

function loadMockResults() {
  state.allResults = MOCK_RESTAURANTS;
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
  }
}

function renderListView() {
  const filtered = state.category
    ? state.allResults.filter((r) => r.category === state.category)
    : state.allResults;

  const catLabel = state.category || '전체';
  const mockNote = state.usingMock ? ' (예시 데이터)' : '';
  el.resultsInfo.textContent = `// 내 주변 · ${catLabel} · ${filtered.length} RESULTS${mockNote}`;

  if (!filtered.length) {
    renderMessageState(el.resultsArea, '이 조건에 등록된 음식점이 없어요.');
    el.loadMoreBtn.classList.add('hidden');
    return;
  }

  const visible = filtered.slice(0, state.page * PAGE_SIZE);
  renderRestaurantCards(el.resultsArea, {
    restaurants: visible,
    onSelect: detailModal.open,
    onBookmarkToggle: handleBookmarkToggle,
    isBookmarked: (id) => isBookmarkedId(state.currentUser?.id, id),
  });

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

// ---------- MENU 탭 내 "담은 맛집" 모아보기 (세 번째 검색 모드) ----------
// CART 탭까지 가지 않아도 MENU에서 바로 담고, 바로 모아볼 수 있게 하기 위한 전용 뷰.
// 카테고리 칩/결과 영역을 그대로 재사용하되 데이터 소스만 검색 결과 대신 북마크 목록을 쓴다.

function renderSavedMenuView() {
  state.loading = false;
  el.loadMoreBtn.classList.add('hidden');

  if (!state.currentUser) {
    clearCategoryChips(el.categoryChips);
    el.resultsInfo.textContent = '// LOGIN_REQUIRED';
    renderLoginRequiredState(el.resultsArea, {
      message: '로그인 후 담은 맛집 목록을 확인할 수 있어요.',
      onLogin: () => authModal.open(),
    });
    return;
  }

  const pool = getBookmarks(state.currentUser.id);
  const counts = computeCategoryCounts(pool);
  if (state.category && !counts[state.category]) state.category = '';

  const chips = [{ label: '전체', value: '', count: pool.length }];
  for (const cat of DISPLAY_CATEGORIES) {
    if (!counts[cat]) continue;
    chips.push({ label: cat, value: cat, count: counts[cat] });
  }
  renderCategoryChips(el.categoryChips, {
    chips,
    activeValue: state.category,
    onSelect: (value) => {
      state.category = value;
      renderSavedMenuView();
    },
  });

  const filtered = state.category ? pool.filter((r) => r.category === state.category) : pool;
  const catLabel = state.category || '전체';
  el.resultsInfo.textContent = `// 담은 맛집 · ${catLabel} · ${filtered.length} SAVED`;

  if (!filtered.length) {
    renderMessageState(el.resultsArea, '아직 담은 맛집이 없어요. 카드의 담기 버튼을 눌러보세요.');
    return;
  }

  renderRestaurantCards(el.resultsArea, {
    restaurants: filtered,
    onSelect: detailModal.open,
    onBookmarkToggle: handleBookmarkToggle,
    isBookmarked: (id) => isBookmarkedId(state.currentUser?.id, id),
  });
}

// ---------- CART 탭: 키워드/카테고리 검색 + 담기 (F-신규) ----------
// 데이터 소스: 별도 API 호출 없이 (1) MENU 탭에서 이미 로드된 state.allResults(내 주변 조회 결과)와
// (2) mockData.js의 MOCK_RESTAURANTS(다른 지역 포함 예시 데이터)를 합쳐 클라이언트에서만 필터링한다.

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
    isBookmarked: (id) => isBookmarkedId(state.currentUser?.id, id),
  });
}

function renderBookmarksView() {
  if (!state.currentUser) {
    el.bookmarksInfo.textContent = '// LOGIN_REQUIRED';
    renderLoginRequiredState(el.bookmarksArea, {
      message: '로그인 후 담은 맛집 목록을 확인할 수 있어요.',
      onLogin: () => authModal.open(),
    });
    return;
  }

  const bookmarks = getBookmarks(state.currentUser.id);
  el.bookmarksInfo.textContent = `// ${bookmarks.length} SAVED`;

  if (!bookmarks.length) {
    renderMessageState(el.bookmarksArea, '아직 담은 맛집이 없어요. 위에서 검색 후 담기를 눌러보세요.');
    return;
  }

  renderRestaurantCards(el.bookmarksArea, {
    restaurants: bookmarks,
    onSelect: detailModal.open,
    onBookmarkToggle: handleBookmarkToggle,
    isBookmarked: (id) => isBookmarkedId(state.currentUser?.id, id),
  });
}

// 담기 버튼은 로그인 여부와 무관하게 항상 노출된다(둘러보기 중 자연스러운 로그인 유도).
// 클릭 시점에 로그인 상태가 아니면 토글하지 않고 로그인 모달을 띄운다.
async function handleBookmarkToggle(restaurant) {
  if (!state.currentUser) {
    authModal.open();
    return;
  }
  await toggleBookmark(state.currentUser.id, restaurant);
  renderCartResults();
  renderBookmarksView();
  if (state.mode === 'saved') {
    renderSavedMenuView();
  } else if (state.mode === 'nearby') {
    renderListView();
  }
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

  el.modeNearbyBtn.addEventListener('click', () => setMode('nearby'));
  el.modeSavedBtn.addEventListener('click', () => setMode('saved'));
  el.nearbyRetryBtn.addEventListener('click', loadNearbyResults);

  el.cartSearchInput.addEventListener('input', (event) => {
    state.cartKeyword = event.target.value;
    renderCartResults();
  });
}

// ---------- 초기화 ----------

async function init() {
  parseUrlState();

  detailModal = createDetailModal();
  el.detailModalRoot.appendChild(detailModal.root);

  bottomNav = createBottomNav({ onSelect: switchTab });
  el.bottomNavRoot.appendChild(bottomNav.root);

  authModal = createAuthModal({});
  el.authModalRoot.appendChild(authModal.root);

  authWidget = createAuthWidget({ onLoginClick: () => authModal.open() });
  el.authWidgetRoot.appendChild(authWidget.root);
  // 로그인/로그아웃/새로고침 후 세션 복원 시 자동으로 헤더 상태 + 맛집 담기 가능 여부를 갱신한다.
  onAuthStateChange(async (user) => {
    state.currentUser = user;
    authWidget.render(user);
    el.myBookmarksLink.classList.toggle('hidden', !user);
    await loadBookmarks(user?.id);
    if (!document.querySelector('[data-tab-panel="cart"]').classList.contains('hidden')) {
      refreshCartTab();
    }
    if (state.mode === 'saved') {
      renderSavedMenuView();
    }
  });

  bindEvents();
  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  switchTab(['menu', 'orders', 'cart', 'bio'].includes(requestedTab) ? requestedTab : 'menu');

  setMode('nearby');
}

init();
