// "담은 맛집" 로컬 저장소 — CART 탭 F-신규. auth.js와 동일한 패턴(try/catch로 감싸서
// localStorage 접근 실패(프라이빗 모드, 용량 초과 등)에도 앱이 죽지 않게 처리한다.
//
// 로그인한 사용자만 쓸 수 있는 기능이라 모든 함수가 userId(Supabase auth user.id)를 첫
// 인자로 받는다 — 같은 브라우저를 여러 계정이 함께 쓸 때 계정별로 저장소를 분리하기 위함.
// userId가 없으면(로그인 안 됨) 아무것도 읽지도 쓰지도 않는다 — 호출부(app.js)에서 로그인
// 여부를 먼저 확인하는 게 정상 경로지만, 여기서도 한 번 더 막아 방어적으로 동작한다.

function bookmarksKey(userId) {
  return `bapjip_bookmarks_${userId}`;
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// 저장된 음식점 목록(배열)을 담긴 순서대로 반환. 손상/누락/비로그인 시 빈 배열.
export function getBookmarks(userId) {
  if (!userId) return [];
  const list = readJSON(bookmarksKey(userId));
  return Array.isArray(list) ? list : [];
}

export function isBookmarked(userId, id) {
  if (!userId || !id) return false;
  return getBookmarks(userId).some((r) => r.id === id);
}

// restaurant: 정규화된 음식점 객체(id 필수). 이미 담겨 있으면 최신 정보로 덮어쓴다.
export function addBookmark(userId, restaurant) {
  if (!userId || !restaurant || !restaurant.id) return getBookmarks(userId);
  const list = getBookmarks(userId);
  const next = list.filter((r) => r.id !== restaurant.id);
  next.push({ ...restaurant, bookmarkedAt: Date.now() });
  writeJSON(bookmarksKey(userId), next);
  return next;
}

export function removeBookmark(userId, id) {
  if (!userId) return [];
  const list = getBookmarks(userId);
  const next = list.filter((r) => r.id !== id);
  writeJSON(bookmarksKey(userId), next);
  return next;
}

// 담겨 있으면 해제, 아니면 담기. 카드 버튼 클릭 핸들러에서 바로 쓰기 좋은 형태.
// 로그인 여부 확인은 호출부 책임(app.js) — userId가 없으면 그냥 아무 일도 하지 않는다.
export function toggleBookmark(userId, restaurant) {
  if (!userId || !restaurant || !restaurant.id) return getBookmarks(userId);
  return isBookmarked(userId, restaurant.id) ? removeBookmark(userId, restaurant.id) : addBookmark(userId, restaurant);
}
