import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { groupSimilarListings } from '../../src/domain/grouping';
import type { Job } from '../../src/domain/types';
import { extractEligibility } from '../../src/ingestion/eligibility';

const original = () => createDemoSnapshot(new Date('2026-10-22T07:00:00Z')).jobs[0];
function pair(change: (job: Job) => void = () => {}) {
  const first = original(), second = structuredClone(first); second.id = 'another-requisition'; second.externalId = 'another'; change(second);
  return [{ job: first, rank: 1 }, { job: second, rank: 2 }];
}
describe('conservative listing variant groups', () => {
  it('groups exact requirements across location/pay variants while retaining every original identity and ranking', () => {
    const rows = pair(job => { job.locations = [{ label: 'Boston, MA', country: 'US', city: 'Boston', region: 'MA' }]; job.salary = []; job.applicationUrl = 'https://example.com/another-requisition'; });
    const groups = groupSimilarListings(rows);
    expect(groups).toHaveLength(1); expect(groups[0].listingCount).toBe(2);
    expect(groups[0].representative).toBe(rows[0]); expect(groups[0].variants).toEqual([rows[1]]);
    expect(groups[0].variants[0].job.applicationUrl).toBe('https://example.com/another-requisition');
    expect(rows.map(row => row.job.id)).toEqual([rows[0].job.id, 'another-requisition']);
  });
  it('preserves first ranked group order without changing the input', () => {
    const rows = pair(), distinct = { job: { ...original(), id: 'different', title: 'Different Analyst' }, rank: 0 };
    const groups = groupSimilarListings([rows[0], distinct, rows[1]]);
    expect(groups.map(group => group.key)).toEqual([rows[0].job.id, 'different']);
    expect(groups.flatMap(group => [group.representative, ...group.variants]).map(row => row.job.id)).toHaveLength(3);
  });
  it.each([
    ['company identity', (job: Job) => { job.employerId = 'other-company'; }],
    ['company name', (job: Job) => { job.company = 'Other Company'; }],
    ['actual market company', (job: Job) => { job.employerGroupingKey = 'market-company:different'; }],
    ['title', (job: Job) => { job.title += ' II'; }],
    ['unparsed source summary', (job: Job) => { job.summary += ' US citizenship required.'; }],
    ['experience minimum', (job: Job) => { job.experience.minYears = 3; }],
    ['preferred experience', (job: Job) => { job.experience.preferredYears = 5; }],
    ['required skills', (job: Job) => { job.requiredSkills = ['Rust']; }],
    ['start date', (job: Job) => { job.timing.latestStart = '2027-05-01'; }],
    ['application deadline', (job: Job) => { job.timing.deadline = '2026-11-01'; job.timing.deadlineVerified = true; }],
    ['degree requirements', (job: Job) => { job.eligibility = extractEligibility('', 'Required: Master’s degree in finance.').eligibility; }],
    ['source conflict', (job: Job) => { job.sourceReview = { status: 'employer-conflict', reason: 'Employer excludes new graduates.', evidenceUrl: 'https://example.com/careers', checkedAt: '2026-10-22T07:00:00Z' }; }],
  ])('keeps a different %s in its own group', (_name, change) => {
    expect(groupSimilarListings(pair(change))).toHaveLength(2);
  });
  it('normalizes whitespace/case only and keeps meaningful punctuation in titles', () => {
    expect(groupSimilarListings(pair(job => { job.title = `  ${job.title.toUpperCase()}  `; job.company = ` ${job.company.toUpperCase()} `; }))).toHaveLength(1);
    expect(groupSimilarListings(pair(job => { job.title = `${job.title} (2028)`; }))).toHaveLength(2);
  });
  it('does not collapse requirements with different source evidence even when extracted date bounds agree', () => {
    expect(groupSimilarListings(pair(job => { job.timing.evidence = ['Required, firm start date.']; }))).toHaveLength(2);
  });
});
