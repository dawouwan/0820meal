// "담은 맛집" 로컬 저장소 — CART 탭 F-신규. auth.js와 동일한 패턴(try/catch로 감싸서
// localStorage 접근 실패(프라이빗 모드, 용량 초과 등)에도 앱이 죽지 않게 처리한다.

const BOOKMARKS_KEY = 'bapjip_bookmarks';

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

// 저장된 음식점 목록(배열)을 담긴 순서대로 반환. 손상/누락 시 빈 배열.
export function getBookmarks() {
  const list = readJSON(BOOKMARKS_KEY);
  return Array.isArray(list) ? list : [];
}

export function isBookmarked(id) {
  if (!id) return false;
  return getBookmarks().some((r) => r.id === id);
}

// restaurant: 정규화된 음식점 객체(id 필수). 이미 담겨 있으면 최신 정보로 덮어쓴다.
export function addBookmark(restaurant) {
  if (!restaurant || !restaurant.id) return getBookmarks();
  const list = getBookmarks();
  const next = list.filter((r) => r.id !== restaurant.id);
  next.push({ ...restaurant, bookmarkedAt: Date.now() });
  writeJSON(BOOKMARKS_KEY, next);
  return next;
}

export function removeBookmark(id) {
  const list = getBookmarks();
  const next = list.filter((r) => r.id !== id);
  writeJSON(BOOKMARKS_KEY, next);
  return next;
}

// 담겨 있으면 해제, 아니면 담기. 카드 버튼 클릭 핸들러에서 바로 쓰기 좋은 형태.
export function toggleBookmark(restaurant) {
  if (!restaurant || !restaurant.id) return getBookmarks();
  return isBookmarked(restaurant.id) ? removeBookmark(restaurant.id) : addBookmark(restaurant);
}
