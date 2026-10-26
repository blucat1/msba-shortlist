import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { SettingsDialog } from '../../src/features/Settings';
import { createDemoRepository } from '../../src/repositories/demo';

afterEach(cleanup);

async function workspace() {
  const repository = createDemoRepository({ storage: null });
  const snapshot = await repository.getSnapshot();
  const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
  return context;
}

describe('settings draft and import safety', () => {
  it('retains preference edits across a background refresh and a failed save', async () => {
    const user = userEvent.setup(), context = await workspace();
    vi.spyOn(context.repository, 'savePreferences').mockRejectedValueOnce(new Error('Connection interrupted.'));
    const onClose = vi.fn();
    const surface = (current: Workspace) => <WorkspaceContext.Provider value={current}><MemoryRouter><SettingsDialog open onClose={onClose} onSignOut={async () => {}} /></MemoryRouter></WorkspaceContext.Provider>;
    const { rerender } = render(surface(context));
    const engineering = screen.getByRole('button', { name: 'Data engineering' });
    expect(engineering).toHaveAttribute('aria-pressed', 'false');
    await user.click(engineering);
    expect(engineering).toHaveAttribute('aria-pressed', 'true');
    rerender(surface({ ...context, snapshot: { ...context.snapshot, preferences: structuredClone(context.snapshot.preferences) } }));
    expect(engineering).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    await waitFor(() => expect(context.repository.savePreferences).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    expect(engineering).toHaveAttribute('aria-pressed', 'true');
  });

  it('removes an earlier valid import preview when the next selected backup is invalid', async () => {
    const user = userEvent.setup(), context = await workspace();
    render(<WorkspaceContext.Provider value={context}><MemoryRouter><SettingsDialog open onClose={vi.fn()} onSignOut={async () => {}} /></MemoryRouter></WorkspaceContext.Provider>);
    await user.click(screen.getByRole('button', { name: 'Data & account' }));
    const validFile = new File(['company,title\nA fictional company,Analyst\n'], 'roles.csv', { type: 'text/csv' });
    Object.defineProperty(validFile, 'text', { value: async () => 'company,title\nA fictional company,Analyst\n' });
    await user.upload(screen.getByLabelText('Import JSON or CSV backup'), validFile);
    expect(await screen.findByText('Review this import')).toBeVisible();
    const invalidFile = new File(['broken'], 'invalid.json', { type: 'application/json' });
    Object.defineProperty(invalidFile, 'text', { value: async () => 'broken' });
    await user.upload(screen.getByLabelText('Import JSON or CSV backup'), invalidFile);
    await waitFor(() => expect(context.notify).toHaveBeenCalled());
    expect(screen.queryByText('Review this import')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument();
  });

  it('ignores a slow earlier file after a newer invalid backup is selected', async () => {
    const user = userEvent.setup(), context = await workspace();
    render(<WorkspaceContext.Provider value={context}><MemoryRouter><SettingsDialog open onClose={vi.fn()} onSignOut={async () => {}} /></MemoryRouter></WorkspaceContext.Provider>);
    await user.click(screen.getByRole('button', { name: 'Data & account' }));
    let finishRead!: (value: string) => void;
    const pendingRead = new Promise<string>(resolve => { finishRead = resolve; });
    const slowFile = new File(['pending'], 'slow.csv', { type: 'text/csv' });
    Object.defineProperty(slowFile, 'text', { value: () => pendingRead });
    await user.upload(screen.getByLabelText('Import JSON or CSV backup'), slowFile);
    const invalidFile = new File(['broken'], 'invalid.json', { type: 'application/json' });
    Object.defineProperty(invalidFile, 'text', { value: async () => 'broken' });
    await user.upload(screen.getByLabelText('Import JSON or CSV backup'), invalidFile);
    await waitFor(() => expect(context.notify).toHaveBeenCalled());
    await act(async () => { finishRead('company,title\nA fictional company,Analyst\n'); await pendingRead; });
    expect(screen.queryByText('Review this import')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument();
  });
});
