import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResumeWorkspaceProvider } from '../../src/app/resume-store';
import { ResumeWorkspace } from '../../src/features/ResumeWorkspace';
import type { ImportedResume } from '../../src/lib/resume-import';

const importer = vi.hoisted(() => ({ importResumeFile: vi.fn() }));
vi.mock('../../src/lib/resume-import', () => importer);
const text = 'Example Student\nexample@example.invalid\nEducation\nMaster of Science in Business Analytics, expected May 2027\nSkills\nSQL, Python, Tableau\nExperience\n- Automated a SQL report to reduce weekly preparation time by 30%.\nProjects\n- Built an analytics dashboard for a fictional class project.\n';
const imported: ImportedResume = { fileName: 'fictional-resume.txt', fileType: 'txt', text, warnings: [], pageCount: null };
beforeEach(() => { importer.importResumeFile.mockReset().mockResolvedValue(imported); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const mount = (onUseResume = vi.fn()) => render(<ResumeWorkspaceProvider mode="demo"><ResumeWorkspace onUseResume={onUseResume} /></ResumeWorkspaceProvider>);
async function pasteAndAnalyze() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Or paste your resume text' }), { target: { value: text } });
  await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }));
}
const confirmation = () => screen.getByRole('checkbox', { name: 'I reviewed this profile. Use it for matches in this tab.' });

