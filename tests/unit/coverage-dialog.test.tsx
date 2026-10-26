import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InformationDialog } from '../../src/features/Settings';
import { createDemoSnapshot } from '../../src/domain/fixtures';

afterEach(cleanup);
describe('coverage and privacy outside the workspace provider', () => {
  it('keeps privacy available when live configuration or loading fails', () => {
    render(<InformationDialog kind="privacy" sources={[]} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('What is stored');
    expect(screen.getByRole('dialog')).toHaveTextContent('Google supplies basic identity');
  });
  it('shows coverage from an explicitly supplied snapshot without requiring private context', () => {
    const snapshot = createDemoSnapshot(new Date('2026-10-22T07:00:00Z'));
    render(<InformationDialog kind="coverage" sources={snapshot.sources} snapshot={snapshot} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('What the catalog actually contains');
    expect(screen.getByRole('dialog')).toHaveTextContent('Confirmed zero-year matches');
    expect(screen.getByRole('dialog')).toHaveTextContent('New-grad / 0–1-year evidence');
    expect(screen.getByRole('dialog')).toHaveTextContent('Additional early-career matches');
    expect(screen.getByRole('dialog')).toHaveTextContent('with new grads shown first');
    expect(screen.getByRole('dialog')).toHaveTextContent('entire market is unknown');
  });
});
