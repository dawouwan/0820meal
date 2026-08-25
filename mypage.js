// 맛집주머니 페이지 — 담은 맛집 전체를 카드로 보여주고 삭제(X)까지 지원한다.
// 조회/삭제 모두 user_id 조건을 클라이언트에서 걸지 않는다 — saved_restaurants 테이블의
// RLS 정책(auth.uid() = user_id)이 이미 본인 행만 보이게/지워지게 강제하므로 중복 필터링은
// 불필요하다.

import { supabase } from './supabaseClient.js';
import { onAuthStateChange } from './auth.js';
import { createAuthWidget } from './components/ui/AuthWidget.js';
import { createAuthModal } from './components/ui/AuthModal.js';
import { createBottomNav } from './components/ui/BottomNav.js';
import { renderLoadingState, renderLoginRequiredState } from './components/ui/StatusView.js';
import { renderSavedRestaurantCards } from './components/ui/SavedRestaurantCard.js';

const el = {
  authWidgetRoot: document.getElementById('auth-widget-root'),
  authModalRoot: document.getElementById('auth-modal-root'),
  bottomNavRoot: document.getElementById('bottom-nav-root'),
  mypageInfo: document.getElementById('mypage-info'),
  mypageArea: document.getElementById('mypage-area'),
};

const state = {
  currentUser: null,
  items: [],
};

function renderEmptyState() {
  el.mypageArea.innerHTML = `<div class="col-span-full border border-dashed border-outline-variant p-10 text-center space-y-4">
    <p class="font-code-md text-code-md text-outline">아직 담은 맛집이 없어요. 검색하러 가볼까요?</p>
    <a href="main.html" class="inline-block px-4 py-2 border-2 border-primary text-primary font-label-sm text-label-sm uppercase hover:bg-surface-container-high transition-colors">&gt; 검색하러 가기</a>
  </div>`;
}

function renderItems() {
  el.mypageInfo.textContent = `// ${state.items.length} SAVED`;
  if (!state.items.length) {
    renderEmptyState();
    return;
  }
  renderSavedRestaurantCards(el.mypageArea, { items: state.items, onDelete: handleDelete });
}

async function handleDelete(id) {
  const { error } = await supabase.from('saved_restaurants').delete().eq('id', id);
  if (error) return;
  state.items = state.items.filter((r) => r.id !== id);
  renderItems();
}

async function loadAndRender() {
  if (!state.currentUser) {
    el.mypageInfo.textContent = '// LOGIN_REQUIRED';
    renderLoginRequiredState(el.mypageArea, {
      message: '로그인 후 담은 맛집을 확인할 수 있어요.',
      onLogin: () => authModal.open(),
    });
    return;
  }

  el.mypageInfo.textContent = '> LOADING...';
  renderLoadingState(el.mypageArea);

  const { data, error } = await supabase
    .from('saved_restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  state.items = error || !data ? [] : data;
  renderItems();
}

let authModal;
let authWidget;
let bottomNav;

function init() {
  authModal = createAuthModal({});
  el.authModalRoot.appendChild(authModal.root);

  authWidget = createAuthWidget({ onLoginClick: () => authModal.open() });
  el.authWidgetRoot.appendChild(authWidget.root);

  bottomNav = createBottomNav({
    onSelect: (target) => {
      window.location.href = target === 'menu' ? 'main.html' : `main.html?tab=${target}`;
    },
  });
  el.bottomNavRoot.appendChild(bottomNav.root);
  bottomNav.setActive('');

  onAuthStateChange(async (user) => {
    state.currentUser = user;
    authWidget.render(user);
    await loadAndRender();
  });
}

init();
