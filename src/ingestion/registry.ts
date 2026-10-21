import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { JobSource } from '../domain/types';

export const sourceSchema = z.object({ id: z.string().min(1), employerId: z.string().min(1), company: z.string().min(1), careersUrl: z.string().url(), provider: z.enum(['greenhouse', 'lever', 'ashby']), board: z.string().regex(/^[a-zA-Z0-9_-]+$/), region: z.enum(['global', 'eu']).optional(), state: z.enum(['candidate', 'verified', 'disabled', 'failed']), enabled: z.boolean(), verifiedAt: z.string().datetime().nullable(), evidenceUrl: z.string().url().nullable(), usageReview: z.string().min(20), lastSuccessfulCheck: z.string().datetime().nullable(), lastAttemptAt: z.string().datetime().nullable(), rawCount: z.number().int().nonnegative().nullable(), relevantCount: z.number().int().nonnegative().nullable(), error: z.string().nullable(), notes: z.string().optional() }).superRefine((s, ctx) => { if (s.enabled && (s.state !== 'verified' || !s.verifiedAt || !s.evidenceUrl)) ctx.addIssue({ code: 'custom', message: 'Enabled sources require verified identity and evidence.' }); });
export async function loadRegistry(path = new URL('../../data/employers.json', import.meta.url)): Promise<JobSource[]> {
  const sources = z.array(sourceSchema).parse(JSON.parse(await readFile(path, 'utf8')));
  if (new Set(sources.map(s => s.id)).size !== sources.length) throw new Error('Duplicate source IDs in employer registry.');
  if (new Set(sources.map(s => `${s.provider}:${s.region || 'global'}:${s.board}`)).size !== sources.length) throw new Error('Duplicate provider boards in employer registry.');
  return sources;
}
