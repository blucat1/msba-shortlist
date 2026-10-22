import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import type { CatalogRow, Database, Json, SourceRow } from '../../src/lib/database.types';
import { createSupabaseRepository } from '../../src/repositories/supabase';

const now = new Date('2026-10-22T18:00:00Z');
const example = createDemoSnapshot(now).jobs[0];
function row(index: number, patch: Partial<CatalogRow> = {}): CatalogRow {
  const summary = { ...example, isDemo: undefined, sourcePostedAt: '2026-10-01T12:00:00Z', classification: { ...example.classification, scope: 'excluded' }, primaryRoleFamily: 'business-analytics' };
  return { id: `public-${String(index).padStart(5, '0')}`, source_id: 'source-ats', employer_id: 'public-employer', external_id: String(index),
    title: 'Fictional Data Analyst', posting_url: 'https://example.com/job', application_url: 'https://example.com/apply', summary: JSON.parse(JSON.stringify(summary)) as Json,
    content_hash: 'synthetic-hash', availability: 'open', source_published_at: '2026-10-20T12:00:00Z', source_updated_at: '2026-10-21T12:00:00Z',
    first_seen_at: '2026-10-02T12:00:00Z', last_seen_at: '2026-10-19T12:00:00Z', missing_since: null, missing_count: 0, ...patch };
}
function source(id: string, provider: SourceRow['provider']): SourceRow {
  return { id, employer_id: 'public-employer', provider, board_id: 'public-board', region: null, state: 'verified', enabled: true,
    verified_at: now.toISOString(), evidence_url: 'https://example.com/careers', usage_note: 'Synthetic public test', last_success_at: now.toISOString(), last_check_at: now.toISOString(),
    last_run_status: 'success', snapshot_count: 1, raw_count: 1, relevant_count: 1, last_warning: null };
}
interface Trace {
  table: string; columns?: string; counted?: boolean; range?: [number, number];
  filters: { kind: 'eq' | 'neq' | 'not'; column: string; value: unknown; operator?: string }[];
}
interface MockOptions { rows?: CatalogRow[]; sources?: SourceRow[]; sourceError?: string; failOffset?: number; malformed?: boolean; }
function publicClient(options: MockOptions = {}) {
  const traces: Trace[] = [], writes = vi.fn(() => { throw new Error('Public catalog browsing attempted a mutation.'); });
  const auth = { getSession: vi.fn(async () => ({ data: { session: null }, error: null })), getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn() };
  const from = vi.fn((table: string) => {
    if (!['catalog_jobs', 'job_sources', 'employers'].includes(table)) throw new Error(`Public catalog attempted a private table: ${table}.`);
    const trace: Trace = { table, filters: [] }; traces.push(trace);
    const execute = async () => {
      if (table === 'job_sources') return { data: options.sources ?? [source('source-ats', 'greenhouse')], error: options.sourceError ? { message: options.sourceError } : null };
      if (table === 'employers') return { data: [], error: null };
      const offset = trace.range?.[0] ?? 0;
      if (options.failOffset === offset) return { data: null, error: { message: 'Synthetic catalog page failed.' }, count: null };
      let selected = options.rows ?? [];
      for (const filter of trace.filters) selected = selected.filter(value => {
        const summary = value.summary as unknown as typeof example;
        const actual = filter.column === 'summary->classification->>scope' ? summary.classification.scope : filter.column === 'summary->>primaryRoleFamily' ? summary.primaryRoleFamily : filter.column === 'availability' ? value.availability : value.id;
        return filter.kind === 'eq' ? actual === filter.value : filter.kind === 'neq' ? actual !== filter.value : filter.operator === 'is' && filter.value === null ? actual !== null && actual !== undefined : false;
      });
      const data = selected.slice(offset, (trace.range?.[1] ?? selected.length - 1) + 1);
      return { data: options.malformed ? data.map(value => ({ ...value, summary: { company: 42 } })) : data, error: null, count: selected.length };
    };
    const builder = {
      select: (columns: string, options?: { count?: string }) => { trace.columns = columns; trace.counted = options?.count === 'exact'; return builder; },
      order: () => builder,
      eq: (column: string, value: unknown) => { trace.filters.push({ kind: 'eq', column, value }); return builder; },
      neq: (column: string, value: unknown) => { trace.filters.push({ kind: 'neq', column, value }); return builder; },
      not: (column: string, operator: string, value: unknown) => { trace.filters.push({ kind: 'not', column, operator, value }); return builder; },
      range: (first: number, last: number) => { trace.range = [first, last]; return execute(); },
      insert: writes, upsert: writes, update: writes, delete: writes,
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => execute().then(resolve, reject),
    };
    return builder;
  });
  const client = { auth, from, rpc: writes };
  return { repository: createSupabaseRepository(client as unknown as SupabaseClient<Database>), client, traces, writes };
}
beforeEach(() => sessionStorage.clear());

