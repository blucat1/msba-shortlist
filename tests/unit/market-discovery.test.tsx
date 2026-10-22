import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceAttribution } from '../../src/components/SourceAttribution';
import { rankJobs } from '../../src/domain/ranking';
import { DEFAULT_PREFERENCES, type JobSource } from '../../src/domain/types';
import { normalizePosting } from '../../src/ingestion/normalize';
import { sourceSchema } from '../../src/ingestion/registry';

const now = '2026-10-22T05:00:00.000Z';
const source: JobSource = {
  id: 'jobicy-usa', employerId: 'jobicy-market', company: 'Jobicy remote market', provider: 'jobicy', board: 'usa',
  careersUrl: 'https://jobicy.com/remote-jobs', state: 'verified', enabled: true, verifiedAt: now,
  evidenceUrl: 'https://jobicy.com/jobs-rss-feed', usageReview: 'Verified public free API with required Jobicy attribution.',
  lastSuccessfulCheck: now, lastAttemptAt: now, rawCount: 1, relevantCount: 1, error: null,
};
const makeJob = () => normalizePosting({
  externalId: '1234', title: 'Financial Analyst (Entry-Level)', companyName: 'Example Employer',
  postingUrl: 'https://jobicy.com/jobs/1234-financial-analyst', applicationUrl: 'https://jobicy.com/jobs/1234-financial-analyst',
  description: 'We are hiring recent university graduates. No prior professional experience required. Requirements\nSQL knowledge.',
  employment: 'Full-Time', workMode: 'remote', locations: [{ label: 'USA', country: 'US', city: null, region: null }],
  sourcePostedAt: null, sourceUpdatedAt: null, sourcePublishedAt: now, salary: [],
}, source, now);

describe('cross-employer discovery boundaries', () => {
  it('retains the real employer name while keeping publisher provenance and its canonical application link', () => {
    const job = makeJob();
    expect(job.company).toBe('Example Employer'); expect(job.employerId).toBe(source.employerId);
    expect(job.publisher).toEqual({ name: 'Jobicy', kind: 'aggregator', url: job.postingUrl });
    expect(job.applicationUrl).toBe(job.postingUrl); expect(job.sourcePostedAt).toBeNull(); expect(job.sourcePublishedAt).toBe(now);
    expect(rankJobs([job], DEFAULT_PREFERENCES, { now: new Date(now) })).toHaveLength(1);
  });
  it('withholds an aggregator listing whose status becomes unknown without deleting a saved snapshot', () => {
    const job = makeJob();
    const savedSnapshot = structuredClone(job);
    job.availability = 'availability_unconfirmed';
    expect(rankJobs([job], DEFAULT_PREFERENCES, { now: new Date(now), experienceView: 'all', includeStale: true, includeNeedsDetails: true })).toEqual([]);
    expect(savedSnapshot.title).toBe(job.title); expect(savedSnapshot.availability).toBe('open');
  });
  it('does not accept a different market identity or EU alias for the verified free source', () => {
    expect(sourceSchema.safeParse(source).success).toBe(true);
    expect(sourceSchema.safeParse({ ...source, board: 'paid-all-jobs' }).success).toBe(false);
    expect(sourceSchema.safeParse({ ...source, region: 'eu' }).success).toBe(false);
  });
  it('renders visible publisher credit on the canonical source link', () => {
    render(<SourceAttribution job={makeJob()} />);
    const credit = screen.getByRole('link', { name: /Source: Jobicy/ });
    expect(credit).toHaveAttribute('href', 'https://jobicy.com/jobs/1234-financial-analyst');
    expect(credit).toHaveAttribute('rel', 'noopener noreferrer');
  });
  it('does not render an unsafe source URL from a malformed imported snapshot', () => {
    const job = makeJob(); job.publisher!.url = 'javascript:alert(1)';
    const { container } = render(<SourceAttribution job={job} />); expect(container).toBeEmptyDOMElement();
  });
});
