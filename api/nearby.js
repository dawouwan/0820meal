// Vercel 서버리스 함수 — 카카오 로컬(Local) REST API를 서버 사이드에서만 호출한다.
// KAKAO_REST_API_KEY는 Authorization 헤더로 붙는 서버 전용 키라(JS SDK의 appkey와 달리 도메인
// 제한이 걸린 브라우저 전용 키가 아니다) 절대 클라이언트로 내려가면 안 되므로 이 함수를 거쳐서만 쓴다.
// 클라이언트(nearbyApi.js)는 좌표/반경/페이지만 넘기고, 카카오 응답({ meta, documents })을
// 그대로 돌려받아 기존 페이지네이션/매핑 로직을 그대로 재사용한다.

const FOOD_CATEGORY_CODE = 'FD6';

module.exports = async function handler(req, res) {
  const { x, y, radius, page } = req.query;

  if (!x || !y) {
    res.status(400).json({ error: 'x, y(좌표) 파라미터가 필요합니다.' });
    return;
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'KAKAO_REST_API_KEY가 설정되지 않았습니다.' });
    return;
  }

  const params = new URLSearchParams({
    category_group_code: FOOD_CATEGORY_CODE,
    x: String(x),
    y: String(y),
    radius: String(radius || 1500),
    sort: 'distance',
    page: String(page || 1),
  });

  try {
    const kakaoRes = await fetch(`https://dapi.kakao.com/v2/local/search/category.json?${params.toString()}`, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    const data = await kakaoRes.json();
    if (!kakaoRes.ok) {
      res.status(502).json({ error: data?.message || `카카오 로컬 검색 실패 (${kakaoRes.status})` });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message || '카카오 로컬 API 호출 중 오류가 발생했습니다.' });
  }
};
