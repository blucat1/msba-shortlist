import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { safeUrl } from '../../src/components/ui';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('workspace recovery', () => {
  it('offers recovery after a rendering failure without exposing private error details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenView(): never { throw new Error('private-note-do-not-display'); }
    render(<ErrorBoundary><BrokenView /></ErrorBoundary>);

    expect(screen.getByRole('heading', { name: 'Your workspace hit a problem' })).toBeVisible();
    expect(screen.getByRole('button', { name: /reload/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /opportunities/i })).toHaveAttribute('href');
    expect(screen.queryByText(/private-note-do-not-display/)).not.toBeInTheDocument();
  });

  it('uses the same credential-free URL policy for rendered links as for imported data', () => {
    expect(safeUrl('https://example.com/jobs/analyst')).toBe('https://example.com/jobs/analyst');
    expect(safeUrl('http://localhost:5173/demo')).toBe('http://localhost:5173/demo');
    for (const value of ['https://person:password@example.com/jobs', 'https://person@example.com', 'javascript:alert(1)', 'data:text/html,hello', '/relative', null, undefined]) {
      expect(safeUrl(value)).toBeNull();
    }
  });
});
