export interface HttpOptions { fetch?: typeof fetch; timeoutMs?: number; maxAttempts?: number; sleep?: (ms: number) => Promise<void>; }
const ALLOWED_HOSTS = new Set(['boards-api.greenhouse.io', 'api.lever.co', 'api.eu.lever.co', 'api.ashbyhq.com', 'jobicy.com']);
const JOBICY_API_PATHS = new Set(['/api/jobs', '/api/jobs/status']);
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
export async function fetchPublicJson(url: string, options: HttpOptions = {}): Promise<unknown> {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname) || target.username || target.password || (target.hostname === 'jobicy.com' && (target.port || !JOBICY_API_PATHS.has(target.pathname)))) throw new Error('Only approved public feed hosts can be fetched.');
  const fetcher = options.fetch || fetch; const attempts = options.maxAttempts || 3; const pause = options.sleep || sleep;
  request: for (let attempt = 0; attempt < attempts; attempt++) {
    let response: Response;
    try {
      response = await fetcher(url, { headers: { Accept: 'application/json', 'User-Agent': 'MSBA-Shortlist/1.0 (public job catalog; twice-daily checks)' }, signal: AbortSignal.timeout(options.timeoutMs || 20000), redirect: 'error' });
    } catch { if (attempt + 1 >= attempts) throw new Error('Public feed request timed out or failed; no reconciliation performed.'); await pause(500 * 2 ** attempt); continue; }
    if ((response.status === 429 || response.status >= 500) && attempt + 1 < attempts) {
      const retry = response.headers.get('Retry-After'); const milliseconds = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 500 * 2 ** attempt;
      // Never retry earlier than requested. A long Retry-After defers this source to its next run.
      if (milliseconds > 30000) throw new Error('Provider requested a longer retry delay; source deferred.');
      await pause(Math.max(0, milliseconds)); continue;
    }
    if (!response.ok) throw new Error(`Public feed returned HTTP ${response.status}; no reconciliation performed.`);
    const declared = Number(response.headers.get('Content-Length') || 0); if (declared > 24000000) throw new Error('Feed exceeded 24MB safety limit.');
    const reader = response.body?.getReader(); if (!reader) throw new Error('Feed body missing.');
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        let next: ReadableStreamReadResult<Uint8Array>;
        try { next = await reader.read(); }
        catch {
          // A response can fail after its headers arrive. Discard this attempt's
          // chunks and start a fresh request; never parse a partial snapshot.
          await reader.cancel().catch(() => {});
          if (attempt + 1 >= attempts) throw new Error('Public feed request timed out or failed; no reconciliation performed.');
          await pause(500 * 2 ** attempt);
          continue request;
        }
        if (next.done) break;
        size += next.value.byteLength;
        if (size > 24000000) { await reader.cancel().catch(() => {}); throw new Error('Feed exceeded 24MB safety limit.'); }
        chunks.push(next.value);
      }
    } finally { reader.releaseLock(); }
    const body = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder().decode(body)); } catch { throw new Error('Feed is not valid JSON; no reconciliation performed.'); }
  }
  throw new Error('Feed request failed.');
}

export async function mapConcurrent<T, R>(values: T[], limit: number, run: (value: T) => Promise<R>): Promise<R[]> {
  const output: R[] = new Array(values.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => { for (;;) { const index = next++; if (index >= values.length) break; output[index] = await run(values[index]); } }));
  return output;
}
