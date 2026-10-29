import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { groupListingsByCompany, groupSimilarListings } from '../../src/domain/grouping';
import { companyKey } from '../../src/domain/records';
import { companyBranding } from '../../src/domain/company-branding';
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

describe('hiring-company discovery groups', () => {
  function row(company: string, id: string, employerId = 'recorded-employer') {
    return { job: { ...original(), company, id, employerId, title: `Role ${id}` }, rank: id };
  }

  it('preserves first company appearance and ranked group order within each company', () => {
    const rows = [row('Company B', 'b1'), row('Company A', 'a1'), row('Company B', 'b2'), row('Company C', 'c1'), row('Company A', 'a2')];
    const groups = groupSimilarListings(rows), before = structuredClone(groups);
    const companies = groupListingsByCompany(groups);
    expect(companies.map(company => company.company)).toEqual(['Company B', 'Company A', 'Company C']);
    expect(companies.map(company => company.groups.map(group => group.key))).toEqual([['b1', 'b2'], ['a1', 'a2'], ['c1']]);
    expect(companies[0].groups[1]).toBe(groups[2]);
    expect(groups).toEqual(before);
  });

  it('counts all original listing variants and retains their identities and application links', () => {
    const equivalent = pair(job => { job.locations = [{ label: 'Boston', country: 'US', region: 'MA', city: 'Boston' }]; job.applicationUrl = 'https://example.com/second-application'; });
    const different = { ...equivalent[0], job: { ...equivalent[0].job, id: 'different-role', title: 'Another Role' } };
    const groups = groupSimilarListings([...equivalent, different]);
    const companies = groupListingsByCompany(groups);
    expect(companies).toHaveLength(1);
    expect(companies[0].listingCount).toBe(3);
    expect(companies[0].groups).toHaveLength(2);
    expect(companies[0].groups[0].representative).toBe(equivalent[0]);
    expect(companies[0].groups[0].variants[0]).toBe(equivalent[1]);
    expect(companies[0].groups[0].variants[0].job.applicationUrl).toBe('https://example.com/second-application');
    expect(companies[0].groups.flatMap(group => [group.representative, ...group.variants]).map(item => item.job.id)).toEqual([equivalent[0].job.id, 'another-requisition', 'different-role']);
  });

  it('uses stable name normalization for case, whitespace and Unicode compatibility', () => {
    const groups = groupSimilarListings([row('  Acme   Data  ', 'one'), row('ＡＣＭＥ\u00a0ＤＡＴＡ', 'two', 'second-board')]);
    const companies = groupListingsByCompany(groups);
    expect(companies).toHaveLength(1);
    expect(companies[0].key).toBe(companyKey('Acme Data'));
    expect(companies[0].company).toBe('Acme   Data');
    expect(companies[0].listingCount).toBe(2);
  });

  it('groups Jobicy roles by actual hiring company alongside direct employer listings', () => {
    const marketA = row('Acme Data', 'market-a', 'jobicy');
    marketA.job.publisher = { name: 'Jobicy', url: 'https://jobicy.com/jobs/one', kind: 'aggregator' };
    marketA.job.employerGroupingKey = 'market-company:acme';
    const marketB = row('Other Employer', 'market-b', 'jobicy');
    marketB.job.publisher = marketA.job.publisher;
    marketB.job.employerGroupingKey = 'market-company:other';
    const direct = row('ACME DATA', 'direct', 'acme');
    const companies = groupListingsByCompany(groupSimilarListings([marketA, marketB, direct]));
    expect(companies.map(company => company.company)).toEqual(['Acme Data', 'Other Employer']);
    expect(companies[0].groups.map(group => group.key)).toEqual(['market-a', 'direct']);
    expect(companies.map(company => company.listingCount)).toEqual([2, 1]);
    expect(marketA.job.employerId).toBe('jobicy');
    expect(marketA.job.employerGroupingKey).toBe('market-company:acme');
  });

  it('keeps differently named subsidiaries and meaningful name punctuation separate', () => {
    const groups = groupSimilarListings([row('Acme Bank', 'bank'), row('Acme Wealth', 'wealth'), row('Acme, Inc.', 'punctuated'), row('Acme Inc', 'plain')]);
    const companies = groupListingsByCompany(groups);
    expect(companies).toHaveLength(4);
    expect(companies.map(company => company.company)).toEqual(['Acme Bank', 'Acme Wealth', 'Acme, Inc.', 'Acme Inc']);
  });

  it('does not use a shared logo as permission to merge different recorded company names', () => {
    const names = ['ERG (Eastern Research Group)', 'ERG — Eastern Research Group'];
    const firstBrand = companyBranding(names[0]), secondBrand = companyBranding(names[1]);
    expect(firstBrand?.logoPath).toBeTruthy();
    expect(firstBrand?.logoPath).toBe(secondBrand?.logoPath);
    const companies = groupListingsByCompany(groupSimilarListings(names.map((name, index) => row(name, `company-${index}`, 'same-parent'))));
    expect(companies).toHaveLength(2);
    expect(companies.map(company => company.company)).toEqual(names);
  });

  it('does not infer a shared company from missing names and accepts an empty result', () => {
    const companies = groupListingsByCompany(groupSimilarListings([row('', 'unknown-one'), row('   ', 'unknown-two')]));
    expect(companies).toHaveLength(2);
    expect(new Set(companies.map(company => company.key)).size).toBe(2);
    expect(companies.map(company => company.listingCount)).toEqual([1, 1]);
    expect(groupListingsByCompany([])).toEqual([]);
  });
});
