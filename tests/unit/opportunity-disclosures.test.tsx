import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Opportunities } from '../../src/features/Opportunities';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { createDemoRepository } from '../../src/repositories/demo';

afterEach(cleanup);
describe('opportunity location disclosure', () => {
  it('keeps a multi-location card concise and preserves all source labels in role details', async () => {
    const user = userEvent.setup();
    const repository = createDemoRepository({ storage: null, referenceDate: new Date() });
    const initial = await repository.getSnapshot();
    const job = { ...initial.jobs[1], id: 'demo-location-disclosure', title: 'Example graduate analyst',
      locations: [{ label: 'Boston, MA; Chicago, IL; Seattle, WA', country: 'US', region: null, city: null }] };
    const snapshot = { ...initial, jobs: [job], opportunities: [], tasks: [], events: [], companyNotes: [], jobPreferences: [] };
    const context: Workspace = { snapshot, repository: { ...repository, getJobDetails: vi.fn(async () => job) }, mode: 'demo', base: '/demo',
      run: async work => work(), notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queries}><MemoryRouter initialEntries={['/demo/opportunities']}><WorkspaceContext.Provider value={context}><Opportunities /></WorkspaceContext.Provider></MemoryRouter></QueryClientProvider>);
    const card = screen.getByRole('article', { name: `${job.title} at ${job.company}` });
    expect(within(card).getByText(/Boston, MA/)).toBeVisible();
    expect(within(card).queryByText(/Chicago, IL/)).not.toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: `View all locations for ${job.title}` }));
    const details = await screen.findByRole('dialog', { name: 'Role details' });
    expect(within(details).getByText('Chicago, IL')).not.toBeVisible();
    await user.click(within(details).getByText('View all source locations', { selector: 'summary' }));
    for (const label of ['Boston, MA', 'Chicago, IL', 'Seattle, WA']) expect(within(details).getByText(label, { exact: true })).toBeVisible();
    expect(within(details).getByText('Location labels do not establish work authorization or remote eligibility.')).toBeVisible();
    queries.clear();
  });
  it('keeps all next steps reachable while Today priorities start collapsed', async () => {
    const user = userEvent.setup();
    const repository = createDemoRepository({ storage: null, referenceDate: new Date() });
    const snapshot = await repository.getSnapshot();
    const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true,
      showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(<QueryClientProvider client={queries}><MemoryRouter initialEntries={['/demo/opportunities']}><WorkspaceContext.Provider value={context}><Opportunities /></WorkspaceContext.Provider></MemoryRouter></QueryClientProvider>);
    const section = screen.getByRole('region', { name: 'Today’s priorities' });
    const allSteps = within(section).getByRole('link', { name: 'All next steps' });
    expect(allSteps).toBeVisible();
    expect(allSteps.closest('details')).toBeNull();
    expect(allSteps).toHaveAttribute('href', '/demo/my-search?view=tasks');
    const disclosure = container.querySelector('.today-priorities')!;
    expect(disclosure).not.toHaveAttribute('open');
    const priorities = container.querySelectorAll('.today-card');
    expect(priorities).toHaveLength(3);
    for (const priority of priorities) expect(priority).not.toBeVisible();
    await user.click(within(section).getByText('Next steps', { selector: 'summary' }));
    expect(disclosure).toHaveAttribute('open');
    for (const priority of priorities) expect(priority).toBeVisible();
    queries.clear();
  });

});
