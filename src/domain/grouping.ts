import { catalogCompanyKey } from './records';
import type { Job } from './types';

export interface ListingGroup<T extends { job: Job }> {
  key: string;
  representative: T;
  variants: T[];
  listingCount: number;
}
const normalized = (text: string) => text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const sortedText = (items: string[]) => items.map(normalized).sort();

/** Exact recorded requirements only. Location/pay variants retain every requisition.
 * Identical summaries are also required because extraction can miss qualifications. */
function fingerprint(job: Job): string {
  return JSON.stringify({
    company: [catalogCompanyKey(job), normalized(job.company)], title: normalized(job.title),
    summary: normalized(job.summary), scope: job.classification.scope,
    employment: job.employmentType, arrangement: job.workArrangement, availability: job.availability,
    roles: [...job.roleFamilies].sort(), requiredSkills: sortedText(job.requiredSkills), preferredSkills: sortedText(job.preferredSkills),
    experience: { ...job.experience, alternatives: sortedText(job.experience.alternatives) },
    eligibility: job.eligibility ?? null, timing: job.timing, sourceReview: job.sourceReview ?? null,
  });
}

/** Keeps ranked order and original records; grouping never merges saved/application IDs. */
export function groupSimilarListings<T extends { job: Job }>(rows: readonly T[]): ListingGroup<T>[] {
  const groups = new Map<string, ListingGroup<T>>();
  for (const row of rows) {
    const identity = fingerprint(row.job), existing = groups.get(identity);
    if (existing) { existing.variants.push(row); existing.listingCount += 1; }
    else groups.set(identity, { key: row.job.id, representative: row, variants: [], listingCount: 1 });
  }
  return [...groups.values()];
}
