import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { EligibilityEvidence } from '../../src/components/EligibilityEvidence';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { DEFAULT_PREFERENCES, type Job } from '../../src/domain/types';
import { Opportunities } from '../../src/features/Opportunities';
import { extractEligibility } from '../../src/ingestion/eligibility';
import { createDemoRepository } from '../../src/repositories/demo';

afterEach(cleanup);
const now = new Date('2026-10-22T07:00:00Z');
const sourceJob = () => ({ ...createDemoSnapshot(now).jobs[0], ...extractEligibility('Graduate Analyst', 'Join the team.') });
describe('visible eligibility evidence', () => {
  it('shows uncertainty beside a role even when no hard conflict was found', async () => {
    render(<EligibilityEvidence profile={DEFAULT_PREFERENCES} job={sourceJob()} />);
    expect(screen.getByText('Requirements need checking')).toBeVisible(); expect(screen.getByText('7 unknown')).toBeVisible();
    await userEvent.click(screen.getByText('Requirements need checking'));
    expect(screen.getByText('Unknown means unverified. Preference overlap does not confirm eligibility.')).toBeVisible();
    expect(screen.getAllByText('Needs checking')).toHaveLength(7);
  });
  it('shows individual conflicts and exact source calendar evidence without an overall eligible verdict', async () => {
    const job = { ...sourceJob(), ...extractEligibility('Graduate Analyst', 'Required graduation date by May 14, 2027.\nProgram starts July 2027.\nApply by October 30, 2026 at 5 pm Pacific.') };
    render(<EligibilityEvidence profile={DEFAULT_PREFERENCES} job={job} full />);
    expect(screen.getByText('Compare all 7 requirements')).toBeVisible();
    await userEvent.click(screen.getByText('Compare all 7 requirements'));
    expect(screen.getByText('Known conflict', { exact: true })).toBeVisible();
    expect(screen.getAllByText('Your graduation date is outside the stated required window.')[0]).toBeVisible();
    expect(screen.getByText('Jul 1, 2027 – Jul 31, 2027')).toBeVisible();
    expect(screen.getByText('Oct 30, 2026', { exact: true })).toBeVisible();
    expect(screen.getByText(/Month-only dates show calendar bounds/)).toBeVisible();
    expect(screen.queryByText('Eligible', { exact: true })).not.toBeInTheDocument();
  });
  it('escapes untrusted source text and exposes safe employer-review evidence links', () => {
    const job = sourceJob(); job.sourceReview = { status: 'employer-conflict', reason: '<script>bad()</script> Employer excludes new graduates.', evidenceUrl: 'https://example.com/careers', checkedAt: now.toISOString() };
    const { container, rerender } = render(<EligibilityEvidence profile={DEFAULT_PREFERENCES} job={job} />);
    expect(container.querySelector('script')).toBeNull(); expect(screen.getByText(job.sourceReview.reason)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Review employer evidence (opens in a new tab)' })).toHaveAttribute('rel', 'noopener noreferrer');
    job.sourceReview.evidenceUrl = 'javascript:bad()';
    rerender(<EligibilityEvidence profile={DEFAULT_PREFERENCES} job={job} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('groups exact variants only in For you and keeps each save/apply action attached to its requisition', async () => {
    const user = userEvent.setup(), repository = createDemoRepository({ storage: null, referenceDate: now });
    const first = sourceJob(), second = structuredClone(first); second.id = 'second-requisition'; second.externalId = 'second'; second.locations = [{ label: 'Boston', country: 'US', city: 'Boston', region: 'MA' }];
    const snapshot = { ...createDemoSnapshot(now), jobs: [first, second], opportunities: [], tasks: [], preferences: structuredClone(DEFAULT_PREFERENCES) };
    const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    const save = vi.spyOn(repository, 'saveOpportunity');
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/demo/opportunities']}><WorkspaceContext.Provider value={context}><Opportunities /></WorkspaceContext.Provider></MemoryRouter></QueryClientProvider>);
    expect(screen.getByText(/2 listings in 1 group/)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Your graduation and availability' })).toHaveTextContent('May 15, 2027');
    await user.click(screen.getByText(/2 listings.*matching recorded requirements/));
    const variants = document.querySelector('.listing-variants')!;
    await user.click(within(variants as HTMLElement).getByRole('button', { name: `Save ${second.title}` }));
    expect(save.mock.calls[0][0].catalogJobId).toBe(second.id);
    await user.click(within(variants as HTMLElement).getByRole('button', { name: `Open application for ${second.title}` }));
    expect(context.openApplication).toHaveBeenCalledWith(second);
    await user.click(screen.getByRole('button', { name: 'All catalog' }));
    expect(document.querySelectorAll('.listing-variants')).toHaveLength(0);
    expect(screen.getByText('2 listings', { exact: true })).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Edit timing & profile' }));
    expect(context.showSettings).toHaveBeenCalledOnce();
  });
});

const makeJob = (): Job => ({
  ...createDemoSnapshot(new Date('2026-10-22T12:00:00Z')).jobs[0],
  eligibility: { degrees: [], gpa: [], workAuthorization: [], sponsorship: [] },
  timing: { graduationStart: null, graduationEnd: null, earliestStart: null, latestStart: null, deadline: null, deadlineVerified: false, evidence: [] },
});

describe('requirements disclosures preserve critical warnings', () => {
  it('keeps an actual profile conflict visible before expanding the comparison', () => {
    const job = makeJob();
    job.timing.latestStart = '2027-05-01';
    const { container } = render(<EligibilityEvidence profile={DEFAULT_PREFERENCES} job={job} />);
    const warning = container.querySelector('.eligibility-conflict-list')!;
    expect(within(warning as HTMLElement).getByText(/You become available after the latest stated start date/)).toBeVisible();
    expect(warning.closest('details')).toBeNull();
    expect(screen.getByText('Known requirements conflict')).toBeVisible();
    expect(container.querySelector('.eligibility-compact > details')).not.toHaveAttribute('open');
  });

  it('summarizes unknown requirements without implying eligibility and retains every check', () => {
    const { container } = render(<EligibilityEvidence profile={DEFAULT_PREFERENCES} job={makeJob()} />);
    expect(screen.getByText('Requirements need checking')).toBeVisible();
    expect(screen.getByText('7 unknown')).toBeVisible();
    expect(container.querySelectorAll('.eligibility-check')).toHaveLength(7);
    expect(container.querySelectorAll('.eligibility-check.pass')).toHaveLength(0);
    expect(screen.queryByText('Recorded checks match')).not.toBeInTheDocument();
  });

  it('shows the employer contradiction immediately and makes the complete comparison available', () => {
    const job = makeJob();
    job.sourceReview = { status: 'employer-conflict', reason: 'The current employer requires two professional years. Publisher copy still describes zero-experience hiring.', evidenceUrl: 'https://example.com/current-role', checkedAt: '2026-10-22T12:00:00Z' };
    render(<EligibilityEvidence profile={DEFAULT_PREFERENCES} job={job} />);
    expect(screen.getByText('The current employer requires two professional years.')).toBeVisible();
    const comparison = screen.getByText(job.sourceReview.reason);
    expect(comparison).not.toBeVisible();
    fireEvent.click(screen.getByText('Read the full source comparison'));
    expect(comparison).toBeVisible();
    expect(screen.getByRole('link', { name: 'Review employer evidence (opens in a new tab)' })).toHaveAttribute('href', job.sourceReview.evidenceUrl);
  });
});