describe('optional public catalog expansion', () => {
  it('does not fetch anything on construction or request excluded rows during an ordinary anonymous snapshot', async () => {
    const { repository, client, traces, writes } = publicClient({ rows: [row(1)] });
    expect(client.from).not.toHaveBeenCalled(); expect(client.auth.getSession).not.toHaveBeenCalled();
    const expanded = vi.spyOn(repository, 'getExpandedCatalog');
    const snapshot = await repository.getSnapshot();
    expect(expanded).not.toHaveBeenCalled(); expect(snapshot.userId).toBeNull(); expect(snapshot.jobs).toEqual([]);
    expect(traces.filter(trace => trace.table === 'catalog_jobs').every(trace => trace.filters.some(filter => filter.kind === 'neq' && filter.column === 'summary->classification->>scope' && filter.value === 'excluded'))).toBe(true);
    expect(client.auth.getUser).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it('returns only public relevant excluded rows and preserves uncertain availability without claiming it is open', async () => {
    const included = row(2); (included.summary as unknown as typeof example).classification.scope = 'included';
    const unrelated = row(3); (unrelated.summary as unknown as typeof example).primaryRoleFamily = null;
    const { repository, client, traces, writes } = publicClient({ rows: [row(1), included, unrelated, row(4, { availability: 'closed' }), row(5, { availability: 'availability_unconfirmed' })] });
    const result = await repository.getExpandedCatalog!();
    expect(result.jobs.map(job => job.id)).toEqual(['public-00001', 'public-00005']);
    expect(result).toMatchObject({ total: 2, truncated: false });
    expect(result.jobs[1].availability).toBe('availability_unconfirmed');
    expect(result.jobs.every(job => job.classification.scope === 'excluded' && job.primaryRoleFamily !== null)).toBe(true);
    expect(new Set(traces.map(trace => trace.table))).toEqual(new Set(['job_sources', 'catalog_jobs']));
    expect(client.auth.getSession).not.toHaveBeenCalled(); expect(client.auth.getUser).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it('bounds on-demand reads to 1500 records in pages of 500 and reports the real larger total', async () => {
    const { repository, traces } = publicClient({ rows: Array.from({ length: 1601 }, (_, index) => row(index)) });
    const result = await repository.getExpandedCatalog!();
    expect(result.jobs).toHaveLength(1500); expect(new Set(result.jobs.map(job => job.id)).size).toBe(1500);
    expect(result.total).toBe(1601); expect(result.truncated).toBe(true);
    const pages = traces.filter(trace => trace.table === 'catalog_jobs');
    expect(pages.map(trace => trace.range)).toEqual([[0, 499], [500, 999], [1000, 1499]]);
    expect(pages.every(trace => trace.counted)).toBe(true);
  });

  it('stops after the complete short final page and does not invent truncation', async () => {
    const { repository, traces } = publicClient({ rows: Array.from({ length: 501 }, (_, index) => row(index)) });
    const result = await repository.getExpandedCatalog!();
    expect(result.jobs).toHaveLength(501); expect(result.total).toBe(501); expect(result.truncated).toBe(false);
    expect(traces.filter(trace => trace.table === 'catalog_jobs')).toHaveLength(2);
  });

  it('keeps employer-feed verification tied to source success and rolling-market verification tied to that listing', async () => {
    const market = row(2, { source_id: 'source-market', last_seen_at: '2026-10-19T08:00:00Z' });
    const missing = row(3, { source_id: 'not-in-source-results' });
    const { repository } = publicClient({ rows: [row(1), market, missing], sources: [source('source-ats', 'greenhouse'), source('source-market', 'jobicy')] });
    const result = await repository.getExpandedCatalog!();
    expect(result.jobs[0].lastVerifiedAt).toBe(now.toISOString());
    expect(result.jobs[1].lastVerifiedAt).toBe(market.last_seen_at);
    expect(result.jobs[2].lastVerifiedAt).toBeNull();
    expect(result.jobs[0]).toMatchObject({ sourcePostedAt: '2026-10-01T12:00:00Z', sourcePublishedAt: '2026-10-20T12:00:00Z', firstSeenAt: '2026-10-02T12:00:00Z' });
  });

  it('propagates source errors and never replaces failed source metadata with invented freshness', async () => {
    const { repository, traces } = publicClient({ sourceError: 'Synthetic source access failed.', rows: [row(1)] });
    await expect(repository.getExpandedCatalog!()).rejects.toThrow('Synthetic source access failed.');
    expect(traces.map(trace => trace.table)).toEqual(['job_sources']);
  });

  it('rejects a failed later page instead of returning a misleading successful partial expansion', async () => {
    const { repository } = publicClient({ rows: Array.from({ length: 501 }, (_, index) => row(index)), failOffset: 500 });
    await expect(repository.getExpandedCatalog!()).rejects.toThrow('Synthetic catalog page failed.');
  });

  it('surfaces invalid public row data rather than substituting demo or empty results', async () => {
    const { repository } = publicClient({ rows: [row(1)], malformed: true });
    await expect(repository.getExpandedCatalog!()).rejects.toThrow();
  });
});
