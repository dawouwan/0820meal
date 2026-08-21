// 위치정보 API — 브라우저 Geolocation만 담당. 별도 API 키 불필요(브라우저 내장 기능).
// 가게 정보 조회(nearbyApi.js)와는 독립적으로 "지금 내 좌표가 어디인가"만 책임진다.

export class GeolocationError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // 'unsupported' | 'denied' | 'unavailable' | 'timeout'
  }
}

/**
 * 브라우저 위치 권한을 요청하고 현재 좌표를 반환한다.
 * @returns {Promise<{lat: number, lng: number}>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocationError('이 브라우저는 위치 정보를 지원하지 않습니다.', 'unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (err) => {
        const code = err.code === err.PERMISSION_DENIED ? 'denied'
          : err.code === err.TIMEOUT ? 'timeout'
          : 'unavailable';
        reject(new GeolocationError('위치 정보를 가져오지 못했습니다.', code));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  });
}
