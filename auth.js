// Supabase Auth 기반 로그인/회원가입/세션 관리.
// 비밀번호 저장·검증·세션 유지(새로고침 포함)는 전부 Supabase가 처리한다 — 여기서는
// (1) UI에 보여줄 한국어 에러 메시지로 변환하고 (2) "지금 로그인한 사람이 누구인지"를
// 다른 기능(맛집 담기 등)이 가져다 쓰기 좋은 형태로 노출하는 역할만 한다.

import { supabase } from './supabaseClient.js';

export { supabase };

function translateAuthError(error) {
  const msg = error?.message || '';

  if (/already registered|already exists|user already/i.test(msg)) {
    return '이미 가입된 이메일입니다. 로그인을 이용해 주세요.';
  }
  if (/invalid login credentials/i.test(msg)) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (/email not confirmed/i.test(msg)) {
    return '이메일 인증이 완료되지 않았습니다. 관리자에게 문의해 주세요.';
  }
  if (/password.*(least|short|characters|weak)/i.test(msg) || /weak password/i.test(msg)) {
    return '비밀번호가 너무 짧거나 약합니다. 6자 이상으로 입력해 주세요.';
  }
  if (/rate limit/i.test(msg)) {
    return '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (/invalid email|unable to validate email/i.test(msg)) {
    return '올바른 이메일 형식이 아닙니다.';
  }
  if (/network|fetch/i.test(msg)) {
    return '네트워크 오류로 요청에 실패했습니다. 연결을 확인해 주세요.';
  }
  return msg ? `오류가 발생했습니다: ${msg}` : '알 수 없는 오류가 발생했습니다.';
}

// 회원가입 — 성공 시 바로 로그인 상태가 된다(이메일 인증 대기 없음).
// Supabase 프로젝트의 Authentication 설정에서 "Confirm email"이 꺼져 있어야
// signUp이 세션을 즉시 내려준다. 켜져 있는 경우를 대비해, 세션이 없으면 같은 자격증명으로
// 로그인을 한 번 더 시도한다.
export async function signUp(email, password) {
  const trimmedEmail = (email || '').trim();
  if (!trimmedEmail || !password) {
    return { ok: false, error: '이메일과 비밀번호를 모두 입력해 주세요.' };
  }

  const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
  if (error) {
    return { ok: false, error: translateAuthError(error) };
  }

  if (data.session) {
    return { ok: true };
  }

  const signInResult = await signIn(trimmedEmail, password);
  if (signInResult.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    error: '가입은 완료되었지만 이메일 인증이 필요합니다. 관리자에게 문의해 주세요.',
  };
}

export async function signIn(email, password) {
  const trimmedEmail = (email || '').trim();
  if (!trimmedEmail || !password) {
    return { ok: false, error: '이메일과 비밀번호를 모두 입력해 주세요.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
  if (error) {
    return { ok: false, error: translateAuthError(error) };
  }
  return { ok: true };
}

export async function signOut() {
  await supabase.auth.signOut();
}

// 다른 기능이 "지금 로그인한 사람이 누구인지" 확인할 때 쓰는 단일 진입점.
// 로그인 안 되어 있으면 null. (예: 맛집 담기 기능에서 로그인 여부를 이걸로 판단하면 됨)
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

// 화면에 표시할 이름 — 별도 닉네임 입력을 받지 않으므로 이메일 앞부분을 사용.
export function getDisplayName(user) {
  if (!user) return '';
  return user.user_metadata?.display_name || (user.email || '').split('@')[0];
}

// 로그인/로그아웃/토큰 갱신 등 인증 상태 변화를 구독한다. 구독 즉시 현재 세션 기준으로도
// 한 번 호출되므로(Supabase 기본 동작), 새로고침 후 로그인 상태 복원도 이걸로 처리된다.
// 반환값은 supabase가 주는 subscription 객체 — 필요하면 .unsubscribe()로 해제.
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return data.subscription;
}
