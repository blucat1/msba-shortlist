import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { JobCard } from '../../src/components/JobCard';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { rankJob } from '../../src/domain/ranking';
import { compareResumeToJob } from '../../src/domain/resume-matching';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-26T19:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const snapshot = createDemoSnapshot(new Date('2026-10-26T19:00:00Z'));
const profile = snapshot.preferences;
const job = { ...snapshot.jobs[0], isDemo: false };
const result = rankJob(job, profile);
const actions = () => ({ onSave: vi.fn(), onDismiss: vi.fn(), onView: vi.fn(), onApply: vi.fn() });

describe('discovery card decisions', () => {
  it('prevents repeated save/dismiss writes while a save is still pending', async () => {
    let resolve!: () => void;
    const handlers = actions();
    handlers.onSave.mockImplementation(() => new Promise<void>(done => { resolve = done; }));
    render(<JobCard result={result} profile={profile} saved={false} dismissed={false} recommendationRank={1} {...handlers} />);
    const save = screen.getByRole('button', { name: `Save ${job.title}` });
    fireEvent.click(save); fireEvent.click(save);
    expect(handlers.onSave).toHaveBeenCalledOnce();
    expect(save).toBeDisabled(); expect(save).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: `Dismiss ${job.title}` })).toBeDisabled();
    await act(async () => { resolve(); });
    expect(save).not.toBeDisabled(); expect(save).toHaveAttribute('aria-busy', 'false');
  });

  it('keeps source freshness visible and places reasons before the decision actions', () => {
    const { container } = render(<JobCard result={result} profile={profile} saved={false} dismissed={false} recommendationRank={1} {...actions()} />);
    expect(screen.getByText(/^Feed checked /)).toBeVisible();
    const reasons = container.querySelector('.recommendation-why')!;
    const decisionActions = container.querySelector('.job-bottom')!;
    expect(reasons.compareDocumentPosition(decisionActions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll('.recommendation-reasons li').length).toBeLessThanOrEqual(3);
    expect(screen.getByText('Requirements need checking')).toBeVisible();
  });

  it('shows one resume score with its evidence coverage instead of duplicate score blocks', () => {
    const resumeMatch = compareResumeToJob({ skills: ['sql', 'python'], roleInterests: [], yearsExperience: null, educationLevel: null, degreeField: null }, job);
    const { container } = render(<JobCard result={result} profile={profile} resumeMatch={resumeMatch} saved={false} dismissed={false} recommendationRank={1} {...actions()} />);
    expect(container.querySelectorAll('.resume-score')).toHaveLength(1);
    expect(container.querySelector('.recommendation-score')).toBeNull();
    expect(screen.getByText(`Resume evidence coverage: ${resumeMatch.coverage}%`, { exact: false })).toBeVisible();
    expect(screen.getByText(`Resume evidence coverage: ${resumeMatch.coverage}%`, { exact: false })).toHaveAttribute('title', `${resumeMatch.coverage}% of resume comparison weight assessed`);
  });
});
