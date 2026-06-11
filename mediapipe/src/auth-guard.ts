import { getLoginUrl, getSupabase } from './lib/auth';

export async function requireAuth(): Promise<void> {
  const supabase = getSupabase();

  if (!supabase) {
    console.warn('Supabase is not configured; skipping auth guard.');
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.replace(getLoginUrl());
    await new Promise(() => {});
  }
}
