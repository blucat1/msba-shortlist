import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { SourceAttribution } from '../../src/components/SourceAttribution';
import { catalogCompanyKey, opportunityFromJob } from '../../src/domain/records';
import { rankJobs } from '../../src/domain/ranking';
import { parseBackup } from '../../src/domain/transfer';
import { DEFAULT_PREFERENCES, type JobSource } from '../../src/domain/types';
import { OpportunityForm } from '../../src/features/OpportunityForm';
import { normalizePosting } from '../../src/ingestion/normalize';
import { sourceSchema } from '../../src/ingestion/registry';
import { createDemoRepository } from '../../src/repositories/demo';

const now = '2026-10-22T05:00:00.000Z';
const source: JobSource = {
  id: 'jobicy-usa', employerId: 'jobicy-market', company: 'Jobicy remote market', provider: 'jobicy', board: 'usa',
  careersUrl: 'https://jobicy.com/remote-jobs', state: 'verified', enabled: true, verifiedAt: now,
  evidenceUrl: 'https://jobicy.com/jobs-rss-feed', usageReview: 'Verified public free API with required Jobicy attribution.',
  lastSuccessfulCheck: now, lastAttemptAt: now, rawCount: 1, relevantCount: 1, error: null,
};
const makeJob = (companyName = 'Example Employer', externalId = '1234') => normalizePosting({
  externalId, title: 'Financial Analyst (Entry-Level)', companyName,
  postingUrl: `https://jobicy.com/jobs/${externalId}-financial-analyst`, applicationUrl: `https://jobicy.com/jobs/${externalId}-financial-analyst`,
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
  it('keeps different hiring companies separate despite their shared publisher identity', () => {
    const first = makeJob('Example Employer', '1234'), second = makeJob('Another Employer', '1235');
    expect(first.employerId).toBe(second.employerId);
    const firstSaved = opportunityFromJob(first, 'test-user', new Date(now));
    const secondSaved = opportunityFromJob(second, 'test-user', new Date(now));
    expect(firstSaved.companyKey).not.toBe(secondSaved.companyKey);
    expect(firstSaved.companyKey).toBe(first.employerGroupingKey);
    expect(secondSaved.companyKey).toBe(second.employerGroupingKey);
    expect(firstSaved.companyKey).not.toBe(`employer:${source.employerId}`);
  });
  it('groups separate requisitions under the same normalized actual-company name', () => {
    const first = makeJob('Example Employer', '1234'), second = makeJob('  ＥXAMPLE   EMPLOYER  ', '1235');
    const firstSaved = opportunityFromJob(first, 'test-user', new Date(now));
    const secondSaved = opportunityFromJob(second, 'test-user', new Date(now));
    expect(firstSaved.catalogJobId).not.toBe(secondSaved.catalogJobId);
    expect(firstSaved.companyKey).toMatch(/^market-company:[a-f0-9]{64}$/);
    expect(firstSaved.companyKey).toBe(secondSaved.companyKey);
  });
  it('keeps existing employer-board company keys when no separate grouping identity is supplied', () => {
    const job = makeJob(); delete job.employerGroupingKey; delete job.publisher;
    expect(catalogCompanyKey(job)).toBe(`employer:${source.employerId}`);
    expect(opportunityFromJob(job, 'test-user', new Date(now)).companyKey).toBe(`employer:${source.employerId}`);
  });
  it('preserves company identity and source attribution through save, backup validation and import', async () => {
    const job = makeJob();
    const repository = createDemoRepository({ storage: null, referenceDate: new Date(now), now: () => new Date(now) });
    const saved = await repository.saveOpportunity(opportunityFromJob(job, 'demo-user', new Date(now)));
    expect(saved.snapshot?.publisher).toEqual(job.publisher);
    expect(saved.snapshot?.employerGroupingKey).toBe(job.employerGroupingKey);
    const backup = parseBackup(JSON.stringify(await repository.exportBackup()));
    const exported = backup.opportunities.find(opportunity => opportunity.id === saved.id)!;
    expect(exported.companyKey).toBe(job.employerGroupingKey);
    expect(exported.snapshot?.publisher).toEqual(job.publisher);
    expect(exported.snapshot?.employerGroupingKey).toBe(job.employerGroupingKey);
    const restored = createDemoRepository({ storage: null, referenceDate: new Date(now), now: () => new Date(now) });
    await restored.importBackup(backup);
    const imported = (await restored.getSnapshot()).opportunities.find(opportunity => opportunity.catalogJobId === job.id)!;
    expect(imported.companyKey).toBe(saved.companyKey);
    expect(imported.snapshot?.publisher).toEqual(job.publisher);
    expect(imported.snapshot?.employerGroupingKey).toBe(job.employerGroupingKey);
  });
  it('uses the hiring-company identity when a manually entered URL matches a catalog listing', async () => {
    const user = userEvent.setup(), job = makeJob();
    const repository = createDemoRepository({ storage: null, referenceDate: new Date(now) });
    const snapshot = { ...await repository.getSnapshot(), jobs: [job] }, onClose = vi.fn();
    const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    render(<WorkspaceContext.Provider value={context}><OpportunityForm open onClose={onClose} /></WorkspaceContext.Provider>);
    await user.type(screen.getByRole('textbox', { name: 'Company *' }), job.company);
    await user.type(screen.getByRole('textbox', { name: 'Job title *' }), job.title);
    await user.type(screen.getByRole('textbox', { name: 'Posting link' }), job.postingUrl!);
    await user.click(screen.getByRole('button', { name: 'Add opportunity' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const saved = (await repository.getSnapshot()).opportunities.find(opportunity => opportunity.catalogJobId === job.id)!;
    expect(saved.companyKey).toBe(job.employerGroupingKey);
    expect(saved.snapshot?.publisher).toEqual(job.publisher);
    expect(saved.companyKey).not.toBe(`employer:${source.employerId}`);
  });
});
