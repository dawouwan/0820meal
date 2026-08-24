// "담은 맛집" 저장소 — Supabase의 public.saved_restaurants 테이블(RLS: 본인 행만 select/insert/delete)을 사용한다.
//
// getBookmarks/isBookmarked는 카드 렌더링(RestaurantCard) 중 동기적으로 여러 번 호출되므로
// 매번 네트워크를 타지 않도록 로그인한 사용자 1명 분의 목록을 메모리 캐시에 들고 있는다.
// 캐시는 loadBookmarks(로그인/세션 복원 시 app.js가 호출)와 add/removeBookmark 이후에 갱신된다.

import { supabase } from './supabaseClient.js';

let cache = { userId: null, restaurants: [] };

function toRestaurant(row) {
  return {
    id: row.restaurant_id,
    name: row.restaurant_name,
    category: row.category,
    roadAddress: row.address,
    lat: row.lat,
    lng: row.lng,
    bookmarkedAt: row.created_at ? new Date(row.created_at).getTime() : null,
  };
}

// 로그인/로그아웃/세션 복원 시 app.js가 호출해 캐시를 채운다. userId가 없으면 캐시를 비운다.
export async function loadBookmarks(userId) {
  if (!userId) {
    cache = { userId: null, restaurants: [] };
    return [];
  }

  const { data, error } = await supabase
    .from('saved_restaurants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  cache = { userId, restaurants: error || !data ? [] : data.map(toRestaurant) };
  return cache.restaurants;
}

// 캐시에서 동기적으로 반환. loadBookmarks가 먼저 호출되어 있지 않으면(또는 다른 사용자면) 빈 배열.
export function getBookmarks(userId) {
  if (!userId || cache.userId !== userId) return [];
  return cache.restaurants;
}

export function isBookmarked(userId, id) {
  if (!userId || !id) return false;
  return getBookmarks(userId).some((r) => r.id === id);
}

// restaurant: 정규화된 음식점 객체(id 필수). insert 후 캐시를 다시 로드한다.
export async function addBookmark(userId, restaurant) {
  if (!userId || !restaurant || !restaurant.id) return getBookmarks(userId);

  const { error } = await supabase.from('saved_restaurants').insert({
    user_id: userId,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name || '',
    category: restaurant.category || null,
    address: restaurant.roadAddress || restaurant.jibunAddress || null,
    lat: restaurant.lat ?? null,
    lng: restaurant.lng ?? null,
  });
  if (error) return getBookmarks(userId);

  return loadBookmarks(userId);
}

export async function removeBookmark(userId, id) {
  if (!userId) return [];

  const { error } = await supabase
    .from('saved_restaurants')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', id);
  if (error) return getBookmarks(userId);

  return loadBookmarks(userId);
}

// 담겨 있으면 해제, 아니면 담기. 카드 버튼 클릭 핸들러에서 바로 쓰기 좋은 형태.
// 로그인 여부 확인은 호출부 책임(app.js) — userId가 없으면 그냥 아무 일도 하지 않는다.
export async function toggleBookmark(userId, restaurant) {
  if (!userId || !restaurant || !restaurant.id) return getBookmarks(userId);
  return isBookmarked(userId, restaurant.id)
    ? removeBookmark(userId, restaurant.id)
    : addBookmark(userId, restaurant);
}
