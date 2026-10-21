import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../src/domain/types';
import { createSupabaseRepository } from '../../src/repositories/supabase';
import { clearGuestPreferences, GUEST_PREFERENCES_KEY } from '../../src/lib/supabase';
import type { Database } from '../../src/lib/database.types';
function guest() {
  const result = { data: [], error: null, count: 0 };
  const builder = { select: () => builder, order: () => builder, neq: () => builder, range: async () => result,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
  const client = { auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })), getUser: vi.fn() },
    from: vi.fn(() => builder), rpc: vi.fn() };
  return { client, repository: createSupabaseRepository(client as unknown as SupabaseClient<Database>) };
}
beforeEach(() => sessionStorage.clear());
describe('temporary visitor preferences', () => {
  it('persists validated preferences for this tab without a server write or account', async () => {
    const { repository, client } = guest();
    const preferences = { ...DEFAULT_PREFERENCES, locations: ['Seattle'], timezone: 'America/New_York' };
    await repository.savePreferences(preferences);
    expect(client.from).not.toHaveBeenCalled(); expect(client.rpc).not.toHaveBeenCalled(); expect(client.auth.getUser).not.toHaveBeenCalled();
    const state = await repository.getSnapshot(); expect(state.userId).toBeNull(); expect(state.preferences).toEqual(preferences); expect(state.opportunities).toEqual([]);
  });
  it('uses the browser timezone when no temporary preferences exist and ignores malformed storage', async () => {
    sessionStorage.setItem(GUEST_PREFERENCES_KEY, '{"timezone":"invented"}');
    const state = await guest().repository.getSnapshot();
    expect(state.preferences.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(sessionStorage.getItem(GUEST_PREFERENCES_KEY)).toBeNull();
  });
  it('clears temporary preferences and still refuses guest private saves', async () => {
    sessionStorage.setItem(GUEST_PREFERENCES_KEY, '{}'); clearGuestPreferences();
    expect(sessionStorage.getItem(GUEST_PREFERENCES_KEY)).toBeNull();
    const { repository, client } = guest();
    await expect(repository.changeStage('untrusted', 'Applied', { idempotencyKey: 'guest' })).rejects.toThrow('Sign in');
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
