// 데이터 소스 계층 — fetch + 방어적 파싱 + localStorage 캐싱 + dedupe.
// 실제 API 필드/파라미터가 바뀌어도 이 파일과 config.js만 손보면 되도록 격리했다.

import {
  KCISA_SERVICE_PATH,
  NUM_OF_ROWS,
  MAX_PAGES,
  SUPPORTS_REGION_PARAM,
  SIDO_PARAM_NAME,
  SIGUNGU_PARAM_NAME,
  FIELD_MAP,
} from './config.js';
import { normalizeCategory } from './categoryMap.js';

const RAW_CACHE_KEY = 'bapjip_raw_all';
const REGION_CACHE_PREFIX = 'bapjip_cache_';

export class ConfigMissingError extends Error {}
export class ApiFetchError extends Error {}

function regionCacheKey(sidoCode, sigunguCode) {
  return `${REGION_CACHE_PREFIX}${sidoCode}_${sigunguCode}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 용량 초과 등은 개인용 도구에서 치명적이지 않으므로 조용히 무시
  }
}

// 실제 KCISA 호출(과 서비스키)은 api/kcisa.js 서버리스 함수 안에서만 일어난다 — 여기서는
// 그 함수를 부를 상대경로 URL만 만든다. path만 있으면 되고, 서비스키가 서버에 없는 경우는
// api/kcisa.js가 500으로 응답하며 아래 fetch 쪽에서 ApiFetchError로 처리된다.
function buildPageUrl(pageNo, extraParams) {
  if (!KCISA_SERVICE_PATH) {
    throw new ConfigMissingError('KCISA_SERVICE_PATH가 config.js에 설정되지 않았습니다.');
  }
  const params = new URLSearchParams({
    path: KCISA_SERVICE_PATH,
    numOfRows: String(NUM_OF_ROWS),
    pageNo: String(pageNo),
    ...extraParams,
  });
  return `/api/kcisa?${params.toString()}`;
}

// 공공데이터포털/KCISA에서 흔히 쓰이는 응답 envelope 몇 종을 순차 시도하고,
// 전부 실패하면 JSON 트리에서 첫 번째로 발견되는 "객체 배열"을 휴리스틱으로 찾는다.
function extractItemArray(json) {
  const candidates = [
    json?.response?.body?.items?.item,
    json?.response?.body?.items,
    json?.response?.msgBody?.itemList,
    json?.msgBody?.itemList,
    json?.msgBody?.items,
    json?.items?.item,
    json?.items,
    json?.data,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') return [candidate];
  }

  // 휴리스틱: 트리를 얕게 순회하며 객체로 이루어진 첫 배열을 찾는다.
  const visited = new Set();
  const queue = [json];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object' || visited.has(node)) continue;
    visited.add(node);
    if (Array.isArray(node) && node.length && typeof node[0] === 'object') {
      console.warn('[api.js] 알려진 응답 형태와 달라 배열을 휴리스틱으로 추정했습니다.', node);
      return node;
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') queue.push(value);
    }
  }
  return [];
}

function pickField(raw, mappedKey, fallbackKeys) {
  if (mappedKey && raw[mappedKey] !== undefined && raw[mappedKey] !== null) {
    return raw[mappedKey];
  }
  for (const key of fallbackKeys) {
    if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') return raw[key];
  }
  return undefined;
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

// 원본 레코드를 { id, name, categoryRaw, roadAddress, jibunAddress, tel } 형태로 매핑.
// name이 없으면 레코드를 버린다(PRD §4.5).
function mapRawRecord(raw) {
  const name = pickField(raw, FIELD_MAP.name, ['name', 'NAME', 'MAIN_TITLE', 'FCLTY_NM', 'title', '상호', '업소명', '상호명']);
  if (!name) return null;

  const categoryRaw = pickField(raw, FIELD_MAP.category, ['category', 'CATE1', 'INDUTY_NM', 'induty', '업종', 'category1']);
  const roadAddress = pickField(raw, FIELD_MAP.roadAddress, ['roadAddress', 'RDNMADR', '도로명주소', 'ADDR', 'rdnmadr']);
  const jibunAddress = pickField(raw, FIELD_MAP.jibunAddress, ['jibunAddress', 'LNM_ADDR', '지번주소']);
  const tel = pickField(raw, FIELD_MAP.tel, ['tel', 'TEL_NO', '전화번호', 'PHONE']);
  const address = roadAddress || jibunAddress || '';
  const rawId = pickField(raw, null, ['id', 'ID', 'SEQ', '일련번호']);

  return {
    id: rawId ? String(rawId) : `h-${hashString(`${name}|${address}`)}`,
    name: String(name),
    categoryRaw: categoryRaw ? String(categoryRaw) : '',
    roadAddress: roadAddress ? String(roadAddress) : '',
    jibunAddress: jibunAddress ? String(jibunAddress) : '',
    tel: tel ? String(tel) : '',
  };
}

function dedupe(records) {
  const seen = new Set();
  const result = [];
  for (const record of records) {
    const key = `${record.name}|${record.roadAddress}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(record);
  }
  return result;
}

