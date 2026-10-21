import { createHash } from 'node:crypto';
import type { Job, JobSource } from '../domain/types';
import type { ProviderPosting } from './adapters';
import { classify, employment, extractExperience, extractSkills, parseSalaryText, workArrangement } from './classification';

export function normalizePosting(posting: ProviderPosting, source: JobSource, now: string): Job {
  const experience = extractExperience(posting.description); const skills = extractSkills(posting.description);
  const type = employment(posting.employment, posting.title, posting.description);
  const classification = classify(posting.title, posting.description, posting.locations, type.type, experience);
  const content = { ...posting, ...classification, experience, skills, employment: type };
  return { id: `${source.provider}:${source.board}:${posting.externalId}`, sourceId: source.id, externalId: posting.externalId, employerId: source.employerId, company: source.company, title: posting.title, postingUrl: posting.postingUrl, applicationUrl: posting.applicationUrl, locations: posting.locations, countryEvidence: posting.locations.filter(l => l.country).map(l => `${l.label}: ${l.country}`), workArrangement: workArrangement(posting.workMode, posting.locations.map(l => l.label).join('; ')), employmentType: type.type, employmentEvidence: type.evidence, ...classification, description: posting.description, summary: posting.description.slice(0, 320), requiredSkills: skills.required, preferredSkills: skills.preferred, experience, salary: posting.salary.length ? posting.salary : parseSalaryText(posting.description), timing: { graduationStart: null, graduationEnd: null, earliestStart: null, latestStart: null, deadline: null, deadlineVerified: false, evidence: [] }, availability: 'open', sourcePostedAt: posting.sourcePostedAt, sourceUpdatedAt: posting.sourceUpdatedAt, sourcePublishedAt: posting.sourcePublishedAt, firstSeenAt: now, lastSeenAt: now, lastVerifiedAt: now, contentHash: createHash('sha256').update(JSON.stringify(content)).digest('hex') };
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
