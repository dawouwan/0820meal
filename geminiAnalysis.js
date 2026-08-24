// AI 리뷰 분석 클라이언트 — 실제 제미나이 호출은 api/analyze-reviews.js(서버리스 함수)가 대신 한다.
// (제미나이 키도 구글 리뷰 키와 마찬가지로 서버 전용 키라 브라우저에 노출하면 안 됨.)
// 무료 사용량을 아끼기 위해 같은 가게의 분석 결과는 localStorage에 저장해 두고 재클릭 시 재요청하지 않는다.

const CACHE_PREFIX = 'bapjip_ai_analysis_';

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
    // 저장 실패(프라이빗 모드/용량 초과)해도 분석 자체는 이미 끝났으므로 무시.
  }
}

// restaurant: { id, name }. reviews: getGoogleReview()가 반환한 reviews 배열([{rating, text, ...}]).
// 반환값: { sentimentCounts, keywords, summary } | { error }
export async function getReviewAnalysis(restaurant, reviews) {
  const cached = readCache(restaurant.id);
  if (cached) return cached;

  let result;
  try {
    const res = await fetch('/api/analyze-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        reviews: reviews.map((r) => ({ rating: r.rating, text: r.text })),
      }),
    });
    result = await res.json();
    if (!res.ok) {
      result = { error: result.error || 'AI 분석에 실패했습니다.' };
    }
  } catch {
    result = { error: '네트워크 오류로 AI 분석에 실패했습니다.' };
  }

  if (!result.error) writeCache(restaurant.id, result);
  return result;
}
