// components/ui 공통 헬퍼 — 여러 컴포넌트가 공유하는 최소한의 유틸.

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
