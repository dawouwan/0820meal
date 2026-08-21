// Supabase 클라이언트 싱글턴 — 빌드 도구 없이 CDN(esm.sh)에서 바로 ESM으로 가져온다.
// auth.js를 비롯해 앞으로 DB를 쓰는 기능(맛집 담기 등)도 이 인스턴스를 재사용한다.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
