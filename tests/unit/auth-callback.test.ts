import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), getUser: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ auth })) }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://project.example.invalid');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_key_only');
  window.history.replaceState({}, '', '/auth/callback?code=one-time-code');
  auth.getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null });
});
describe('OAuth callback retries', () => {
  it('shares a single in-flight PKCE code exchange across StrictMode effects', async () => {
    let finish!: (value: unknown) => void;
    auth.exchangeCodeForSession.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { completeAuthCallback } = await import('../../src/lib/supabase');
    const first = completeAuthCallback(), second = completeAuthCallback();
    expect(first).toBe(second); expect(auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('one-time-code');
    finish({ error: null }); await Promise.all([first, second]);
    expect(window.location.search).toBe(''); expect(auth.getUser).toHaveBeenCalledTimes(1);
    await completeAuthCallback();
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
  it('releases failed in-flight work for a deliberate retry', async () => {
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: { message: 'Temporary failure' } }).mockResolvedValueOnce({ error: null });
    const { completeAuthCallback } = await import('../../src/lib/supabase');
    await expect(completeAuthCallback()).rejects.toThrow('Temporary failure');
    await completeAuthCallback(); expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(2);
  });
});
