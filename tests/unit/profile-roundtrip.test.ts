import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { COHORT, mergeCohortPreferences } from '../../src/domain/cohort';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { rankJob } from '../../src/domain/ranking';
import { parseBackup, preferencesSchema } from '../../src/domain/transfer';
import { DEFAULT_PREFERENCES, type Preferences } from '../../src/domain/types';
import { GUEST_PREFERENCES_KEY } from '../../src/lib/supabase';
import type { Database } from '../../src/lib/database.types';
import { createDemoRepository } from '../../src/repositories/demo';
import { createSupabaseRepository } from '../../src/repositories/supabase';

const now = new Date('2026-10-22T06:30:00Z');
const complete: Preferences = { ...DEFAULT_PREFERENCES, educationLevel: 'masters', degreeField: 'Business Analytics',
  gpa: 0, gpaScale: 4, workAuthorization: 'authorized', requiresSponsorshipNowOrFuture: false, yearsExperience: 0,
  graduationDate: '2027-05-15', graduationMonth: '2027-05', earliestStart: '2027-05-16', onboardingComplete: true };
function cloudProfile(preferences: Record<string, unknown>, signedIn = true) {
  const client = {
    auth: { getSession: vi.fn(async () => ({ data: { session: signedIn ? { user: { id: 'profile-test-user' } } : null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'profile-test-user' } }, error: null })) },
    from: vi.fn((table: string) => {
      const result = { data: [], error: null, count: 0 };
      const builder = { select: () => builder, order: () => builder, neq: () => builder, eq: () => builder,
        maybeSingle: async () => ({ data: table === 'profiles' ? { preferences } : null, error: null }),
        range: async () => result, then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
      return builder;
    }), rpc: vi.fn(),
  };
  return { repository: createSupabaseRepository(client as unknown as SupabaseClient<Database>), client };
}
beforeEach(() => sessionStorage.clear());

