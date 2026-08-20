// 로딩 / 초기 / 0건 / 오류 상태 화면 — PRD §6.3, F-06

import { escapeHtml } from './domUtils.js';

function skeletonHtml() {
  return Array.from({ length: 6 }).map(() => `
    <div class="border border-outline-variant overflow-hidden">
      <div class="h-32 w-full skeleton"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 w-2/3 skeleton"></div>
        <div class="h-3 w-1/3 skeleton"></div>
        <div class="h-10 w-full skeleton"></div>
      </div>
    </div>`).join('');
}

export function renderLoadingState(container) {
  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${skeletonHtml()}</div>`;
}

export function renderMessageState(container, message) {
  container.innerHTML = `<div class="col-span-full border border-dashed border-outline-variant p-10 text-center">
    <p class="font-code-md text-code-md text-outline">${escapeHtml(message)}</p>
  </div>`;
}

// onRetry() / onUseMock()는 각각 재시도, 예시 데이터 보기 버튼 클릭 시 호출.
export function renderErrorState(container, { isConfigMissing, onRetry, onUseMock }) {
  const hint = isConfigMissing
    ? 'config.js에 KCISA_SERVICE_KEY / KCISA_SERVICE_PATH가 아직 설정되지 않았습니다.'
    : '정보를 불러오지 못했어요. CORS 차단이거나 API 오류일 수 있습니다.';
  container.innerHTML = `<div class="col-span-full border border-error/60 bg-surface-container-lowest p-8 text-center space-y-4">
    <p class="font-code-md text-code-md text-error">&gt; FETCH_FAILED</p>
    <p class="font-body-md text-body-md text-on-surface">${escapeHtml(hint)}</p>
    <div class="flex items-center justify-center gap-4 flex-wrap">
      <button id="retry-btn" type="button" class="px-4 py-2 border-2 border-primary text-primary font-label-sm text-label-sm uppercase hover:bg-surface-container-high">&gt; RETRY</button>
      <button id="use-mock-btn" type="button" class="px-4 py-2 border border-secondary text-secondary font-label-sm text-label-sm uppercase hover:bg-surface-container-high">지금은 예시 데이터로 보기</button>
    </div>
  </div>`;
  container.querySelector('#retry-btn').addEventListener('click', onRetry);
  container.querySelector('#use-mock-btn').addEventListener('click', onUseMock);
}
