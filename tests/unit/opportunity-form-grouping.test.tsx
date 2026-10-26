import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { OpportunityForm } from '../../src/features/OpportunityForm';
import { manualOpportunity } from '../../src/domain/records';
import { createDemoRepository } from '../../src/repositories/demo';

afterEach(cleanup);

describe('manual company identity edits', () => {
  it.each([
    { name: 'automatic manual grouping follows the edited company', key: 'manual:old harbor', catalogJobId: null, expected: 'manual:new harbor' },
    { name: 'custom manual grouping stays intentional', key: 'private:harbor-group', catalogJobId: null, expected: 'private:harbor-group' },
    { name: 'catalog identity stays stable', key: 'manual:old harbor', catalogJobId: 'catalog-harbor-role', expected: 'manual:old harbor' },
  ])('$name', async ({ key, catalogJobId, expected }) => {
    const user = userEvent.setup(), repository = createDemoRepository({ storage: null });
    const snapshot = await repository.getSnapshot();
    const opportunity = manualOpportunity({ company: 'Old Harbor', title: 'Decision Analyst', companyKey: key, catalogJobId }, snapshot.userId!);
    const save = vi.spyOn(repository, 'saveOpportunity').mockImplementation(async value => value), onClose = vi.fn();
    const context: Workspace = { snapshot, repository, mode: 'demo', base: '/demo', run: async work => work(), notify: vi.fn(), requireUser: () => true, showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    render(<WorkspaceContext.Provider value={context}><OpportunityForm open opportunity={opportunity} onClose={onClose} /></WorkspaceContext.Provider>);
    const company = screen.getByRole('textbox', { name: 'Company *' });
    await user.clear(company);
    await user.type(company, 'New Harbor');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ company: 'New Harbor', companyKey: expected, catalogJobId }));
  });
});
