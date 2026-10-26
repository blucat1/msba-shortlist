import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { createDemoRepository } from '../../src/repositories/demo';
import { ShortlistRecommendations } from '../../src/features/ShortlistRecommendations';
import type { Job } from '../../src/domain/types';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-26T19:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('recommendation browsing batches', () => {
  it('includes 2–3-year roles by default after new grads and preserves an explicit all-experience selection', () => {
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
    expect(screen.getByText('New grads first · early career included')).toBeVisible();
    expect(screen.getByText('2 years required · early-career stretch')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Adjust recommendations' }));
    const experience = screen.getByLabelText('Experience');
    expect(experience).toHaveValue('early-career');
    fireEvent.change(experience, { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update matches' }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText('All experience levels', { exact: true })).toBeVisible();
  });

  it('shows 25 real rows from the supplied snapshot per batch and resets the visible batch after applying adjustments', () => {
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

    expect(screen.getAllByRole('article')).toHaveLength(25);
    expect(screen.getByText('Showing 25 of 61 role groups')).toBeVisible();
    const originalTitles = screen.getAllByRole('article').map(card => card.querySelector('h3')!.textContent);
    fireEvent.click(screen.getByRole('button', { name: 'Show more recommendations' }));
    expect(screen.getAllByRole('article')).toHaveLength(50);
    expect(screen.getAllByRole('article').slice(0, 25).map(card => card.querySelector('h3')!.textContent)).toEqual(originalTitles);
    fireEvent.click(screen.getByRole('button', { name: 'Show more recommendations' }));
    expect(screen.getAllByRole('article')).toHaveLength(61);
    expect(screen.getByText('Showing 61 of 61 role groups')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Show more recommendations' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Adjust recommendations' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update matches' }));
    expect(screen.getAllByRole('article')).toHaveLength(25);
    expect(screen.getByText('Showing 25 of 61 role groups')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Show more recommendations' })).toBeVisible();
  });
});
