import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    __ENV__?: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
}

export function isAuthConfigured(): boolean {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.__ENV__ || {};
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!isAuthConfigured()) return null;
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.__ENV__!;
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

export function getLoginUrl(): string {
  const base = window.location.pathname.replace(/\/mediapipe-samples-web\/?.*$/, '');
  return `${window.location.origin}${base}/login`;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.location.replace(getLoginUrl());
}
