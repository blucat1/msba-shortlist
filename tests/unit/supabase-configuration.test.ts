import { describe, expect, it } from 'vitest';
import { readSupabaseConfiguration } from '../../src/lib/supabase';
const url = 'https://project.example.invalid';
const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role }))}.signature`;
describe('browser Supabase configuration', () => {
  it('accepts only publishable credentials or a local/legacy anon JWT', () => {
    expect(readSupabaseConfiguration({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_only' }).url).toBe(url);
    expect(readSupabaseConfiguration({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }).key).toBe(jwt('anon'));
  });
  it('rejects privileged credentials before creating a browser client', () => {
    for (const key of ['sb_secret_must_never_ship_here', jwt('service_role'), jwt('authenticated')]) {
      expect(() => readSupabaseConfiguration({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key })).toThrow('Live service is not configured');
    }
  });
  it('reports missing configuration honestly and rejects insecure hosted endpoints', () => {
    expect(() => readSupabaseConfiguration({})).toThrow('isolated demo');
    expect(() => readSupabaseConfiguration({ VITE_SUPABASE_URL: 'http://remote.example.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_only' })).toThrow();
    expect(readSupabaseConfiguration({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }).url).toBe('http://127.0.0.1:54321');
  });
});
