import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { fetchBoard } from '../src/ingestion/adapters';
import { fetchPublicJson, mapConcurrent } from '../src/ingestion/http';
import { normalizePosting, deduplicateJobs } from '../src/ingestion/normalize';
import { loadRegistry } from '../src/ingestion/registry';

const args = process.argv.slice(2);
if (args.some((a, i) => !['--dry-run', '--source'].includes(a) && args[i - 1] !== '--source')) throw new Error('Usage: npm run ingest -- [--dry-run] [--source source-id]');
const dryRun = args.includes('--dry-run'); const sourceIndex = args.indexOf('--source'); const sourceId = sourceIndex >= 0 ? args[sourceIndex + 1] : null;
if (sourceIndex >= 0 && (!sourceId || sourceId.startsWith('--'))) throw new Error('--source requires an exact registry source ID.');
const registry = await loadRegistry();
if (sourceId && !registry.some(s => s.id === sourceId)) throw new Error('Unknown source ID.');
const sources = registry.filter(s => s.enabled && s.state === 'verified' && (!sourceId || s.id === sourceId));
const server = dryRun ? null : z.object({ SUPABASE_URL: z.string().url(), SUPABASE_SECRET_KEY: z.string().min(20) }).parse(process.env);
const client = server ? createClient(server.SUPABASE_URL, server.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
if (client) {
  const employers = [...new Map(registry.map(s => [s.employerId, { id: s.employerId, name: s.company, careers_url: s.careersUrl }])).values()];
  const { error: employerError } = await client.from('employers').upsert(employers); if (employerError) throw new Error(`Employer registry write failed (${employerError.code}).`);
  const { data: existing, error: identityError } = await client.from('job_sources').select('id,provider,board_id,region');
  if (identityError) throw new Error(`Existing source identity check failed (${identityError.code}).`);
  for (const entry of registry) {
    const previous = existing?.find(s => s.id === entry.id);
    if (previous && (previous.provider !== entry.provider || previous.board_id !== entry.board || (previous.region || 'global') !== (entry.region || 'global'))) throw new Error(`Source ${entry.id} changed board identity. Create a new source ID for a board migration; preserve existing catalog provenance.`);
  }
  // Synchronize disabled entries too: a registry disable must immediately remove
  // its catalog from public RLS reads, even when no boards are fetched this run.
  const { error: sourceError } = await client.from('job_sources').upsert(registry.map(s => ({ id: s.id, employer_id: s.employerId, provider: s.provider, board_id: s.board, region: s.region || 'global', state: s.state, enabled: s.enabled, verified_at: s.verifiedAt, evidence_url: s.evidenceUrl, usage_note: s.usageReview })));
  if (sourceError) throw new Error(`Source registry write failed (${sourceError.code}).`);
}
if (!sources.length) console.log('No enabled verified sources selected. Registry metadata was synchronized only in production mode.');
const results = await mapConcurrent(sources, 3, async source => {
  const checkedAt = new Date().toISOString(); const runKey = randomUUID();
  try {
    const snapshot = await fetchBoard(source, fetchPublicJson, checkedAt);
    const jobs = deduplicateJobs(snapshot.postings.map(p => normalizePosting(p, source, checkedAt)));
    const relevant = jobs.filter(j => j.classification.scope === 'included').length; const needsDetails = jobs.filter(j => j.classification.scope === 'needs-details').length;
    let status = 'dry-run';
    if (client) {
      const payload = jobs.map(job => {
        const { description, ...summary } = job;
        // Keep every source identity for complete-snapshot reconciliation. The
        // finalizer only stores detail text for relevant jobs; omitted excluded
        // descriptions avoid repeatedly decoding megabytes of unused content.
        return { external_id: job.externalId, title: job.title, posting_url: job.postingUrl, application_url: job.applicationUrl,
          summary, description: job.classification.scope === 'excluded' ? '' : description || '', content_hash: job.contentHash,
          source_published_at: job.sourcePublishedAt, source_updated_at: job.sourceUpdatedAt };
      });
      const { data, error } = await client.rpc('finalize_source_run', { p_source_id: source.id, p_run_key: runKey, p_jobs: payload, p_complete: true, p_raw_count: snapshot.rawCount, p_warning: null, p_checked_at: checkedAt });
      if (error) throw new Error(`Atomic finalization failed (${error.code}).`); status = JSON.stringify(data);
    }
    console.log(`${source.id}: ${snapshot.rawCount} raw, ${jobs.length} listed, ${relevant} in scope, ${needsDetails} need details; ${status}`);
    return { source: source.id, ok: true, status };
  } catch (error) {
    const message = error instanceof Error && !('issues' in error) ? error.message : 'Source payload failed validation; no reconciliation performed.';
    if (client) { const { error: failureError } = await client.rpc('finalize_source_run', { p_source_id: source.id, p_run_key: runKey, p_jobs: [], p_complete: false, p_raw_count: 0, p_warning: message.slice(0, 240), p_checked_at: checkedAt }); if (failureError) console.error(`${source.id}: failure recording unavailable (${failureError.code})`); }
    console.error(`${source.id}: FAILED — ${message}`); return { source: source.id, ok: false, status: message };
  }
});
console.log(`${dryRun ? 'Dry-run (no database writes)' : 'Production import'}: ${results.filter(r => r.ok).length}/${results.length} sources completed. Public feeds never fall back to fixtures.`);
if (results.some(r => !r.ok || /quarantined/.test(r.status))) process.exitCode = 1;