// SUPPORTS_REGION_PARAM=false일 때 사용 — 전체 페이지를 받아와 정규화된 원본 배열로 캐싱.
async function fetchAllRecords() {
  const cached = readCache(RAW_CACHE_KEY);
  if (cached) return cached;

  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = buildPageUrl(page, {});
    let json;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new ApiFetchError(`HTTP ${res.status}`);
      json = await res.json();
    } catch (err) {
      if (page === 1) throw err; // 첫 페이지부터 실패하면 상위로 전파
      break; // 이후 페이지 실패는 지금까지 모은 데이터로 계속 진행
    }
    const items = extractItemArray(json);
    if (!items.length) break;
    for (const item of items) {
      const mapped = mapRawRecord(item);
      if (mapped) all.push(mapped);
    }
    if (items.length < NUM_OF_ROWS) break; // 마지막 페이지
  }

  writeCache(RAW_CACHE_KEY, all);
  return all;
}

// SUPPORTS_REGION_PARAM=true일 때 사용 — 시도/시군구 파라미터로 직접 필터된 응답을 받는다.
async function fetchRegionRecords(sidoCode, sigunguCode) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const extraParams = {};
    if (SIDO_PARAM_NAME) extraParams[SIDO_PARAM_NAME] = sidoCode;
    if (SIGUNGU_PARAM_NAME) extraParams[SIGUNGU_PARAM_NAME] = sigunguCode;
    const url = buildPageUrl(page, extraParams);
    const res = await fetch(url);
    if (!res.ok) throw new ApiFetchError(`HTTP ${res.status}`);
    const json = await res.json();
    const items = extractItemArray(json);
    if (!items.length) break;
    for (const item of items) {
      const mapped = mapRawRecord(item);
      if (mapped) all.push(mapped);
    }
    if (items.length < NUM_OF_ROWS) break;
  }
  return all;
}

function addressMatchesRegion(record, sidoName, sigunguName) {
  const address = `${record.roadAddress} ${record.jibunAddress}`;
  return address.includes(sigunguName) && (address.includes(sidoName) || address.includes(sidoName.slice(0, 2)));
}

/**
 * 시도/시군구에 해당하는 정규화된 식당 목록을 반환한다.
 * @returns {Promise<{data: Array, fromCache: boolean}>}
 */
export async function getRestaurants(sidoCode, sigunguCode, sidoName, sigunguName) {
  const cacheKey = regionCacheKey(sidoCode, sigunguCode);
  const cached = readCache(cacheKey);
  if (cached) return { data: cached, fromCache: true };

  let matched;
  if (SUPPORTS_REGION_PARAM) {
    matched = await fetchRegionRecords(sidoCode, sigunguCode);
  } else {
    const all = await fetchAllRecords();
    matched = all.filter((r) => addressMatchesRegion(r, sidoName, sigunguName));
  }

  const normalized = dedupe(matched).map((r) => ({
    id: r.id,
    name: r.name,
    category: normalizeCategory(r.categoryRaw),
    roadAddress: r.roadAddress,
    jibunAddress: r.jibunAddress,
    tel: r.tel,
    sidoCode,
    sigunguCode,
  }));

  writeCache(cacheKey, normalized);
  return { data: normalized, fromCache: false };
}
