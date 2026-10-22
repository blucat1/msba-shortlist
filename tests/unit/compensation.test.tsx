import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Opportunities } from '../../src/features/Opportunities';
import { WorkspaceContext, type Workspace } from '../../src/app/store';
import { createDemoRepository } from '../../src/repositories/demo';
import { formatCompensation } from '../../src/lib/compensation';
import type { SalaryBand } from '../../src/domain/types';

const salary = (fields: Partial<SalaryBand>): SalaryBand => ({ min: 85_000, max: 95_000, currency: 'USD', period: 'year', compensationType: 'base', location: null, sourceText: '', ...fields });
afterEach(cleanup);
describe('source compensation presentation', () => {
  it('keeps currency and pay period uncertainty explicit without inventing a dollar amount or annual rate', () => {
    const text = formatCompensation([salary({ currency: 'unknown', period: 'unknown' })]);
    expect(text).toContain('85,000–95,000'); expect(text).toContain('Currency not specified'); expect(text).toContain('Pay period not specified');
    expect(text).not.toMatch(/\$|USD|\/ yr|annual/i);
  });
  it('preserves hourly cents, a real non-USD currency and an upper-only source range', () => {
    const text = formatCompensation([salary({ min: null, max: 42.75, currency: 'CAD', period: 'hour' })]);
    expect(text).toBe('Up to CA$42.75 / hr'); expect(text).not.toMatch(/\/ yr|annual|not specified/i);
  });
  it('preserves source wording when amounts are missing and handles unavailable/invalid codes', () => {
    expect(formatCompensation([salary({ min: null, max: null, currency: 'unknown', period: 'unknown', sourceText: 'Competitive compensation; ask the employer.' })])).toContain('Competitive compensation; ask the employer.');
    for (const currency of ['unknown', '', 'not available', 'US$', 'XXX']) {
      expect(formatCompensation([salary({ currency })])).toContain('Currency not specified');
    }
    expect(formatCompensation([])).toBe('Pay not listed');
  });
  it('renders a live catalog job with unknown currency and opens its details without crashing', async () => {
    const user = userEvent.setup(), demo = createDemoRepository({ storage: null, referenceDate: new Date() });
    const initial = await demo.getSnapshot();
    const job = { ...initial.jobs[1], id: 'live-unknown-currency', title: 'Live analytics opportunity', isDemo: false,
      salary: [salary({ currency: 'unknown', period: 'unknown', sourceText: '$85,000–$95,000, terms not specified.' })] };
    const snapshot = { ...initial, userId: null, jobs: [job], opportunities: [], tasks: [], events: [], companyNotes: [], jobPreferences: [] };
    const repository = { ...demo, mode: 'live' as const, getJobDetails: vi.fn(async () => ({ ...job, description: 'Original public source description.' })) };
    const context: Workspace = { snapshot, repository, mode: 'live', base: '', run: async work => work(), notify: vi.fn(), requireUser: () => false,
      showSettings: vi.fn(), showCoverage: vi.fn(), showManual: vi.fn(), openApplication: vi.fn(), confirmApplication: vi.fn() };
    const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queries}><MemoryRouter initialEntries={['/opportunities']}><WorkspaceContext.Provider value={context}><Opportunities /></WorkspaceContext.Provider></MemoryRouter></QueryClientProvider>);
    const card = screen.getByRole('article', { name: `Live analytics opportunity at ${job.company}` });
    expect(within(card).getByText(/Currency not specified/)).toHaveTextContent('Pay period not specified');
    expect(card).not.toHaveTextContent(/USD|\/ yr/);
    await user.click(within(card).getByRole('button', { name: 'View role' }));
    const details = await screen.findByRole('dialog', { name: 'A closer look' });
    expect(within(details).getByText(/Currency not specified/)).toHaveTextContent('Pay period not specified');
    expect(await within(details).findByText('Original public source description.')).not.toBeVisible();
    await user.click(within(details).getByText('Read full job description', { selector: 'summary' }));
    expect(within(details).getByText('Original public source description.')).toBeVisible();
    expect(repository.getJobDetails).toHaveBeenCalledWith(job.id);
    queries.clear();
  });
});
