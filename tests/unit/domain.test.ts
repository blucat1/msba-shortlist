import { describe, expect, it } from 'vitest';
import { computeInsights } from '../../src/domain/analytics';
import { addDays, dateOnlyInTimezone, freshness, isDateOnly, safeUrl } from '../../src/domain/dates';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { rankJob, rankJobs } from '../../src/domain/ranking';
import { canonicalSkill } from '../../src/domain/skills';
import { dailyQueue, nextTask } from '../../src/domain/tasks';
import { DEFAULT_PREFERENCES } from '../../src/domain/types';

const now = new Date('2026-10-21T19:00:00.000Z');
const fixture = () => createDemoSnapshot(now);
describe('fictional fixture integrity', () => {
  it('keeps all salary bands ordered and their displayed text consistent with values', () => {
    for (const job of fixture().jobs) for (const band of job.salary) {
      expect(band.min, job.title).not.toBeNull(); expect(band.max, job.title).not.toBeNull();
      expect(band.max!, job.title).toBeGreaterThanOrEqual(band.min!);
      expect(band.sourceText).toContain(`$${band.min!.toLocaleString('en-US')}–$${band.max!.toLocaleString('en-US')}`);
    }
  });
});
describe('date semantics and external links', () => {
  it('keeps date-only arithmetic stable over daylight saving transitions', () => {
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(dateOnlyInTimezone(new Date('2026-10-21T02:00:00Z'), 'America/Los_Angeles')).toBe('2026-10-20');
    expect(dateOnlyInTimezone(new Date('2026-10-21T02:00:00Z'), 'Asia/Tokyo')).toBe('2026-10-21');
    expect(isDateOnly('2026-02-29')).toBe(false); expect(isDateOnly('2028-02-29')).toBe(true);
  });
  it('marks 36-hour sources stale and 72-hour sources expired', () => {
    expect(freshness('2026-10-20T06:59:00Z', now)).toBe('stale');
    expect(freshness('2026-10-18T18:59:00Z', now)).toBe('expired');
    expect(freshness(null, now)).toBe('expired');
  });
  it('rejects executable URLs and credential-bearing URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull(); expect(safeUrl('data:text/html,evil')).toBeNull();
    expect(safeUrl('https://name:secret@example.com')).toBeNull();
    expect(safeUrl('https://example.com/path')).toBe('https://example.com/path');
  });
});
describe('deterministic recommendation evidence', () => {
  it('leaves unknown user preferences inactive and does not invent a fit claim', () => {
    const match = rankJob(fixture().jobs[0], structuredClone(DEFAULT_PREFERENCES), now);
    expect(match.score).toBe(50); expect(match.coverage).toBe(0); expect(match.label).toBe('Check details');
  });
  it('uses neutral source unknowns while reporting evidence coverage separately', () => {
    const job = fixture().jobs[0]; job.experience.minYears = null;
    const preferences = { ...DEFAULT_PREFERENCES, yearsExperience: 0 };
    const match = rankJob(job, preferences, now);
    expect(match.score).toBe(50); expect(match.coverage).toBe(0); expect(match.missing).toContain('experience');
  });
  it('calls 2 years a stretch for a user with no experience', () => {
    const job = fixture().jobs[0]; job.experience.minYears = 2;
    const match = rankJob(job, { ...DEFAULT_PREFERENCES, yearsExperience: 0 }, now);
    expect(match.label).toBe('Experience stretch'); expect(match.reasons[0].text).toContain('(2 more)');
  });
  it('ranks a selected primary interest above a secondary interest', () => {
    const snapshot = fixture(), primary = snapshot.jobs[0], secondary = snapshot.jobs[2];
    const preferences = { ...DEFAULT_PREFERENCES, roleFamilies: ['business-analytics', 'data-science'] as const, primaryRoleFamilies: ['data-science'] as const };
    const mutable = { ...preferences, roleFamilies: [...preferences.roleFamilies], primaryRoleFamilies: [...preferences.primaryRoleFamilies] };
    expect(rankJob(secondary, mutable, now).score).toBeGreaterThan(rankJob(primary, mutable, now).score);
    expect(rankJob(secondary, mutable, now).reasons[0].text).toContain('primary');
  });
  it('keeps omitted skills neutral and preferred skills out of the required-skill score', () => {
    const job = fixture().jobs[0]; job.requiredSkills = ['SQL', 'Python']; job.preferredSkills = ['Tableau'];
    const match = rankJob(job, { ...DEFAULT_PREFERENCES, skills: ['Tableau'] }, now);
    expect(match.score).toBe(50); expect(match.caveats.join(' ')).toContain('may be incomplete');
    expect(match.reasons.some(r => r.code === 'preferred_skills')).toBe(true);
  });
  it('normalizes exact skill aliases without substring matches for short names', () => {
    const job = fixture().jobs[0]; job.requiredSkills = ['SQL', 'Power BI', 'Experimentation'];
    expect(rankJob(job, { ...DEFAULT_PREFERENCES, skills: ['PostgreSQL', 'PowerBI', 'A/B testing'] }, now).score).toBe(100);
    expect(canonicalSkill('R')).not.toBe(canonicalSkill('Research')); expect(canonicalSkill('C')).not.toBe(canonicalSkill('Communication'));
  });
  it('distinguishes a salary minimum match from range overlap and incompatible pay', () => {
    const job = fixture().jobs[1], preferences = { ...DEFAULT_PREFERENCES, desiredSalary: 90_000 };
    job.salary[0].min = 100_000; expect(rankJob(job, preferences, now).score).toBe(100);
    job.salary[0].min = 80_000; job.salary[0].max = 100_000;
    const overlap = rankJob(job, preferences, now); expect(overlap.score).toBe(65); expect(overlap.reasons[0].text).toContain('not guaranteed');
    job.salary[0].period = 'hour'; expect(rankJob(job, preferences, now).coverage).toBe(0);
    job.salary[0].period = 'year'; job.salary[0].currency = 'CAD'; expect(rankJob(job, preferences, now).coverage).toBe(0);
    job.salary[0].currency = 'USD'; job.salary[0].compensationType = 'total'; expect(rankJob(job, preferences, now).coverage).toBe(0);
  });
  it('does not award strong alignment with an explicit timing conflict', () => {
    const job = fixture().jobs[0]; job.timing.latestStart = '2026-10-01';
    const result = rankJob(job, { ...DEFAULT_PREFERENCES, roleFamilies: ['business-analytics'], earliestStart: '2027-01-01' }, now);
    expect(result.label).not.toBe('Strong alignment'); expect(result.caveats.join(' ')).toContain('timing conflicts');
  });
  it('filters tracked, dismissed, uncertain, senior, and expired records by default', () => {
    const snapshot = fixture(); const options = { now, trackedJobIds: snapshot.opportunities.map(o => o.catalogJobId!), dismissedJobIds: [snapshot.jobs[14].id] };
    const results = rankJobs(snapshot.jobs, snapshot.preferences, options);
    expect(results.some(r => options.trackedJobIds.includes(r.job.id))).toBe(false);
    expect(results.some(r => r.job.id === snapshot.jobs[14].id)).toBe(false);
    expect(results.some(r => r.job.classification.scope === 'needs-details' || r.job.classification.seniority === 'senior')).toBe(false);
    expect(results.some(r => r.job.id === snapshot.jobs[25].id)).toBe(false);
    expect(rankJobs(snapshot.jobs, snapshot.preferences, { ...options, experienceView: 'all', includeTracked: true, includeNeedsDetails: true, includeStale: true })).toHaveLength(30);
  });
  it('uses stable evidence/freshness/discovery tie breakers rather than source edits', () => {
    const a = fixture().jobs[0], b = structuredClone(a); b.id = 'other'; b.firstSeenAt = '2026-10-01T00:00:00Z'; b.sourceUpdatedAt = now.toISOString();
    const first = rankJobs([b, a], DEFAULT_PREFERENCES, { now });
    expect(first.map(j => j.job.id)).toEqual(rankJobs([a, b], DEFAULT_PREFERENCES, { now }).map(j => j.job.id)); expect(first[0].job.id).toBe(a.id);
  });
});
describe('Today queue', () => {
  it('orders real commitments and overdue user tasks ahead of deadlines and upcoming work', () => {
    const snapshot = fixture(), queue = dailyQueue(snapshot, now);
    expect(queue[0].title).toBe('Review application status');
    expect(queue.find(q => q.kind === 'deadline')?.reason).toBe('Deadline in 2 days');
    expect(queue.map(q => q.tier)).toEqual([...queue.map(q => q.tier)].sort((a, b) => a - b));
  });
  it('hides completed, snoozed, and terminal application tasks', () => {
    const queue = dailyQueue(fixture(), now);
    expect(queue.some(q => ['demo-task-7', 'demo-task-8', 'demo-task-9'].includes(q.id))).toBe(false);
    expect(nextTask(fixture().tasks, 'demo-opportunity-7', '2026-10-21')).toBeNull();
  });
  it('retains interview commitments even when the source posting closes', () => {
    const snapshot = fixture(); snapshot.opportunities[2].snapshot!.availability = 'closed';
    expect(dailyQueue(snapshot, now).some(q => q.id === 'demo-task-1')).toBe(true);
  });
  it('uses timezone date-only deadlines and exact time overdue commitments distinctly', () => {
    const snapshot = fixture(); snapshot.tasks = [structuredClone(snapshot.tasks[3])];
    const task = snapshot.tasks[0]; task.dueDate = '2026-10-21';
    expect(dailyQueue(snapshot, now).find(q => q.taskId === task.id)?.reason).toBe('Due today');
    task.dueAt = '2026-10-21T18:00:00Z';
    expect(dailyQueue(snapshot, now).find(q => q.taskId === task.id)?.reason).toBe('Overdue today');
    task.dueAt = null; task.dueDate = '2026-10-20';
    expect(dailyQueue(snapshot, new Date('2026-10-21T02:00:00Z')).find(q => q.taskId === task.id)?.reason).toBe('Due today');
  });
  it('requires verified source deadlines and never manufactures review tasks', () => {
    const snapshot = fixture(); snapshot.tasks = []; snapshot.opportunities[0].snapshot!.timing.deadlineVerified = false;
    expect(dailyQueue(snapshot, now).some(q => q.opportunityId === snapshot.opportunities[0].id)).toBe(false);
    expect(snapshot.tasks).toHaveLength(0);
  });
});
describe('historical analytics', () => {
  it('counts actual interviews after rejection and keeps assessment separate', () => {
    const snapshot = fixture(), result = computeInsights(snapshot, { period: 90, now });
    expect(result.applications).toBe(8); expect(result.interviewConversion).toEqual({ numerator: 4, denominator: 8, rate: .5 });
    expect(result.offerConversion.numerator).toBe(1); expect(result.unknownApplicationDates).toBe(1);
    expect(result.pipeline.find(p => p.stage === 'Rejected')?.count).toBe(1);
  });
  it('ignores application-page clicks, including future submitted histories with unknown dates', () => {
    const snapshot = fixture(); snapshot.opportunities = [snapshot.opportunities[0]]; snapshot.events = [{ id: 'open', userId: 'demo-user', opportunityId: snapshot.opportunities[0].id, type: 'application_opened', oldStage: null, newStage: null, occurredAt: now.toISOString(), provenance: 'user', idempotencyKey: 'open' }];
    const result = computeInsights(snapshot, { period: 90, now }); expect(result.applications).toBe(0); expect(result.interviewConversion.rate).toBeNull();
  });
  it('applies maturity only to conversion cohorts and preserves total submission counts', () => {
    const snapshot = fixture(), result = computeInsights(snapshot, { period: 90, matureOnly: true, now });
    expect(result.applications).toBe(8); expect(result.interviewConversion.denominator).toBe(6); expect(result.excludedRecent).toBe(2); expect(result.interviewConversion.numerator).toBe(4);
  });
  it('does not double count multi-tag roles and shows actual denominators', () => {
    const snapshot = fixture(), result = computeInsights(snapshot, { period: 90, now });
    expect(result.byRole.reduce((sum, row) => sum + row.applications, 0)).toBe(result.interviewConversion.denominator);
    expect(result.weeklyApplications.reduce((sum, row) => sum + row.count, 0)).toBe(result.applications);
    expect(result.sampleWarning).toContain('Small sample');
  });
  it('handles empty denominators without inventing zero-percent success', () => {
    const snapshot = fixture(); snapshot.opportunities = []; snapshot.tasks = []; snapshot.events = [];
    const result = computeInsights(snapshot, { period: 'all', now });
    expect(result.interviewConversion.rate).toBeNull(); expect(result.offerConversion.rate).toBeNull(); expect(result.taskCompletion.rate).toBeNull();
  });
  it('does not count a future-dated history entry as an actual past interview', () => {
    const snapshot = fixture(); snapshot.events.filter(e => e.newStage === 'Interviewing').forEach(e => { e.occurredAt = '2027-01-01T00:00:00Z'; });
    expect(computeInsights(snapshot, { period: 90, now }).interviewConversion.numerator).toBe(0);
  });
});
