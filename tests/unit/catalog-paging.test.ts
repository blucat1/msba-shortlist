import { describe, expect, it, vi } from 'vitest';
import { readCatalogPages, type CatalogPageRequest } from '../../src/repositories/catalog-paging';

const rows = (start: number, count: number) => Array.from({ length: count }, (_, index) => ({ id: `job-${start + index}` }));
const options = { pageSize: 500, limit: 5000 };

describe('public catalog paging', () => {
  it('loads all 1,201 records before returning and requests one exact count', async () => {
    const catalog = rows(0, 1201);
    const fetchPage = vi.fn(async ({ from, to, exactCount }: CatalogPageRequest) => ({
      data: catalog.slice(from, to + 1), count: exactCount ? catalog.length : null, error: null,
    }));
    const result = await readCatalogPages(fetchPage, options);
    expect(result).toEqual({ rows: catalog, total: 1201, truncated: false });
    expect(fetchPage.mock.calls.map(([request]) => request)).toEqual([
      { from: 0, to: 499, exactCount: true },
      { from: 500, to: 999, exactCount: false },
      { from: 1000, to: 1499, exactCount: false },
    ]);
  });

  it('deduplicates overlapping pages and reports the missing unique records honestly', async () => {
    const pages = [rows(0, 500), rows(499, 500), rows(999, 201)];
    const fetchPage = vi.fn(async ({ from, exactCount }: CatalogPageRequest) => ({
      data: pages[from / 500], count: exactCount ? 1201 : null, error: null,
    }));
    const result = await readCatalogPages(fetchPage, options);
    expect(result.rows).toEqual(rows(0, 1200));
    expect(new Set(result.rows.map(row => row.id)).size).toBe(1200);
    expect(result.total).toBe(1201);
    expect(result.truncated).toBe(true);
  });

  it('stops at the 5,000-row read cap and preserves a known 6,000-record total', async () => {
    const catalog = rows(0, 6000);
    const fetchPage = vi.fn(async ({ from, to, exactCount }: CatalogPageRequest) => ({
      data: catalog.slice(from, to + 1), count: exactCount ? catalog.length : null, error: null,
    }));
    const result = await readCatalogPages(fetchPage, options);
    expect(result.rows).toEqual(catalog.slice(0, 5000));
    expect(result.total).toBe(6000);
    expect(result.truncated).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(10);
    expect(fetchPage.mock.calls.filter(([request]) => request.exactCount)).toHaveLength(1);
  });

  it('rejects a later page error instead of returning a partial catalog', async () => {
    const fetchPage = vi.fn(async ({ from }: CatalogPageRequest) => from === 0
      ? { data: rows(0, 500), count: 1201, error: null }
      : { data: null, count: null, error: { message: 'canceling statement due to statement timeout' } });
    await expect(readCatalogPages(fetchPage, options)).rejects.toThrow('statement timeout');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('marks a capped result limited when its exact count is unavailable', async () => {
    const result = await readCatalogPages(async ({ from }) => ({ data: rows(from, 500), count: null, error: null }), { pageSize: 500, limit: 1000 });
    expect(result.rows).toHaveLength(1000);
    expect(result.total).toBe(1000);
    expect(result.truncated).toBe(true);
  });

  it('keeps a fully loaded exact-cap result complete and handles an empty catalog', async () => {
    const full = await readCatalogPages(async ({ from, exactCount }) => ({ data: rows(from, 500), count: exactCount ? 1000 : null, error: null }), { pageSize: 500, limit: 1000 });
    expect(full.rows).toHaveLength(1000);
    expect(full.truncated).toBe(false);
    expect(await readCatalogPages(async () => ({ data: [], count: 0, error: null }), options)).toEqual({ rows: [], total: 0, truncated: false });
  });
});
