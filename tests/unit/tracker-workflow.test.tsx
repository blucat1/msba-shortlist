import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { MySearch } from '../../src/features/MySearch';
import Insights from '../../src/features/Insights';
import { createDemoRepository } from '../../src/repositories/demo';
import { addDays, dateOnlyInTimezone } from '../../src/domain/dates';
import { createTask, manualOpportunity } from '../../src/domain/records';
import type { AppSnapshot } from '../../src/domain/types';

afterEach(cleanup);

async function workspace() {
  const repository = createDemoRepository({ storage: null });
  const snapshot = await repository.getSnapshot();
  const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
  return context;
}
function show(context: Workspace, route = '/demo/my-search') {
  return render(<WorkspaceContext.Provider value={context}><MemoryRouter initialEntries={[route]}>{route.endsWith('/insights') ? <Insights /> : <MySearch />}</MemoryRouter></WorkspaceContext.Provider>);
}

describe('tracker feedback and next steps', () => {
  it('distinguishes an empty search from an empty tracker and restores saved roles', async () => {
    const user = userEvent.setup(), context = await workspace();
    const { container } = show(context);
    const originalCount = context.snapshot.opportunities.length;
    await user.type(screen.getByRole('textbox', { name: 'Search your tracker' }), 'no-company-can-match-this-query');
    expect(screen.getByRole('heading', { name: 'No roles match these filters' })).toBeVisible();
    expect(screen.getByText(`0 of ${originalCount} tracked roles match`)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear tracker filters' }));
    expect(container.querySelectorAll('.tracker-row')).toHaveLength(originalCount);
    expect(screen.getByRole('textbox', { name: 'Search your tracker' })).toHaveValue('');
  });

  it('orders and displays exact-time tasks using their effective dates and keeps snoozed tasks quiet', async () => {
    const user = userEvent.setup(), context = await workspace();
    const now = new Date(), today = dateOnlyInTimezone(now, context.snapshot.preferences.timezone);
    context.snapshot.opportunities = context.snapshot.opportunities.slice(0, 2).map(o => ({ ...o, stage: 'Saved' }));
    const [first, second] = context.snapshot.opportunities;
    const timed = { ...createTask(first.id, context.snapshot.userId!, 'Timed interview'), dueDate: null, dueAt: new Date(now.getTime() + 3_600_000).toISOString() };
    const snoozed = { ...createTask(second.id, context.snapshot.userId!, 'Snoozed follow-up'), dueDate: addDays(today, -5), status: 'snoozed' as const, snoozedUntil: addDays(today, 3) };
    context.snapshot.tasks = [snoozed, timed];
    const { container } = show(context);
    const expectedTime = new Intl.DateTimeFormat(undefined, { timeZone: context.snapshot.preferences.timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(timed.dueAt));
    expect(container.querySelector('.tracker-row .tracker-next')).toHaveTextContent(expectedTime);
    await user.click(screen.getByRole('button', { name: /^Next steps/ }));
    const rows = container.querySelectorAll('.task-list-row');
    expect(rows[0]).toHaveTextContent('Timed interview');
    expect(rows[0]).toHaveTextContent(expectedTime);
    expect(rows[1]).toHaveTextContent('Snoozed until');
    expect(rows[1].querySelector('.task-date')).not.toHaveClass('warning-text');
  });

  it('offers cancellation rather than deleting a next step that has not been saved', async () => {
    const user = userEvent.setup(), context = await workspace();
    show(context);
    await user.click(screen.getByRole('button', { name: 'Add next step' }));
    const dialog = screen.getByRole('dialog', { name: 'Next step' });
    expect(within(dialog).queryByRole('button', { name: 'Delete step' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reuses the reminder identity when the first save commits but its response fails', async () => {
    const user = userEvent.setup(), context = await workspace();
    const opportunity = manualOpportunity({ company: 'Fictional Retry Harbor', title: 'Decision Analyst', stage: 'Applied' }, context.snapshot.userId!);
    await context.repository.saveOpportunity(opportunity);
    context.snapshot.opportunities.push(opportunity);
    const persist = context.repository.saveTask.bind(context.repository);
    const save = vi.spyOn(context.repository, 'saveTask').mockImplementationOnce(async task => {
      await persist(task);
      throw new Error('The saved response was interrupted.');
    }).mockImplementation(persist);
    show(context, `/demo/my-search?opportunity=${opportunity.id}`);
    const accept = screen.getByRole('button', { name: 'Accept review reminder' });
    await user.click(accept);
    await waitFor(() => expect(accept).not.toBeDisabled());
    await user.click(accept);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[0][0].id).toBe(save.mock.calls[1][0].id);
    const saved = await context.repository.getSnapshot();
    expect(saved.tasks.filter(task => task.opportunityId === opportunity.id && task.type === 'review' && task.origin === 'suggested')).toHaveLength(1);
  });
});

describe('honest empty Insights', () => {
  it('provides a discovery action without inventing activity', async () => {
    const context = await workspace();
    context.snapshot = { ...context.snapshot, opportunities: [], tasks: [], events: [] } as AppSnapshot;
    show(context, '/demo/insights');
    expect(screen.getByRole('link', { name: 'Find opportunities' })).toHaveAttribute('href', '/demo/opportunities');
    expect(screen.getByText('Your search story starts with a saved role')).toBeVisible();
    expect(screen.getByLabelText('Use applications at least 14 days old for conversions')).not.toBeChecked();
  });
});
