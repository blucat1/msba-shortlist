import { describe, expect, it, vi } from 'vitest';
import { fetchPublicJson } from '../../src/ingestion/http';

const endpoint = 'https://api.lever.co/v0/postings/fixture';

function interruptedResponse(error: Error): Response {
  let reads = 0;
  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (reads++ === 0) controller.enqueue(new TextEncoder().encode('{"discardedPartialAttempt":'));
      else controller.error(error);
    },
  }));
}

describe('public feed response-body retries', () => {
  it.each([
    new TypeError('simulated body transport failure'),
    new DOMException('simulated body timeout', 'TimeoutError'),
  ])('restarts the whole request after a body failure and discards partial chunks: %s', async error => {
    const interrupted = interruptedResponse(error);
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(interrupted)
      .mockResolvedValueOnce(new Response('{"jobs":[{"id":"complete-second-response"}]}'));
    const pause = vi.fn(async () => {});

    await expect(fetchPublicJson(endpoint, { fetch: fetcher, sleep: pause }))
      .resolves.toEqual({ jobs: [{ id: 'complete-second-response' }] });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(call => call[0])).toEqual([endpoint, endpoint]);
    expect(pause.mock.calls).toEqual([[500]]);
    expect(interrupted.body?.locked).toBe(false);
    expect(fetcher.mock.calls[0][1]?.signal).not.toBe(fetcher.mock.calls[1][1]?.signal);
  });

  it.each([1, 2, 3])('rejects without returning partial data after %i configured failed attempts', async maxAttempts => {
    const responses: Response[] = [];
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      const response = interruptedResponse(new TypeError('simulated repeated stream failure'));
      responses.push(response);
      return response;
    });
    const pause = vi.fn(async () => {});

    await expect(fetchPublicJson(endpoint, { fetch: fetcher, sleep: pause, maxAttempts }))
      .rejects.toThrow('no reconciliation performed');
    expect(fetcher).toHaveBeenCalledTimes(maxAttempts);
    expect(pause.mock.calls).toEqual(Array.from({ length: maxAttempts - 1 }, (_, attempt) => [500 * 2 ** attempt]));
    expect(responses.every(response => !response.body?.locked)).toBe(true);
  });

  it('rejects an oversized streamed body without retrying even if cancellation fails', async () => {
    const cancel = vi.fn(() => { throw new Error('simulated cancellation failure'); });
    const response = new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(24000001)); },
      cancel,
    }));
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    const pause = vi.fn(async () => {});

    await expect(fetchPublicJson(endpoint, { fetch: fetcher, sleep: pause }))
      .rejects.toThrow('24MB safety limit');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
    expect(response.body?.locked).toBe(false);
  });

  it.each([
    ['invalid JSON', () => new Response('{"incomplete":'), 'not valid JSON'],
    ['permanent HTTP error', () => new Response('not found', { status: 404 }), 'HTTP 404'],
    ['declared oversized body', () => new Response('{}', { headers: { 'Content-Length': '24000001' } }), '24MB safety limit'],
    ['missing body', () => new Response(null), 'Feed body missing'],
  ] as const)('does not retry a permanent validation failure: %s', async (_label, response, message) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
    const pause = vi.fn(async () => {});

    await expect(fetchPublicJson(endpoint, { fetch: fetcher, sleep: pause })).rejects.toThrow(message);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
  });
});
