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

let supabaseClient: SupabaseClient | null = null;

export function isAuthConfigured(): boolean {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.__ENV__ || {};
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!isAuthConfigured()) return null;

  if (!supabaseClient) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.__ENV__!;
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}

export function getSiteBasePath(): string {
  const fromEnv = window.__ENV__?.SITE_BASE_PATH;
  if (fromEnv !== undefined && fromEnv !== null) {
    return fromEnv.replace(/\/$/, '');
  }

  const match = window.location.pathname.match(/^(\/[^/]+)\/mediapipe-samples-web/);
  if (match) return match[1];

  const stripped = window.location.pathname.replace(/\/mediapipe-samples-web\/?.*$/, '');
  if (stripped && stripped !== '/') return stripped.replace(/\/$/, '');

  return '';
}

export function getLoginUrl(options?: { signedOut?: boolean }): string {
  const base = getSiteBasePath();
  const query = options?.signedOut ? '?signed_out=1' : '';
  return `${window.location.origin}${base}/login${query}`;
}

/** Remove persisted Supabase auth tokens from localStorage (fallback if client unavailable). */
export function clearSupabaseStorage(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore storage errors */
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();

  try {
    if (supabase) {
      await supabase.auth.signOut({ scope: 'global' });
    }
  } catch (err) {
    console.warn('Supabase signOut failed, clearing local session', err);
  }

  clearSupabaseStorage();
  supabaseClient = null;

  window.location.replace(getLoginUrl({ signedOut: true }));
}
