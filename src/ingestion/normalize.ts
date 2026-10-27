import { createHash } from 'node:crypto';
import listingReviews from '../../data/listing-reviews.json';
import { extractEligibility } from './eligibility';
import type { Job, JobSource } from '../domain/types';
import type { ProviderPosting } from './adapters';
import { classify, employment, extractExperience, extractSkills, parseSalaryText, workArrangement } from './classification';

export function normalizePosting(posting: ProviderPosting, source: JobSource, now: string): Job {
  const experience = extractExperience(posting.description); const skills = extractSkills(posting.description);
  const type = employment(posting.employment, posting.title, posting.description);
  const classification = classify(posting.title, posting.description, posting.locations, type.type, experience, posting.companyName || source.company);
  const { eligibility, timing } = extractEligibility(posting.title, posting.description);
  const review = listingReviews.find(item => item.sourceId === source.id && item.externalId === posting.externalId && item.publisherTitle === posting.title);
  const sourceReview: Job['sourceReview'] = review ? { status: 'employer-conflict', reason: review.reason, evidenceUrl: review.evidenceUrl, checkedAt: review.checkedAt } : undefined;
  const content = { ...posting, ...classification, experience, skills, employment: type, eligibility, timing, sourceReview };
  const company = posting.companyName || source.company;
  // Source employer_id is the publisher FK. Private company grouping must use
  // the actual company, independently of the job or publishing source.
  const marketIdentity = source.provider === 'jobicy' ? {
    publisher: { name: 'Jobicy', url: posting.postingUrl, kind: 'aggregator' as const },
    employerGroupingKey: `market-company:${createHash('sha256').update(company.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')).digest('hex')}`,
  } : {};
  return { id: `${source.provider}:${source.board}:${posting.externalId}`, sourceId: source.id, externalId: posting.externalId, employerId: source.employerId, company, title: posting.title, postingUrl: posting.postingUrl, applicationUrl: posting.applicationUrl, locations: posting.locations, countryEvidence: posting.locations.filter(l => l.country).map(l => `${l.label}: ${l.country}`), workArrangement: workArrangement(posting.workMode, posting.locations.map(l => l.label).join('; ')), employmentType: type.type, employmentEvidence: type.evidence, ...classification, description: posting.description, summary: posting.description.slice(0, 320), requiredSkills: skills.required, preferredSkills: skills.preferred, experience, salary: posting.salary.length ? posting.salary : parseSalaryText(posting.description), eligibility, timing, ...(sourceReview ? { sourceReview } : {}), availability: 'open', sourcePostedAt: posting.sourcePostedAt, sourceUpdatedAt: posting.sourceUpdatedAt, sourcePublishedAt: posting.sourcePublishedAt, firstSeenAt: now, lastSeenAt: now, lastVerifiedAt: now, contentHash: createHash('sha256').update(JSON.stringify(content)).digest('hex'), ...marketIdentity };
}

/** Only exact application URLs with the same external identity are duplicate records.
 * Distinct requisitions sharing a landing page must remain distinct. */
export function deduplicateJobs(jobs: Job[]): Job[] {
  return [...new Map(jobs.map(j => [`${j.sourceId}:${j.externalId}:${j.applicationUrl || ''}`, j])).values()];
}

export interface SeenRecord { externalId: string; availability: Job['availability']; missingSince: string | null; missingCount: number; }
/** Mirrors the atomic SQL finalizer; failures/quarantine cannot advance absence evidence. */
export function reconcileAbsences(previous: SeenRecord[], seen: Set<string>, checkedAt: string, complete: boolean, previousRawCount: number, rawCount: number): { records: SeenRecord[]; quarantined: boolean } {
  const quarantined = complete && previousRawCount >= 20 && rawCount < previousRawCount * 0.4;
  if (!complete || quarantined) return { records: previous.map(p => ({ ...p })), quarantined };
  return { quarantined, records: previous.map(p => {
    if (seen.has(p.externalId)) return { ...p, availability: 'open', missingSince: null, missingCount: 0 };
    if (!p.missingSince) return { ...p, availability: 'availability_unconfirmed', missingSince: checkedAt, missingCount: 1 };
    if (Date.parse(checkedAt) - Date.parse(p.missingSince) < 12 * 3600000) return { ...p };
    return { ...p, availability: 'closed', missingCount: p.missingCount + 1 };
  }) };
}
