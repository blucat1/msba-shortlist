import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { createDemoRepository } from '../../src/repositories/demo';
import { ShortlistRecommendations } from '../../src/features/ShortlistRecommendations';
import type { Job } from '../../src/domain/types';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-26T19:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('recommendation browsing batches', () => {
  it('keeps distinct same-company roles together across interleaved rankings without changing save or application identities', async () => {
    const reference = new Date('2026-10-26T19:00:00Z'), base = createDemoSnapshot(reference);
    const makeJob = (id: string, company: string, title: string, years = 0): Job => ({ ...structuredClone(base.jobs[0]),
      id, externalId: id, company, employerId: company.toLowerCase().replaceAll(' ', '-'), title,
      postingUrl: `https://example.test/fictional-grouping/${id}`, applicationUrl: `https://example.test/fictional-grouping/${id}`,
      experience: { minYears: years, maxYears: null, preferredYears: null, alternatives: [], evidence: `${years} years required.` },
    });
    const cedarFirst = makeJob('rank-a', 'Fictional Cedar', 'Graduate Data Analyst A');
    const fern = makeJob('rank-b', 'Fictional Fern', 'Graduate Data Analyst B');
    const cedarSecond = makeJob('rank-c', 'Fictional Cedar', 'Graduate Data Analyst C');
    const cedarStretch = makeJob('rank-d', 'Fictional Cedar', 'Business Analyst D', 2);
    const repository = createDemoRepository({ storage: null, referenceDate: reference });
    const save = vi.spyOn(repository, 'saveOpportunity');
    const context: Workspace = { snapshot: { ...base, jobs: [cedarFirst, fern, cedarSecond, cedarStretch], opportunities: [], events: [], tasks: [], jobPreferences: [] }, repository,
      mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true,
      showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    render(<MemoryRouter initialEntries={['/demo/opportunities']}><WorkspaceContext.Provider value={context}><ShortlistRecommendations /></WorkspaceContext.Provider></MemoryRouter>);

    const groups = [...document.querySelectorAll<HTMLDetailsElement>('.company-role-group')];
    expect(groups).toHaveLength(2);
    expect(screen.getByText('Showing 2 of 2 companies')).toBeVisible();
    const cedar = groups[0], fernGroup = groups[1];
    expect(cedar).toHaveAttribute('open');
    expect(within(cedar).getByRole('heading', { level: 2 })).toHaveTextContent('Fictional Cedar');
    expect(within(cedar).getByText('3 roles', { exact: true })).toBeVisible();
    expect(within(cedar).getAllByRole('article').map(card => card.querySelector('h3')!.textContent)).toEqual([cedarFirst.title, cedarSecond.title, cedarStretch.title]);
    expect(within(fernGroup).getByRole('heading', { level: 2 })).toHaveTextContent('Fictional Fern');
    expect(within(fernGroup).getByRole('article')).toHaveAccessibleName(`${fern.title} at ${fern.company}`);

    fireEvent.click(within(cedar).getByRole('button', { name: `Save ${cedarFirst.title}` }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    fireEvent.click(within(cedar).getByRole('button', { name: `Save ${cedarSecond.title}` }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls.map(([opportunity]) => opportunity.catalogJobId)).toEqual([cedarFirst.id, cedarSecond.id]);
    expect(save.mock.calls.map(([opportunity]) => opportunity.snapshot?.applicationUrl)).toEqual([cedarFirst.applicationUrl, cedarSecond.applicationUrl]);
    fireEvent.click(within(cedar).getByRole('button', { name: `Open application for ${cedarSecond.title}` }));
    expect(context.openApplication).toHaveBeenCalledWith(cedarSecond);
  });

  it('includes early-career companies after graduate companies and preserves an explicit all-experience selection', () => {
    const reference = new Date('2026-10-26T19:00:00Z'), base = createDemoSnapshot(reference);
    const makeJob = (id: string, title: string, years: number | null): Job => ({ ...structuredClone(base.jobs[0]), id, title, company: `Fictional ${id}`,
      classification: { ...base.jobs[0].classification, seniority: 'early-career', reasons: [] },
      experience: { minYears: years, maxYears: null, preferredYears: null, alternatives: [], evidence: years === null ? null : `${years} years required.` },
    });
    const jobs = [makeJob('early', 'Business Analyst', 2), makeJob('senior', 'Senior Analyst', 6), makeJob('unknown', 'Analyst', null), makeJob('grad', 'Graduate Data Analyst', 0)];
    const repository = createDemoRepository({ storage: null, referenceDate: reference });
    const context: Workspace = { snapshot: { ...base, jobs, opportunities: [], events: [], tasks: [], jobPreferences: [] }, repository,
      mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    render(<MemoryRouter initialEntries={['/demo/opportunities']}><WorkspaceContext.Provider value={context}><ShortlistRecommendations /></WorkspaceContext.Provider></MemoryRouter>);
    expect(screen.getAllByRole('article').map(card => card.querySelector('h3')!.textContent)).toEqual(['Graduate Data Analyst', 'Business Analyst']);
    expect(screen.getByText('New grads first within each company · early career included')).toBeVisible();
    expect(screen.getByText('2 years required · early-career stretch')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust recommendations' }));
    const experience = screen.getByLabelText('Experience');
    expect(experience).toHaveValue('early-career');
    fireEvent.change(experience, { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update matches' }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText('All experience levels', { exact: true })).toBeVisible();
  });

  it('shows 25 complete companies per batch and resets the visible batch after applying adjustments', () => {
    // Deliberately fictional, component-local records. No fixtures enter a live repository.
    const reference = new Date('2026-10-26T19:00:00Z');
    const base = createDemoSnapshot(reference);
    const jobs = Array.from({ length: 61 }, (_, index) => ({ ...structuredClone(base.jobs[0]),
      id: `batch-fixture-${index}`, externalId: `batch-fixture-${index}`,
      company: `Fictional Batch Employer ${index}`, title: `Graduate Data Analyst ${index}`,
      postingUrl: `https://example.test/fictional-batch/${index}`, applicationUrl: `https://example.test/fictional-batch/${index}`,
    }));
    const snapshot = { ...base, jobs, opportunities: [], events: [], tasks: [], jobPreferences: [] };
    const repository = createDemoRepository({ storage: null, referenceDate: reference });
    const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(),
      notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    render(<MemoryRouter initialEntries={['/demo/opportunities']}><WorkspaceContext.Provider value={context}><ShortlistRecommendations /></WorkspaceContext.Provider></MemoryRouter>);

    expect(document.querySelectorAll('.company-role-group')).toHaveLength(25);
    expect(screen.getAllByRole('article')).toHaveLength(25);
    expect(screen.getByText('Showing 25 of 61 companies')).toBeVisible();
    const originalTitles = screen.getAllByRole('article').map(card => card.querySelector('h3')!.textContent);
    fireEvent.click(screen.getByRole('button', { name: 'Show more recommendations' }));
    expect(document.querySelectorAll('.company-role-group')).toHaveLength(50);
    expect(screen.getByText('Showing 50 of 61 companies')).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(50);
    expect(screen.getAllByRole('article').slice(0, 25).map(card => card.querySelector('h3')!.textContent)).toEqual(originalTitles);
    fireEvent.click(screen.getByRole('button', { name: 'Show more recommendations' }));
    expect(document.querySelectorAll('.company-role-group')).toHaveLength(61);
    expect(screen.getAllByRole('article')).toHaveLength(61);
    expect(screen.getByText('Showing 61 of 61 companies')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Show more recommendations' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Adjust recommendations' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update matches' }));
    expect(document.querySelectorAll('.company-role-group')).toHaveLength(25);
    expect(screen.getAllByRole('article')).toHaveLength(25);
    expect(screen.getByText('Showing 25 of 61 companies')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Show more recommendations' })).toBeVisible();
  });

  it('keeps a company’s lower-ranked role in its first batch instead of cutting that company at the role limit', () => {
    const reference = new Date('2026-10-26T19:00:00Z'), base = createDemoSnapshot(reference);
    const jobs = Array.from({ length: 26 }, (_, index) => ({ ...structuredClone(base.jobs[0]),
      id: `company-${String(index).padStart(2, '0')}`, externalId: `company-${index}`,
      company: `Fictional Boundary Employer ${index}`, title: `Graduate Data Analyst ${index}`,
    }));
    const extraRole = { ...structuredClone(jobs[0]), id: 'zz-lower-ranked-role', externalId: 'separate-requisition', title: 'Graduate Decision Analyst' };
    jobs.push(extraRole);
    const repository = createDemoRepository({ storage: null, referenceDate: reference });
    const context: Workspace = { snapshot: { ...base, jobs, opportunities: [], events: [], tasks: [], jobPreferences: [] }, repository,
      mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true,
      showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    render(<MemoryRouter initialEntries={['/demo/opportunities']}><WorkspaceContext.Provider value={context}><ShortlistRecommendations /></WorkspaceContext.Provider></MemoryRouter>);

    expect(screen.getByText('Showing 25 of 26 companies')).toBeVisible();
    expect(document.querySelectorAll('.company-role-group')).toHaveLength(25);
    expect(screen.getAllByRole('article')).toHaveLength(26);
    const firstCompany = document.querySelector('.company-role-group')! as HTMLElement;
    expect(within(firstCompany).getAllByRole('article').map(card => card.querySelector('h3')!.textContent)).toEqual([jobs[0].title, extraRole.title]);
    expect(screen.queryByRole('heading', { name: 'Fictional Boundary Employer 25' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more recommendations' }));
    expect(screen.getByText('Showing 26 of 26 companies')).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(27);
    expect(within(firstCompany).getAllByRole('article')).toHaveLength(2);
  });
});
