// 가게 정보 API — 좌표를 받아 그 주변 실제 음식점 목록을 돌려준다 (카카오 로컬 REST API, 서버리스 프록시).
// "지금 내 좌표가 어디인가"는 이 파일의 책임이 아니다 — 그건 locationApi.js가 담당하고,
// 호출부(app.js)가 locationApi.getCurrentPosition()의 결과를 이 파일의 getNearbyRestaurants(lat, lng)에 넘긴다.
// 실제 카카오 호출(과 KAKAO_REST_API_KEY)은 api/nearby.js 서버리스 함수 안에서만 일어난다 — 여기서는
// 그 함수를 상대경로로 페이지네이션하며 부를 뿐이다.
// api.js와 동일한 정규화 결과 shape({ id, name, category, roadAddress, jibunAddress, tel })로 매핑해
// 기존 카드/모달 컴포넌트를 그대로 재사용한다. distance는 이 데이터 소스에서만 추가되는 필드.

import { normalizeCategory } from './categoryMap.js';

const MAX_PAGES = 3;
const DEFAULT_RADIUS = 1500; // meters, 카카오 카테고리 검색 최대 20000

export class NearbyFetchError extends Error {}

function mapPlace(place) {
  return {
    id: place.id,
    name: place.place_name,
    category: normalizeCategory(place.category_name),
    roadAddress: place.road_address_name || '',
    jibunAddress: place.address_name || '',
    tel: place.phone || '',
    distance: Number(place.distance) || null,
    lat: place.y ? Number(place.y) : null,
    lng: place.x ? Number(place.x) : null,
  };
}

async function searchPage(lat, lng, radius, page) {
  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    page: String(page),
  });
  const res = await fetch(`/api/nearby?${params.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new NearbyFetchError(json?.error || `카카오 로컬 검색 실패 (HTTP ${res.status})`);
  }
  return { data: json.documents || [], isEnd: json.meta?.is_end !== false };
}

/**
 * 좌표 주변의 실제 음식점 목록을 거리순으로 반환한다.
 * @returns {Promise<Array>}
 */
export async function getNearbyRestaurants(lat, lng, radius = DEFAULT_RADIUS) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, isEnd } = await searchPage(lat, lng, radius, page);
    all.push(...data.map(mapPlace));
    if (isEnd) break;
  }
  return all;
}
