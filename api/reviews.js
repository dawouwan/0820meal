// Vercel 서버리스 함수 — Google Places API (New)를 서버 사이드에서만 호출한다.
// GOOGLE_PLACES_API_KEY는 절대 클라이언트로 내려가면 안 되므로(카카오 JS 키와 달리 도메인
// 제한이 걸린 브라우저 전용 키가 아니라 서버 전용 키), 반드시 이 함수를 거쳐서만 쓴다.
// 흐름: (1) Text Search(New)로 이름 검색 → 좌표 150m 이내 후보만 남기고 최근접 1곳 선택
//       (2) Place Details(New)로 그 장소의 평점/리뷰/지도 링크 조회

const SEARCH_RADIUS_METERS = 150;

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function searchNearbyPlace(apiKey, name, origin) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.location',
    },
    body: JSON.stringify({
      textQuery: name,
      locationBias: { circle: { center: origin, radius: SEARCH_RADIUS_METERS } },
      maxResultCount: 5,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Places 검색 실패 (${res.status})`);
  }

  const candidates = (data.places || [])
    .filter((p) => p.location)
    .map((p) => ({ id: p.id, distance: haversineMeters(origin, p.location) }))
    .filter((p) => p.distance <= SEARCH_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance);

  return candidates[0] || null;
}

async function fetchPlaceDetails(apiKey, placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName,rating,userRatingCount,reviews,googleMapsUri',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Places 상세 조회 실패 (${res.status})`);
  }
  return data;
}

module.exports = async function handler(req, res) {
  const { name, lat, lng } = req.query;

  if (!name || !lat || !lng) {
    res.status(400).json({ error: 'name, lat, lng 파라미터가 모두 필요합니다.' });
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY가 설정되지 않았습니다.' });
    return;
  }

  const origin = { latitude: Number(lat), longitude: Number(lng) };

  try {
    const nearest = await searchNearbyPlace(apiKey, name, origin);
    if (!nearest) {
      res.status(200).json({ found: false });
      return;
    }

    const details = await fetchPlaceDetails(apiKey, nearest.id);

    res.status(200).json({
      found: true,
      name: details.displayName?.text || name,
      rating: typeof details.rating === 'number' ? details.rating : null,
      reviewCount: details.userRatingCount ?? 0,
      mapsUrl: details.googleMapsUri || null,
      reviews: (details.reviews || []).map((r) => ({
        author: r.authorAttribution?.displayName || '익명',
        rating: typeof r.rating === 'number' ? r.rating : null,
        relativeTime: r.relativePublishTimeDescription || '',
        text: r.text?.text || r.originalText?.text || '',
      })),
    });
  } catch (err) {
    res.status(502).json({ error: err.message || '구글 리뷰 조회 중 오류가 발생했습니다.' });
  }
};