describe('explicit local resume review', () => {
  it('focuses and reveals the completed report after explicit analysis without confirming the profile', async () => {
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    const scroll = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
    try {
      mount(); await pasteAndAnalyze();
      const heading = screen.getByRole('heading', { name: 'Local resume report' });
      expect(heading).toHaveFocus(); expect(heading).toHaveAttribute('tabindex', '-1');
      expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
      expect(screen.getByText('Resume report ready. Review extracted profile below.')).toHaveAttribute('aria-live', 'polite');
      expect(confirmation()).not.toBeChecked(); expect(screen.getByRole('button', { name: 'Use this resume' })).toBeDisabled();
    } finally {
      if (original) Object.defineProperty(Element.prototype, 'scrollIntoView', original);
      else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  it('does not analyze on paste, then shows a real report with unconfirmed experience/education', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Or paste your resume text' }), { target: { value: text } });
    expect(screen.queryByRole('heading', { name: 'Local resume report' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }));
    expect(screen.getByRole('heading', { name: 'Local resume report' })).toBeVisible();
    const parsingReport = screen.getByText(/^Parsing report ·/);
    expect(parsingReport.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Specific achievement evidence')).not.toBeVisible();
    await userEvent.click(parsingReport);
    expect(screen.getByText('Specific achievement evidence')).toBeVisible();
    expect(screen.getByText(/not an employer ATS test/)).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Skills to compare' })).toHaveValue('sql, python, tableau');
    expect(screen.getByRole('spinbutton', { name: 'Confirmed professional experience (years)' })).toHaveValue(null);
    expect(screen.getByRole('combobox', { name: /Highest completed degree/ })).toHaveValue('');
    expect(confirmation()).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Use this resume' })).toBeDisabled();
  });

  it('requires reviewed confirmation and invalidates it after every profile edit', async () => {
    const use = vi.fn(); mount(use); await pasteAndAnalyze();
    await userEvent.click(confirmation());
    await userEvent.click(screen.getByRole('button', { name: 'Use this resume' })); expect(use).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole('textbox', { name: 'Skills to compare' }), { target: { value: 'SQL, Python, Power BI' } });
    expect(confirmation()).not.toBeChecked(); expect(screen.getByRole('button', { name: 'Use this resume' })).toBeDisabled();
    await userEvent.click(confirmation());
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Confirmed professional experience (years)' }), { target: { value: '0.5' } });
    expect(confirmation()).not.toBeChecked(); expect(screen.getByRole('spinbutton', { name: 'Confirmed professional experience (years)' })).toHaveValue(0.5);
    fireEvent.change(screen.getByRole('textbox', { name: 'Completed degree field' }), { target: { value: 'Business Analytics' } });
    expect(screen.getByRole('textbox', { name: 'Completed degree field' })).toHaveValue('Business Analytics');
  });

  it('clears the previous report/profile when extracted text changes, and removes all local state', async () => {
    mount(); await pasteAndAnalyze(); await userEvent.click(confirmation());
    fireEvent.change(screen.getByRole('textbox', { name: 'Review and edit extracted resume text' }), { target: { value: text + 'Updated projects.' } });
    expect(screen.queryByRole('heading', { name: 'Local resume report' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /I reviewed this profile/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }));
    expect(confirmation()).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Remove resume' }));
    expect(screen.getByRole('textbox', { name: 'Or paste your resume text' })).toHaveValue('');
    expect(screen.queryByRole('heading', { name: 'Local resume report' })).not.toBeInTheDocument();
  });

  it('imports file text without silently analyzing it, and reports import failures', async () => {
    mount();
    await userEvent.upload(screen.getByLabelText('Choose resume file'), new File([text], 'fictional-resume.txt', { type: 'text/plain' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Review and edit extracted resume text' })).toHaveValue(text));
    expect(screen.queryByRole('heading', { name: 'Local resume report' })).not.toBeInTheDocument();
    expect(importer.importResumeFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'fictional-resume.txt' }), { signal: expect.any(AbortSignal) });
    importer.importResumeFile.mockRejectedValueOnce(new Error('Password-protected PDFs are not supported.'));
    await userEvent.upload(screen.getByLabelText('Choose resume file'), new File(['%PDF'], 'protected.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Password-protected PDFs');
  });

  it('cancels a pending import on removal and ignores its late result', async () => {
    let resolve!: (value: ImportedResume) => void;
    importer.importResumeFile.mockImplementationOnce(() => new Promise<ImportedResume>(done => { resolve = done; }));
    mount(); await userEvent.upload(screen.getByLabelText('Choose resume file'), new File([text], 'fictional-resume.txt'));
    expect(screen.getByText('Reading the document locally…')).toHaveAttribute('role', 'status');
    const signal = importer.importResumeFile.mock.calls[0][1].signal as AbortSignal;
    await userEvent.click(screen.getByRole('button', { name: 'Remove resume' })); expect(signal.aborted).toBe(true);
    await act(async () => { resolve(imported); });
    expect(screen.getByRole('textbox', { name: 'Or paste your resume text' })).toHaveValue('');
    expect(screen.queryByText('fictional-resume.txt · TXT')).not.toBeInTheDocument();
  });

  it('clears in-memory documents across mode changes and auth identity remounts', async () => {
    const view = render(<ResumeWorkspaceProvider key="demo:user-a" mode="demo"><ResumeWorkspace /></ResumeWorkspaceProvider>);
    await pasteAndAnalyze(); expect(screen.getByRole('heading', { name: 'Local resume report' })).toBeVisible();
    view.rerender(<ResumeWorkspaceProvider key="demo:user-a" mode="live"><ResumeWorkspace /></ResumeWorkspaceProvider>);
    expect(screen.getByRole('textbox', { name: 'Or paste your resume text' })).toHaveValue('');
    await pasteAndAnalyze();
    view.rerender(<ResumeWorkspaceProvider key="live:user-b" mode="live"><ResumeWorkspace /></ResumeWorkspaceProvider>);
    expect(screen.getByRole('textbox', { name: 'Or paste your resume text' })).toHaveValue('');
    expect(screen.queryByRole('heading', { name: 'Local resume report' })).not.toBeInTheDocument();
  });

  it('keeps missing-provider fallbacks isolated and never persists resume text to browser storage', async () => {
    const persist = vi.spyOn(Storage.prototype, 'setItem');
    render(<><ResumeWorkspace /><ResumeWorkspace /></>);
    const regions = screen.getAllByRole('region', { name: 'Resume workspace' });
    fireEvent.change(within(regions[0]).getByRole('textbox', { name: 'Or paste your resume text' }), { target: { value: text } });
    await userEvent.click(within(regions[0]).getByRole('button', { name: 'Analyze resume' }));
    expect(within(regions[0]).getByRole('heading', { name: 'Local resume report' })).toBeVisible();
    expect(within(regions[1]).queryByRole('heading', { name: 'Local resume report' })).not.toBeInTheDocument();
    expect(within(regions[1]).getByRole('textbox', { name: 'Or paste your resume text' })).toHaveValue('');
    expect(persist).not.toHaveBeenCalled();
  });

  it('renders untrusted pasted/evidence text as text and rejects an unusably short paste', async () => {
    const view = mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Or paste your resume text' }), { target: { value: 'SQL' } });
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' })); expect(screen.getByRole('alert')).toHaveTextContent('at least 40 characters');
    const untrusted = text + '\n<script>window.resumeInjected=true</script> SQL evidence';
    fireEvent.change(screen.getByRole('textbox', { name: 'Or paste your resume text' }), { target: { value: untrusted } });
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }));
    expect(view.container.querySelector('script')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Review and edit extracted resume text' })).toHaveValue(untrusted);
  });
});
