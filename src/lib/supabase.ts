import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from './database.types';

const configurationSchema = z.object({
  url: z.url().refine(value => {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  }, 'Supabase URL must use HTTPS (HTTP localhost is allowed for development).'),
  key: z.string().min(20, 'A Supabase publishable key is required.').refine(value => {
    if (value.startsWith('sb_publishable_')) return true;
    // Local/legacy anon JWTs are supported, privileged JWTs are never accepted.
    if (!value.startsWith('eyJ')) return false;
    try { return JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; }
    catch { return false; }
  }, 'Use a browser-safe publishable key, never a secret or service-role key.'),
});
export const GUEST_PREFERENCES_KEY = 'msba-shortlist:guest-preferences';
export function clearGuestPreferences(): void {
  try { sessionStorage.removeItem(GUEST_PREFERENCES_KEY); } catch { /* Storage may be disabled. */ }
}
let client: SupabaseClient<Database> | undefined;

export function readSupabaseConfiguration(env: Record<string, unknown> = import.meta.env): { url: string; key: string } {
  const result = configurationSchema.safeParse({ url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_PUBLISHABLE_KEY });
  if (!result.success) throw new Error('Live service is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild. The isolated demo is available at /demo.');
  return result.data;
}
export function getConfigurationError(): string | null {
  try { readSupabaseConfiguration(); return null; }
  catch (error) { return error instanceof Error ? error.message : 'Invalid live configuration.'; }
}
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    const config = readSupabaseConfiguration();
    client = createClient<Database>(config.url, config.key, {
      auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, storageKey: 'msba-shortlist.auth.v1' },
    });
  }
  return client;
}
export async function signInWithGoogle(): Promise<void> {
  const site = import.meta.env.VITE_SITE_URL || window.location.origin;
  const redirectTo = new URL('/auth/callback', site).href;
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google', options: { redirectTo, scopes: 'openid email profile' },
  });
  if (error) throw new Error(`Google sign-in could not start: ${error.message}`);
}
let authCallbackInFlight: Promise<void> | null = null;
export function completeAuthCallback(): Promise<void> {
  if (authCallbackInFlight) return authCallbackInFlight;
  const operation = finishAuthCallback();
  authCallbackInFlight = operation;
  void operation.then(() => { authCallbackInFlight = null; }, () => { authCallbackInFlight = null; });
  return operation;
}
async function finishAuthCallback(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  if (params.has('error')) throw new Error(params.get('error_description') || 'Google sign-in was not completed.');
  const code = params.get('code');
  if (code) {
    const { error } = await getSupabaseClient().auth.exchangeCodeForSession(code);
    if (error) throw new Error(`Sign-in could not be completed: ${error.message}`);
    window.history.replaceState({}, '', '/auth/callback');
  }
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) throw new Error('No valid sign-in session. Please try Google sign-in again.');
}
export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new Error(`Sign-out failed: ${error.message}`);
  clearGuestPreferences();
}
export async function deleteAccount(): Promise<void> {
  const supabase = getSupabaseClient();
  const session = await supabase.auth.getSession();
  if (session.error || !session.data.session) throw new Error('Sign in before deleting your account.');
  const token = session.data.session.access_token;
  const verified = await supabase.auth.getUser(token);
  if (verified.error || !verified.data.user) throw new Error('Your session could not be verified. Sign in again.');
  const { data, error } = await supabase.functions.invoke('delete-account', {
    headers: { Authorization: `Bearer ${token}` }, body: { confirmation: 'DELETE MY ACCOUNT' },
  });
  if (error || !data?.deleted) throw new Error('Account deletion failed. Your account may still exist; please retry.');
  const current = await supabase.auth.getSession();
  if (current.data.session?.user.id === verified.data.user.id) await supabase.auth.signOut({ scope: 'local' });
  clearGuestPreferences();
}
