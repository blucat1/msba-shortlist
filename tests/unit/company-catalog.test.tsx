import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { createDemoRepository } from '../../src/repositories/demo';
import { Opportunities } from '../../src/features/Opportunities';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-26T19:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('catalog batches include every matching role for each of the first 15 companies', () => {
  // Deliberately fictional component-only rows; never inserted into live storage.
  const reference = new Date('2026-10-26T19:00:00Z'), base = createDemoSnapshot(reference);
  const jobs = Array.from({ length: 16 }, (_, index) => ({ ...structuredClone(base.jobs[0]),
    id: `catalog-company-${String(index).padStart(2, '0')}`, externalId: `catalog-company-${index}`,
    company: `Fictional Catalog Company ${index}`, title: `Graduate Data Analyst ${index}`,
  }));
  const extra = { ...structuredClone(jobs[0]), id: 'catalog-company-z-tail', externalId: 'catalog-company-z-tail', title: 'Graduate Product Analyst' };
  const repository = createDemoRepository({ storage: null, referenceDate: reference });
  const snapshot = { ...base, jobs: [...jobs, extra], opportunities: [], events: [], tasks: [], jobPreferences: [] };
  const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(),
    notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/demo/opportunities?view=all']}><WorkspaceContext.Provider value={context}><Opportunities /></WorkspaceContext.Provider></MemoryRouter></QueryClientProvider>);
  expect(document.querySelectorAll('.company-role-group')).toHaveLength(15);
  expect(screen.getAllByRole('article')).toHaveLength(16);
  const firstCompany = screen.getByRole('heading', { name: jobs[0].company }).closest('details')!;
  expect(within(firstCompany).getAllByRole('article')).toHaveLength(2);
  expect(within(firstCompany).getByRole('button', { name: extra.title })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Show more opportunities' }));
  expect(document.querySelectorAll('.company-role-group')).toHaveLength(16);
  expect(screen.getAllByRole('article')).toHaveLength(17);
  expect(screen.queryByRole('button', { name: 'Show more opportunities' })).not.toBeInTheDocument();
});
