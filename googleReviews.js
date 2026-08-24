// 구글 리뷰 조회 클라이언트 — 실제 Google Places 호출은 api/reviews.js(서버리스 함수)가 대신 한다.
// (구글 API 키는 서버 전용 키라 브라우저에 노출하면 안 됨.)
// 한 번 조회한 가게는 결과를 localStorage에 저장해 두고, 같은 가게를 다시 클릭하면 재요청하지
// 않는다 — "못 찾음" 응답도 함께 캐싱해서 매번 헛걸음(재요청)하지 않게 한다.

const CACHE_PREFIX = 'bapjip_google_review_';

function cacheKey(restaurantId) {
  return `${CACHE_PREFIX}${restaurantId}`;
}

function readCache(restaurantId) {
  try {
    const raw = localStorage.getItem(cacheKey(restaurantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(restaurantId, data) {
  try {
    localStorage.setItem(cacheKey(restaurantId), JSON.stringify(data));
  } catch {
    // 저장 실패(프라이빗 모드/용량 초과)해도 조회 자체는 이미 끝났으므로 무시.
  }
}

// restaurant: { id, name, lat, lng } — lat/lng가 없으면 애초에 호출하지 않는 게 호출부 책임.
// 반환값: { found: true, name, rating, reviewCount, mapsUrl, reviews } | { found: false } | { error }
export async function getGoogleReview(restaurant) {
  const cached = readCache(restaurant.id);
  if (cached) return cached;

  const params = new URLSearchParams({
    name: restaurant.name,
    lat: String(restaurant.lat),
    lng: String(restaurant.lng),
  });

  let result;
  try {
    const res = await fetch(`/api/reviews?${params.toString()}`);
    result = await res.json();
    if (!res.ok) {
      result = { error: result.error || '리뷰를 불러오지 못했습니다.' };
    }
  } catch {
    result = { error: '네트워크 오류로 리뷰를 불러오지 못했습니다.' };
  }

  // 에러 응답은 캐싱하지 않는다 — 일시적 오류일 수 있으므로 다음 클릭 때 재시도 가능하게 둔다.
  if (!result.error) writeCache(restaurant.id, result);
  return result;
}
