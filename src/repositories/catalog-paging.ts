export interface CatalogPageRequest { from: number; to: number; exactCount: boolean; }
export interface CatalogPage<T> {
  data: T[] | null;
  count: number | null;
  error: { message: string } | null;
}

export async function readCatalogPages<T extends { id: string }>(
  fetchPage: (request: CatalogPageRequest) => PromiseLike<CatalogPage<T>>,
  { pageSize, limit }: { pageSize: number; limit: number },
): Promise<{ rows: T[]; total: number; truncated: boolean }> {
  const rows = new Map<string, T>();
  let initialTotal: number | null = null;
  let reachedLimit = false;
  for (let from = 0; from < limit; from += pageSize) {
    const to = Math.min(from + pageSize, limit) - 1;
    const page = await fetchPage({ from, to, exactCount: from === 0 });
    if (page.error) throw new Error(`The cloud request failed. Your changes were not confirmed: ${page.error.message}`);
    if (from === 0) initialTotal = page.count;
    const data = page.data ?? [];
    // Ingestion can move rows between offset pages. Keep their first position
    // and count each catalog identity once, rather than inflating coverage.
    for (const row of data) if (!rows.has(row.id)) rows.set(row.id, row);
    if (data.length < to - from + 1) break;
    reachedLimit = to + 1 === limit;
  }
  // The first exact count is the baseline. Concurrent additions can establish
  // a larger observed minimum, but duplicate page rows never increase it.
  const total = Math.max(initialTotal ?? 0, rows.size);
  return {
    rows: [...rows.values()], total,
    truncated: rows.size < total || (reachedLimit && initialTotal !== rows.size),
  };
}
