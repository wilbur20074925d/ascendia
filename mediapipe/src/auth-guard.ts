import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    __ENV__?: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
}

function getLoginUrl(): string {
  const base = window.location.pathname.replace(/\/mediapipe-samples-web\/?.*$/, '');
  return `${window.location.origin}${base}/login`;
}

export async function requireAuth(): Promise<void> {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.__ENV__ || {};

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase is not configured; skipping auth guard.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.replace(getLoginUrl());
    await new Promise(() => {});
  }
}
