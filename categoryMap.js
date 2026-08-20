// PRD §4.4 — 원본 업종 표기를 6개 표시 카테고리로 정규화하는 단일 설정 파일.
// 새 원본 표기가 발견되면 아래 배열에 키워드만 추가하면 된다.

const CATEGORY_RULES = [
  { display: '한식', keywords: ['한식', '한정식', '백반', '국밥', '분식', '족발', '보쌈', '곰탕', '설렁탕'] },
  { display: '중식', keywords: ['중식', '중국식', '중국요리'] },
  { display: '일식', keywords: ['일식', '초밥', '스시', '생선회', '횟집', '라멘', '돈카츠'] },
  { display: '양식', keywords: ['양식', '경양식', '이탈리안', '패밀리레스토랑', '스테이크', '피자', '파스타'] },
  { display: '카페·디저트', keywords: ['카페', '커피숍', '커피전문점', '제과', '전통찻집', '베이커리', '디저트'] },
];

const FALLBACK_CATEGORY = '기타';

export const DISPLAY_CATEGORIES = [
  '한식', '중식', '일식', '양식', '카페·디저트', '기타',
];

export function normalizeCategory(rawCategory) {
  if (!rawCategory || typeof rawCategory !== 'string') return FALLBACK_CATEGORY;
  const trimmed = rawCategory.trim();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => trimmed.includes(kw))) return rule.display;
  }
  return FALLBACK_CATEGORY;
}
