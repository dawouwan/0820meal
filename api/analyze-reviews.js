// Vercel 서버리스 함수 — 구글 리뷰 텍스트를 제미나이(Gemini)에게 보내 분석시킨다.
// GEMINI_API_KEY는 서버 전용 키라 절대 클라이언트로 내려가면 안 되므로 이 함수를 거쳐서만 쓴다.
// responseSchema로 구조화 출력을 강제해 파싱 실패 위험 없이 바로 쓸 수 있는 JSON을 받는다.
//
// public.ai_analysis_cache(restaurant_id, analysis_result)에 결과를 캐싱해서 같은 가게는
// "어느 브라우저에서 처음 조회됐든" 두 번째부터는 Gemini를 다시 호출하지 않는다
// (클라이언트 localStorage 캐시는 브라우저 단위라 이 서버 캐시가 그 위 계층 역할을 한다).
// SUPABASE_URL/anon 키는 config.js/supabaseClient.js와 동일한 공개 값(RLS로 보호됨)이라
// 여기 그대로 적어도 안전하다 — 시크릿이 필요한 쓰기는 RLS를 우회하는 서비스 롤 키 대신,
// ai_analysis_cache 테이블에만 upsert할 수 있는 SECURITY DEFINER 함수(upsert_ai_analysis_cache)를
// anon 키로 호출하는 방식을 쓴다(권한 범위를 그 함수 하나로 좁혀서 서비스 롤 키보다 안전함).

const SUPABASE_URL = 'https://lkbdhcblujmxveaikwci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RFYX71rT6mMrztKPC25iZA_5-STPONd';

// 캐시 유효 기간 — 가게 리뷰/평점은 시간이 지나면 바뀌므로 무기한 캐싱하지 않는다.
const CACHE_TTL_DAYS = 30;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sentimentCounts: {
      type: 'OBJECT',
      properties: {
        positive: { type: 'INTEGER' },
        neutral: { type: 'INTEGER' },
        negative: { type: 'INTEGER' },
      },
      required: ['positive', 'neutral', 'negative'],
    },
    keywords: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          word: { type: 'STRING' },
          score: { type: 'INTEGER' },
          sentiment: { type: 'STRING', enum: ['positive', 'negative'] },
        },
        required: ['word', 'score', 'sentiment'],
      },
    },
    summary: { type: 'STRING' },
  },
  required: ['sentimentCounts', 'keywords', 'summary'],
};

function buildPrompt(restaurantName, reviews) {
  const reviewsText = reviews
    .map((r, i) => `${i + 1}. (별점 ${r.rating ?? '-'}) ${r.text || '(내용 없음)'}`)
    .join('\n');

  return `다음은 "${restaurantName}"라는 음식점의 구글 리뷰 ${reviews.length}개입니다.

${reviewsText}

위 리뷰들을 분석해서 아래 스키마에 맞춰 한국어로 응답하세요.
1. 각 리뷰를 긍정/보통/부정 중 하나로 분류하고, sentimentCounts에 각각 몇 개인지 담으세요. 세 값의 합은 반드시 ${reviews.length}여야 합니다.
2. 리뷰에 자주 나오는 핵심 단어를 8~15개 뽑으세요. 음식 이름, 맛, 분위기, 서비스 위주로 뽑고 각 단어의 중요도를 1~10점(score)으로, 그 단어가 등장한 맥락이 좋으면 positive, 나쁘면 negative로 표시하세요.
3. 이 가게에 대한 전체 리뷰를 한 문장으로 요약하세요(summary).`;
}

async function readCache(restaurantId) {
  const url = `${SUPABASE_URL}/rest/v1/ai_analysis_cache?restaurant_id=eq.${encodeURIComponent(restaurantId)}&select=analysis_result,created_at&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;

  const rows = await res.json();
  const row = rows[0];
  if (!row) return null;

  const ageMs = Date.now() - new Date(row.created_at).getTime();
  const isFresh = ageMs < CACHE_TTL_DAYS * 86400000;
  return isFresh ? row.analysis_result : null;
}

async function writeCache(restaurantId, analysisResult) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_ai_analysis_cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_restaurant_id: restaurantId, p_analysis_result: analysisResult }),
    });
  } catch {
    // 캐시 저장 실패는 응답 자체를 막을 이유가 아니다 — 다음 요청이 다시 Gemini를 호출할 뿐.
  }
}

async function callGemini(apiKey, restaurantName, reviews) {
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(restaurantName, reviews) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    }
  );

  const data = await geminiRes.json();
  if (!geminiRes.ok) {
    throw new Error(data?.error?.message || 'Gemini 분석 요청 실패');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini 응답을 해석할 수 없습니다.');
  }

  return JSON.parse(text);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 지원합니다.' });
    return;
  }

  const { restaurantId, restaurantName, reviews } = req.body || {};
  if (!restaurantId || !restaurantName || !Array.isArray(reviews) || reviews.length === 0) {
    res.status(400).json({ error: 'restaurantId, restaurantName, reviews(1개 이상)가 필요합니다.' });
    return;
  }

  try {
    const cached = await readCache(restaurantId);
    if (cached) {
      res.status(200).json(cached);
      return;
    }
  } catch {
    // 캐시 조회 실패는 무시하고 정상적으로 Gemini를 호출한다.
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
    return;
  }

  try {
    const parsed = await callGemini(apiKey, restaurantName, reviews);
    await writeCache(restaurantId, parsed);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(502).json({ error: err.message || 'AI 분석 중 오류가 발생했습니다.' });
  }
};
