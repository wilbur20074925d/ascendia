import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    __ENV__?: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
      SITE_BASE_PATH?: string;
      MEDIAPIPE_APP_URL?: string;
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

export function getSiteBasePath(): string {
  const fromEnv = window.__ENV__?.SITE_BASE_PATH;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const match = window.location.pathname.match(/^(\/[^/]+)\/mediapipe-samples-web/);
  if (match) return match[1];

  const stripped = window.location.pathname.replace(/\/mediapipe-samples-web\/?.*$/, '');
  if (stripped && stripped !== '/') return stripped.replace(/\/$/, '');

  return '';
}

export function getLoginUrl(): string {
  const base = getSiteBasePath();
  return `${window.location.origin}${base}/login`;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.location.replace(getLoginUrl());
}
