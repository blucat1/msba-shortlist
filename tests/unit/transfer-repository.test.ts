import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { createTask, manualOpportunity } from '../../src/domain/records';
import { backupSchema, csvBackup, mergeBackup, opportunitiesCsv, parseBackup, parseCsv, previewBackup } from '../../src/domain/transfer';
import { createDemoRepository, DEMO_STORAGE_KEY, type StorageLike } from '../../src/repositories/demo';
import { DEFAULT_PREFERENCES, type Backup } from '../../src/domain/types';
import type { PrivateState } from '../../src/repositories/types';
const now = new Date('2026-10-21T19:00:00.000Z');
class MemoryStorage implements StorageLike {
  data = new Map<string, string>(); fail = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error('QuotaExceeded'); this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}
const make = (storage: MemoryStorage | null = null) => createDemoRepository({ storage, referenceDate: now, now: () => now });
const empty = (): PrivateState => ({ preferences: structuredClone(DEFAULT_PREFERENCES), opportunities: [], tasks: [], events: [], companyNotes: [], jobPreferences: [] });
describe('versioned JSON backup transfer', () => {
  it('round trips complete tracker state and detects duplicates before importing', async () => {
    const repo = make(), before = await repo.getSnapshot(), backup = await repo.exportBackup();
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
    const preview = previewBackup(JSON.stringify(backup), before.opportunities);
    expect(preview.duplicateCount).toBe(12); expect(preview.taskCount).toBe(9);
    expect(await repo.importBackup(backup)).toEqual({ imported: 0, skipped: 12 });
    expect((await repo.getSnapshot()).events).toHaveLength(before.events.length);
  });
  it('remaps all owners and parent-child IDs and rejects privilege-shaped extra fields', async () => {
    const backup = await make().exportBackup();
    const hostile = JSON.parse(JSON.stringify(backup)) as Backup & { role: string }; hostile.role = 'admin';
    hostile.opportunities.forEach(o => { o.userId = 'victim'; }); hostile.tasks.forEach(t => { t.userId = 'victim'; });
    let counter = 0; const merged = mergeBackup(empty(), hostile, 'authenticated-owner', () => `new-${++counter}`);
    expect(merged.result.imported).toBe(12); expect(merged.state.opportunities.every(o => o.userId === 'authenticated-owner')).toBe(true);
    expect(merged.state.tasks.every(t => t.userId === 'authenticated-owner' && merged.state.opportunities.some(o => o.id === t.opportunityId))).toBe(true);
    expect(merged.state.events.every(e => e.userId === 'authenticated-owner' && e.provenance === 'import')).toBe(true);
    expect('role' in parseBackup(JSON.stringify(hostile))).toBe(false);
    expect(merged.state.opportunities.some(o => backup.opportunities.some(original => original.id === o.id))).toBe(false);
  });
  it('rejects unknown versions, malformed dates, orphan records, oversized files, and unsafe links', async () => {
    const backup = await make().exportBackup();
    expect(() => parseBackup(JSON.stringify({ ...backup, version: 2 }))).toThrow('Invalid backup');
    backup.opportunities[0].deadline = '2026-02-30'; expect(backupSchema.safeParse(backup).success).toBe(false); backup.opportunities[0].deadline = null;
    backup.tasks[0].opportunityId = 'someone-elses-opportunity'; expect(backupSchema.safeParse(backup).success).toBe(false);
    expect(() => parseBackup(' '.repeat(2_000_001))).toThrow('2 MB');
    const fresh = await make().exportBackup(); fresh.opportunities[0].postingUrl = 'javascript:alert(1)'; expect(backupSchema.safeParse(fresh).success).toBe(false);
  });
  it('keeps separate roles and requisition URLs at the same employer', () => {
    const first = manualOpportunity({ company: 'An Employer', title: 'Analyst', postingUrl: 'https://example.com/jobs/one' }, 'owner', now);
    const second = manualOpportunity({ company: 'An Employer', title: 'Analyst', postingUrl: 'https://example.com/jobs/two' }, 'owner', now);
    const backup: Backup = { version: 1, exportedAt: now.toISOString(), ...empty(), opportunities: [first, second] };
    expect(mergeBackup(empty(), backup, 'owner').state.opportunities).toHaveLength(2);
  });
  it('rejects inverted salary, experience, and timing ranges in imported snapshots', async () => {
    const backup = await make().exportBackup(), job = backup.opportunities[1].snapshot!;
    job.salary[0].min = 200_000; job.salary[0].max = 100_000; expect(backupSchema.safeParse(backup).success).toBe(false);
    job.salary[0].max = 250_000; job.experience.minYears = 5; job.experience.maxYears = 1; expect(backupSchema.safeParse(backup).success).toBe(false);
    job.experience.maxYears = 6; job.timing.graduationStart = '2027-01-01'; job.timing.graduationEnd = '2026-12-31'; expect(backupSchema.safeParse(backup).success).toBe(false);
    job.timing.graduationEnd = '2027-12-31'; job.timing.earliestStart = '2027-01-01'; job.timing.latestStart = '2026-12-31'; expect(backupSchema.safeParse(backup).success).toBe(false);
  });
});
describe('spreadsheet-safe CSV', () => {
  it('quotes text, newlines, commas and formulas safely', () => {
    const opportunity = manualOpportunity({ company: '=IMPORTXML("evil")', title: 'Analyst, insights', notes: 'Line one\nLine "two"' }, 'owner', now);
    const csv = opportunitiesCsv([opportunity]);
    expect(csv).toContain("\"'=IMPORTXML(");
    const parsed = parseCsv(csv, 'owner', now); expect(parsed.errors).toEqual([]); expect(parsed.opportunities[0].title).toBe('Analyst, insights'); expect(parsed.opportunities[0].notes).toBe('Line one\nLine "two"');
    opportunity.company = '\t+cmd'; expect(opportunitiesCsv([opportunity])).toContain("'\t+cmd");
  });
  it('reports per-row required, date, status, and URL errors without discarding valid rows', () => {
    const csv = 'company,title,stage,application_date,url\nGood,Analyst,Applied,2026-10-01,https://example.com\nMissing,,Saved,,\nWrong,Analyst,Imaginary,,\nUnsafe,Analyst,Saved,,javascript:evil\nDate,Analyst,Applied,2026-02-30,';
    const preview = parseCsv(csv, 'owner', now);
    expect(preview.opportunities).toHaveLength(1); expect(preview.errors.map(e => e.row)).toEqual([3, 4, 5, 6]);
    expect(preview.opportunities[0].applicationDate).toBe('2026-10-01');
  });
  it('creates explicit optional next steps and warns about duplicate rows', () => {
    const csv = 'company,title,next_action,next_action_date\nExample,Analyst,Review notes,2026-10-23\nExample,Analyst,,';
    const preview = parseCsv(csv, 'owner', now); expect(preview.errors).toEqual([]); expect(preview.warnings).toHaveLength(1); expect(preview.tasks).toHaveLength(1);
    expect(csvBackup(preview, now).events).toHaveLength(2);
  });
  it('retains demo provenance in JSON and CSV including manual demo records', async () => {
    const repo = make(), backup = await repo.exportBackup(); expect(backup.sourceMode).toBe('demo');
    const manual = manualOpportunity({ company: 'Fictional manual', title: 'Analyst' }, 'demo-user', now);
    const csv = opportunitiesCsv([manual]), preview = parseCsv(csv, 'new-owner', now);
    expect(preview.containsDemoData).toBe(true); expect(csvBackup(preview, now).sourceMode).toBe('demo');
    expect(parseBackup(JSON.stringify(csvBackup(preview, now))).sourceMode).toBe('demo');
    expect(preview.warnings.join(' ')).toContain('demo mode');
    expect(parseBackup(JSON.stringify({ ...backup, sourceMode: undefined })).sourceMode).toBeUndefined();
  });
  it('rejects malformed CSV and duplicate headers', () => {
    expect(parseCsv('company,title\n"bad,Analyst').errors[0].message).toContain('unclosed');
    expect(parseCsv('company,title,title\nA,B,C').errors[0].message).toContain('unique');
    expect(parseCsv('not,headers\nA,B').errors[0].message).toContain('requires');
  });
});
describe('persistent demo repository', () => {
  it('uses fictional deterministic fixtures and persists edits plus the reference date', async () => {
    expect(createDemoSnapshot(now)).toEqual(createDemoSnapshot(now));
    const storage = new MemoryStorage(), first = make(storage), initial = await first.getSnapshot();
    expect(initial.jobs).toHaveLength(30); expect(initial.opportunities).toHaveLength(12); expect(initial.jobs.every(j => j.isDemo && j.applicationUrl === null)).toBe(true);
    await first.saveOpportunity({ ...initial.opportunities[0], notes: 'Persist me' });
    const second = createDemoRepository({ storage, referenceDate: new Date('2027-01-01T00:00:00Z') });
    const restored = await second.getSnapshot(); expect(restored.opportunities[0].notes).toBe('Persist me'); expect(restored.jobs[0].timing.deadline).toBe(initial.jobs[0].timing.deadline);
  });
  it('changes status atomically and idempotently without automatic suggested tasks', async () => {
    const repo = make(), initial = await repo.getSnapshot(), id = initial.opportunities[0].id;
    await Promise.all([repo.changeStage(id, 'Applied', { idempotencyKey: 'once' }), repo.changeStage(id, 'Applied', { idempotencyKey: 'once' })]);
    const saved = await repo.getSnapshot(); expect(saved.opportunities[0].stage).toBe('Applied'); expect(saved.opportunities[0].applicationDate).toBe('2026-10-21');
    expect(saved.events.filter(e => e.idempotencyKey === 'once')).toHaveLength(1); expect(saved.tasks).toHaveLength(initial.tasks.length);
  });
  it('does not infer submission from clicking an application link or moving directly to Interviewing', async () => {
    const repo = make(), initial = await repo.getSnapshot(), id = initial.opportunities[0].id;
    await repo.recordApplicationOpened(id, 'opened'); expect((await repo.getSnapshot()).opportunities[0].stage).toBe('Saved');
    await repo.changeStage(id, 'Interviewing', { idempotencyKey: 'interview' }); expect((await repo.getSnapshot()).opportunities[0].applicationDate).toBeNull();
  });
  it('allows explicit application-date corrections and rejects stage edits through generic save', async () => {
    const repo = make(), initial = await repo.getSnapshot();
    await expect(repo.saveOpportunity({ ...initial.opportunities[0], stage: 'Applied' })).rejects.toThrow('stage action');
    await repo.changeStage(initial.opportunities[1].id, 'Applied', { applicationDate: '2026-10-01', idempotencyKey: 'date-fix' });
    const result = await repo.getSnapshot(); expect(result.opportunities[1].applicationDate).toBe('2026-10-01'); expect(result.events.find(e => e.idempotencyKey === 'date-fix')?.type).toBe('application_date_corrected');
  });
  it('audits generic date edits and rejects a retry key reused for another target', async () => {
    const repo = make(), initial = await repo.getSnapshot();
    await repo.saveOpportunity({ ...initial.opportunities[1], applicationDate: '2026-10-02' });
    const updated = await repo.getSnapshot(); expect(updated.events.at(-1)?.type).toBe('application_date_corrected');
    await repo.changeStage(initial.opportunities[0].id, 'Applied', { idempotencyKey: 'target-key' });
    await expect(repo.changeStage(initial.opportunities[7].id, 'Applied', { idempotencyKey: 'target-key' })).rejects.toThrow('different action');
    await expect(repo.recordApplicationOpened(initial.opportunities[0].id, 'target-key')).rejects.toThrow('different action');
  });
  it('records task completion, supports snooze, and deletes related records', async () => {
    const repo = make(), initial = await repo.getSnapshot(), task = createTask(initial.opportunities[0].id, 'forged-owner', 'My follow-up', now);
    await repo.saveTask({ ...task, status: 'done' }); let snapshot = await repo.getSnapshot(); expect(snapshot.tasks.find(t => t.id === task.id)?.completedAt).toBe(now.toISOString()); expect(snapshot.tasks.find(t => t.id === task.id)?.userId).toBe('demo-user');
    await repo.saveTask({ ...task, status: 'snoozed', snoozedUntil: '2026-10-25' }); snapshot = await repo.getSnapshot(); expect(snapshot.tasks.find(t => t.id === task.id)?.completedAt).toBeNull();
    await repo.deleteOpportunity(initial.opportunities[0].id); snapshot = await repo.getSnapshot(); expect(snapshot.tasks.some(t => t.opportunityId === initial.opportunities[0].id)).toBe(false); expect(snapshot.events.some(e => e.opportunityId === initial.opportunities[0].id)).toBe(false);
    await expect(repo.saveTask(task)).rejects.toThrow('no longer exists');
  });
  it('reports quota failures and retains the previous persisted data', async () => {
    const storage = new MemoryStorage(), repo = make(storage), initial = await repo.getSnapshot(); storage.fail = true;
    await expect(repo.saveOpportunity({ ...initial.opportunities[0], notes: 'Should not be saved' })).rejects.toThrow('storage');
    expect((await repo.getSnapshot()).opportunities[0].notes).toBe(initial.opportunities[0].notes);
  });
  it('surfaces corrupt storage honestly and resets only the demo namespace', async () => {
    const storage = new MemoryStorage(); storage.setItem(DEMO_STORAGE_KEY, '{corrupt'); storage.setItem('unrelated', 'keep'); const repo = make(storage);
    await expect(repo.getSnapshot()).rejects.toThrow('could not be read'); await repo.resetDemo!(); expect((await repo.getSnapshot()).jobs).toHaveLength(30); expect(storage.getItem('unrelated')).toBe('keep');
  });
});
