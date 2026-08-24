// Vercel 서버리스 함수 — 문화공공데이터광장(KCISA) 오픈API를 서버 사이드에서만 호출한다.
// KCISA_SERVICE_KEY는 브라우저로 절대 내려가지 않고 이 함수 안에서만 process.env로 읽는다.
// 클라이언트(api.js)는 path/numOfRows/pageNo 및 지역 필터 파라미터를
// 쿼리스트링으로 넘기고, 이 함수가 serviceKey를 붙여 KCISA를 호출한 뒤 원본 JSON을 그대로
// 돌려준다 — 파싱/캐싱(extractItemArray, mapRawRecord, localStorage 등)은 기존처럼 api.js에 남는다.

const KCISA_BASE_URL = 'https://api.kcisa.kr/openapi/service/rest';

module.exports = async function handler(req, res) {
  const { path, numOfRows, pageNo, ...extraParams } = req.query;

  if (!path) {
    res.status(400).json({ error: 'path 파라미터가 필요합니다.' });
    return;
  }

  const serviceKey = process.env.KCISA_SERVICE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: 'KCISA_SERVICE_KEY가 설정되지 않았습니다.' });
    return;
  }

  const params = new URLSearchParams({
    serviceKey,
    numOfRows: String(numOfRows || 100),
    pageNo: String(pageNo || 1),
  });
  for (const [key, value] of Object.entries(extraParams)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  const url = `${KCISA_BASE_URL}/${path}?${params.toString()}`;

  try {
    const kcisaRes = await fetch(url);
    const text = await kcisaRes.text();

    // KCISA는 실패해도 HTTP 200 + 에러 XML/JSON을 줄 때가 있어 상태코드보다 본문 파싱 성공 여부를
    // 신뢰한다. 응답이 JSON이 아니면(주로 XML 에러 envelope) 클라이언트가 처리할 수 없으므로
    // 여기서 502로 명확히 알린다.
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      res.status(502).json({ error: 'KCISA 응답을 JSON으로 해석할 수 없습니다.' });
      return;
    }

    res.status(200).json(json);
  } catch (err) {
    res.status(502).json({ error: err.message || 'KCISA API 호출 중 오류가 발생했습니다.' });
  }
};
