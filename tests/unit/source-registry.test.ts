import { describe, expect, it, vi } from 'vitest';
import { fetchBoard } from '../../src/ingestion/adapters';
import { sourceSchema } from '../../src/ingestion/registry';

const source = {
  id: 'ashby-reviewed-employer', employerId: 'reviewed-employer', company: 'Reviewed Employer',
  careersUrl: 'https://example.com/careers', provider: 'ashby', board: 'reviewed-employer',
  state: 'verified', enabled: true, verifiedAt: '2026-10-26T23:00:00.000Z',
  evidenceUrl: 'https://example.com/careers', usageReview: 'Reviewed official public board identity and documented API.',
  lastSuccessfulCheck: null, lastAttemptAt: null, rawCount: null, relevantCount: null, error: null,
};

describe('reviewed public board identifiers', () => {
  it.each(['Jerry.ai', 'The Zebra'])('preserves an official Ashby board name and encodes it as one path segment: %s', async board => {
    const parsed = sourceSchema.parse({ ...source, board });
    const fetcher = vi.fn().mockResolvedValue({ jobs: [] });
    await fetchBoard(parsed, fetcher);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`);
  });

  it.each(['.', '..', '../openai', 'a/b', 'a\\b', 'a?x=1', 'a#b', 'a%20b', ' a', 'a ', 'a\n', 'a\tb', 'a:b', 'a'.repeat(101)])('rejects path controls and malformed names: %j', board => {
    expect(sourceSchema.safeParse({ ...source, board }).success).toBe(false);
  });

  it.each(['greenhouse', 'lever', 'jobicy'])('keeps the existing simple identifier policy for %s', provider => {
    for (const board of ['Jerry.ai', 'The Zebra']) expect(sourceSchema.safeParse({ ...source, provider, board }).success).toBe(false);
  });
});
