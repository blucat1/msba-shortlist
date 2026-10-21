import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from '../../src/components/ui';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { OpportunityForm } from '../../src/features/OpportunityForm';
import { createDemoRepository } from '../../src/repositories/demo';

afterEach(cleanup);
describe('accessible shared fields', () => {
  it('separates the accessible name from supporting instructions for inputs, textareas, and selects', async () => {
    const user = userEvent.setup();
    render(<><Field label="Company" hint="Use its full name."><input /></Field><Field label="Notes" hint="Only you can read this."><textarea /></Field><Field label="Stage"><select><option>Saved</option><option>Applied</option></select></Field></>);
    const company = screen.getByRole('textbox', { name: 'Company' });
    expect(company).toHaveAccessibleDescription('Use its full name.');
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveAccessibleDescription('Only you can read this.');
    const stage = screen.getByRole('combobox', { name: 'Stage' }); expect(stage).not.toHaveAttribute('aria-describedby');
    expect(new Set([company.id, screen.getByRole('textbox', { name: 'Notes' }).id, stage.id]).size).toBe(3);
    await user.click(screen.getByText('Company')); expect(company).toHaveFocus();
  });
});
describe('manual opportunity save failures', () => {
  it('retains the user draft, reports failure, and retries successfully without changing its company grouping', async () => {
    const user = userEvent.setup(), repository = createDemoRepository({ storage: null, referenceDate: new Date('2026-10-21T19:00:00Z') });
    const snapshot = await repository.getSnapshot(), onClose = vi.fn();
    const save = vi.spyOn(repository, 'saveOpportunity').mockRejectedValueOnce(new Error('Connection unavailable. Try again.'));
    const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    render(<WorkspaceContext.Provider value={context}><OpportunityForm open onClose={onClose} /></WorkspaceContext.Provider>);
    await user.type(screen.getByRole('textbox', { name: 'Company *' }), 'Horizon Research');
    await user.type(screen.getByRole('textbox', { name: 'Job title *' }), 'Decision Analyst');
    await user.type(screen.getByRole('textbox', { name: 'Private notes' }), 'Ask about the analysis team.');
    await user.click(screen.getByRole('button', { name: 'Add opportunity' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection unavailable. Try again.');
    expect(screen.getByRole('textbox', { name: 'Company *' })).toHaveValue('Horizon Research');
    expect(screen.getByRole('textbox', { name: 'Private notes' })).toHaveValue('Ask about the analysis team.'); expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Add opportunity' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledTimes(2);
    const persisted = (await repository.getSnapshot()).opportunities.filter(o => o.company === 'Horizon Research');
    expect(persisted).toHaveLength(1); expect(persisted[0].companyKey).toBe('manual:horizon research'); expect(persisted[0].notes).toBe('Ask about the analysis team.');
  });
});
