// 가게 정보 API — 좌표를 받아 그 주변 실제 음식점 목록을 돌려준다 (카카오맵 JS SDK, services 라이브러리).
// "지금 내 좌표가 어디인가"는 이 파일의 책임이 아니다 — 그건 locationApi.js가 담당하고,
// 호출부(app.js)가 locationApi.getCurrentPosition()의 결과를 이 파일의 getNearbyRestaurants(lat, lng)에 넘긴다.
// 서버 없는 정적 페이지에서 CORS 없이 쓸 수 있도록 REST fetch 대신 <script> 태그 SDK를 사용한다.
// api.js와 동일한 정규화 결과 shape({ id, name, category, roadAddress, jibunAddress, tel })로 매핑해
// 기존 카드/모달 컴포넌트를 그대로 재사용한다. distance는 이 데이터 소스에서만 추가되는 필드.

import { KAKAO_JS_KEY } from './config.js';
import { normalizeCategory } from './categoryMap.js';

const FOOD_CATEGORY_CODE = 'FD6';
const MAX_PAGES = 3;
const DEFAULT_RADIUS = 1500; // meters, 카카오 categorySearch 최대 20000

export class KakaoConfigMissingError extends Error {}
export class KakaoLoadError extends Error {}
export class NearbyFetchError extends Error {}

let sdkLoadPromise = null;

function loadKakaoSdk() {
  if (sdkLoadPromise) return sdkLoadPromise;

  if (!KAKAO_JS_KEY) {
    return Promise.reject(
      new KakaoConfigMissingError('.env.local에 KAKAO_JS_KEY가 설정되지 않았습니다.')
    );
  }

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&libraries=services&autoload=false`;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new KakaoLoadError('카카오맵 SDK 로드에 실패했습니다.'));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => reject(new KakaoLoadError('카카오맵 SDK 스크립트를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  // 네트워크 오류 등 일시적 실패는 캐시하지 않고 다음 호출(재시도)에서 다시 로드를 시도한다.
  sdkLoadPromise.catch(() => {
    sdkLoadPromise = null;
  });

  return sdkLoadPromise;
}

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

function searchPage(places, lat, lng, radius, page) {
  return new Promise((resolve, reject) => {
    places.categorySearch(
      FOOD_CATEGORY_CODE,
      (data, status, pagination) => {
        if (status === window.kakao.maps.services.Status.OK) {
          resolve({ data, hasNextPage: pagination.hasNextPage });
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          resolve({ data: [], hasNextPage: false });
        } else {
          reject(new NearbyFetchError(`카카오 로컬 검색 실패 (status: ${status})`));
        }
      },
      {
        location: new window.kakao.maps.LatLng(lat, lng),
        radius,
        sort: window.kakao.maps.services.SortBy.DISTANCE,
        page,
      }
    );
  });
}

/**
 * 좌표 주변의 실제 음식점 목록을 거리순으로 반환한다.
 * @returns {Promise<Array>}
 */
export async function getNearbyRestaurants(lat, lng, radius = DEFAULT_RADIUS) {
  const kakao = await loadKakaoSdk();
  const places = new kakao.maps.services.Places();

  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, hasNextPage } = await searchPage(places, lat, lng, radius, page);
    all.push(...data.map(mapPlace));
    if (!hasNextPage) break;
  }
  return all;
}
