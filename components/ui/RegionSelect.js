// 시군구 셀렉트 — 서울 고정. PRD F-02.
// 시도(광역시도) 선택 UI는 제거했고, sidoCode는 항상 서울특별시(11)로 고정한다.

const SEOUL_SIDO_CODE = '11';
const SEOUL_SIDO_NAME = '서울특별시';

export function createRegionSelect({ regions, onSigunguChange }) {
  const root = document.createElement('div');
  root.className = 'mb-6 flex flex-wrap gap-4';
  root.innerHTML = `
    <select id="sigungu-select" class="bg-surface-container-low border-2 border-outline-variant px-4 py-3 font-code-md text-code-md text-on-surface focus:outline-none neon-border">
      <option value="">시군구 선택</option>
    </select>`;

  const sigunguSelect = root.querySelector('#sigungu-select');

  // regions.json에서 서울 항목만 사용. 못 찾으면(데이터 누락) 빈 목록으로 방어.
  const sido = regions.find((r) => r.sidoCode === SEOUL_SIDO_CODE) ||
    { sidoCode: SEOUL_SIDO_CODE, sidoName: SEOUL_SIDO_NAME, sigungu: [] };

  function findSigunguName(sigunguCode) {
    return sido.sigungu.find((s) => s.code === sigunguCode)?.name || '';
  }

  sigunguSelect.innerHTML = '<option value="">시군구 선택</option>' +
    sido.sigungu.map((s) => `<option value="${s.code}">${s.name}</option>`).join('');

  sigunguSelect.addEventListener('change', () => {
    onSigunguChange(sigunguSelect.value);
  });

  return {
    root,
    sido, // 항상 서울특별시로 고정된 sido 레코드 (sidoCode/sidoName 조회용)
    findSigunguName,
    // 이벤트를 발생시키지 않고 현재 상태를 셀렉트에 반영 (초기화/URL 복원용).
    setValues(sigunguCode) {
      sigunguSelect.value = sigunguCode;
    },
  };
}