describe('cohort and private eligibility profile compatibility', () => {
  it('shows the exact declared cohort baseline without inventing a qualification profile', () => {
    const preferences = mergeCohortPreferences(DEFAULT_PREFERENCES, {});
    expect(preferences).toMatchObject({ graduationDate: COHORT.graduationDate, graduationMonth: '2027-05', earliestStart: '2027-05-16' });
    expect(preferences.educationLevel).toBeUndefined(); expect(preferences.gpa).toBeUndefined();
    expect(preferences.requiresSponsorshipNowOrFuture).toBeUndefined();
  });
  it('migrates an untimed legacy profile while retaining its unrelated choices', () => {
    const { graduationDate: _oldUnsupportedField, ...legacy } = DEFAULT_PREFERENCES;
    const merged = mergeCohortPreferences(DEFAULT_PREFERENCES, { ...legacy, graduationMonth: null, earliestStart: null, skills: ['SQL'], timezone: 'America/New_York' });
    expect(merged).toMatchObject({ graduationDate: '2027-05-15', graduationMonth: '2027-05', earliestStart: '2027-05-16', skills: ['SQL'], timezone: 'America/New_York' });
  });
  it('preserves an older month choice without silently assigning an exact cohort day', () => {
    const merged = mergeCohortPreferences(DEFAULT_PREFERENCES, { graduationMonth: '2026-12', earliestStart: '2027-01-10' });
    expect(merged).toMatchObject({ graduationDate: null, graduationMonth: '2026-12', earliestStart: '2027-01-10' });
  });
  it('preserves explicit cleared timing after save/backup/import instead of restoring cohort dates', async () => {
    const first = createDemoRepository({ storage: null, referenceDate: now, now: () => now });
    const cleared = { ...complete, graduationDate: null, graduationMonth: null, earliestStart: null };
    await first.savePreferences(cleared);
    const backup = parseBackup(JSON.stringify(await first.exportBackup()));
    const restored = createDemoRepository({ storage: null, referenceDate: now, now: () => now });
    await restored.importBackup(backup);
    expect((await restored.getSnapshot()).preferences).toEqual(cleared);
  });
  it('round-trips zero GPA, zero experience and an explicit false sponsorship answer', async () => {
    expect(preferencesSchema.parse(complete)).toEqual(complete);
    const first = createDemoRepository({ storage: null, referenceDate: now, now: () => now });
    await first.savePreferences(complete);
    const backup = parseBackup(JSON.stringify(await first.exportBackup()));
    const restored = createDemoRepository({ storage: null, referenceDate: now, now: () => now });
    await restored.importBackup(backup);
    expect((await restored.getSnapshot()).preferences).toEqual(complete);
  });
  it('exports the same visible cohort timing after importing an untimed legacy demo backup', async () => {
    const repository = createDemoRepository({ storage: null, referenceDate: now, now: () => now });
    const backup = await repository.exportBackup();
    delete backup.preferences.graduationDate; backup.preferences.graduationMonth = null; backup.preferences.earliestStart = null;
    await repository.importBackup(backup);
    const visible = (await repository.getSnapshot()).preferences;
    const exported = parseBackup(JSON.stringify(await repository.exportBackup())).preferences;
    expect(exported).toEqual(visible);
  });
  it('rejects impossible GPA and malformed exact dates before saving profile data', () => {
    expect(preferencesSchema.safeParse({ ...complete, gpa: 4.1 }).success).toBe(false);
    expect(preferencesSchema.safeParse({ ...complete, gpa: -1 }).success).toBe(false);
    expect(preferencesSchema.safeParse({ ...complete, graduationDate: '2027-02-30' }).success).toBe(false);
    expect(preferencesSchema.safeParse({ ...complete, requiresSponsorshipNowOrFuture: 'false' }).success).toBe(false);
  });
  it('retains all optional profile facts when loading a stored cloud profile', async () => {
    const { repository, client } = cloudProfile(complete as unknown as Record<string, unknown>);
    const snapshot = await repository.getSnapshot();
    expect(snapshot.preferences).toEqual(complete); expect(snapshot.userId).toBe('profile-test-user');
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it('keeps prior cloud timing and unknown qualifications on a legacy profile', async () => {
    const { graduationDate: _oldUnsupportedField, ...legacy } = DEFAULT_PREFERENCES;
    const { repository } = cloudProfile({ ...legacy, graduationMonth: '2028-06', earliestStart: null });
    const snapshot = await repository.getSnapshot();
    expect(snapshot.preferences).toMatchObject({ graduationDate: null, graduationMonth: '2028-06', earliestStart: null });
    expect(snapshot.preferences.educationLevel).toBeUndefined();
  });
  it('keeps visitor profile facts tab-local and clears them separately from account data', async () => {
    sessionStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(complete));
    const { repository, client } = cloudProfile({}, false);
    expect((await repository.getSnapshot()).preferences).toEqual(complete);
    expect(client.rpc).not.toHaveBeenCalled(); expect(client.auth.getUser).not.toHaveBeenCalled();
    sessionStorage.clear();
    expect((await repository.getSnapshot()).preferences.gpa).toBeUndefined();
  });
});

describe('date-only deadline handling uses the selected profile timezone', () => {
  const deadlineJob = () => {
    const job = structuredClone(createDemoSnapshot(now).jobs[0]);
    delete job.sourceReview;
    job.timing = { graduationStart: null, graduationEnd: null, earliestStart: null, latestStart: null,
      deadline: '2026-10-21', deadlineVerified: true, evidence: ['Applications close October 21.'] };
    return job;
  };
  it('does not close a date-only deadline early when UTC is already the following day', () => {
    const result = rankJob(deadlineJob(), { ...DEFAULT_PREFERENCES, timezone: 'America/Los_Angeles' }, now);
    expect(result.conflicts.some(conflict => /deadline has passed/i.test(conflict))).toBe(false);
  });
  it('does flag the same deadline after that date ends in the selected timezone', () => {
    const result = rankJob(deadlineJob(), { ...DEFAULT_PREFERENCES, timezone: 'America/Los_Angeles' }, new Date('2026-10-22T07:01:00Z'));
    expect(result.conflicts.some(conflict => /deadline has passed/i.test(conflict))).toBe(true);
  });
});
