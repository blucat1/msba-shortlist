import type { MatchReason, RankedJob } from './ranking';
import type { ResumeCompatibility } from './resume-matching';

export interface RecommendationHighlights {
  method: 'preferences' | 'resume';
  reasons: string[];
  watchouts: string[];
  coverage: number;
  coverageLabel: string;
  unknownCount: number;
  unknownLabel: string;
  fallback: string | null;
}

const unique = (values: readonly string[]) => [...new Map(values.filter(value => value.trim()).map(value => [value.normalize('NFKC').trim().toLowerCase(), value.trim()])).values()];
const percent = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
const shortList = (values: readonly string[]) => `${values.slice(0, 3).join(', ')}${values.length > 3 ? ` (+${values.length - 3} more)` : ''}`;

/** Display evidence from the existing comparison, never a new score or sort.
 * Resume comparisons deliberately do not inherit saved-preference reasons or
 * conflicts. Returned text is transient display data, not a persistence format. */
export function recommendationHighlights(row: RankedJob, resumeMatch?: ResumeCompatibility): RecommendationHighlights {
  const method = resumeMatch ? 'resume' : 'preferences';
  const reasons = unique(resumeMatch ? resumeReasons(resumeMatch) : preferenceReasons(row)).slice(0, 2);
  const coverage = percent(resumeMatch?.coverage ?? row.coverage);
  const unknownCount = resumeMatch ? new Set(resumeMatch.unverified.map(item => item.id)).size : unique(row.missing).length;
  const operationalWarnings = [
    row.job.availability === 'closed' ? 'Listing is closed; do not treat it as an open vacancy.' : row.job.availability === 'availability_unconfirmed' ? 'Availability needs confirmation.' : '',
    row.job.classification.scope === 'excluded' ? 'Outside the graduate catalog; review the listing’s scope.' : row.job.classification.scope === 'needs-details' ? 'US location or full-time status needs verification.' : '',
    ...row.caveats.filter(value => value === 'Source verification is stale; check the employer page.'),
    ...row.conflicts.filter(value => value.startsWith('The source application deadline has passed;')),
  ];
  const missingRequired = resumeMatch?.missing.filter(item => item.strength === 'required') ?? [];
  const watchouts = unique([
    row.job.sourceReview?.reason ?? '',
    ...(resumeMatch ? resumeMatch.conflicts.map(item => item.reason) : row.conflicts),
    ...operationalWarnings,
    ...(resumeMatch ? missingRequired.length ? [`Required items not recorded in your reviewed profile: ${shortList(unique(missingRequired.map(item => item.label)))}. Review before applying.`] : [] : row.caveats),
  ]).slice(0, 2);
  return {
    method, reasons, watchouts, coverage, unknownCount,
    coverageLabel: resumeMatch ? `${coverage}% of resume comparison weight assessed` : `${coverage}% of active preference weight has source evidence`,
    unknownLabel: resumeMatch ? `${unknownCount} unverified resume check${unknownCount === 1 ? '' : 's'}` : `${unknownCount} preference dimension${unknownCount === 1 ? '' : 's'} lack${unknownCount === 1 ? 's' : ''} evidence`,
    fallback: reasons.length ? null : 'No specific overlap recorded yet.',
  };
}

function preferenceReasons(row: RankedJob): string[] {
  const job = row.job;
  const known = (reason: MatchReason) => {
    switch (reason.code) {
      case 'role_interest_match': case 'role_interest_partial': return job.roleFamilies.length > 0;
      case 'required_skills_match': case 'required_skills_partial': return job.requiredSkills.length > 0;
      case 'preferred_skills': return job.preferredSkills.length > 0;
      case 'location_match': return job.locations.some(location => !!location.label.trim());
      case 'work_match': return job.workArrangement !== 'unknown';
      case 'eligibility_graduation': return !!(job.timing.graduationStart || job.timing.graduationEnd) && row.eligibility.some(check => check.criterion === 'graduation' && check.status === 'pass');
      case 'eligibility_start': return !!(job.timing.earliestStart || job.timing.latestStart) && row.eligibility.some(check => check.criterion === 'start' && check.status === 'pass');
      default: return false;
    }
  };
  // A fixed explanation order does not change the incoming ranking or weights.
  const categories = ['role interest', 'required skills', 'preferred skills', 'location & work', 'eligibility'];
  return categories.flatMap(category => row.reasons.filter(reason => reason.dimension === category && known(reason)).map(reason => reason.text));
}

function resumeReasons(result: ResumeCompatibility): string[] {
  const matched = result.matched.filter(item => item.status === 'matched');
  const required = unique(matched.filter(item => item.id.startsWith('requiredSkills:')).map(item => item.label));
  const preferred = unique(matched.filter(item => item.id.startsWith('preferredSkills:')).map(item => item.label));
  return [
    required.length ? `Recorded required skill mentions overlap: ${shortList(required)}.` : '',
    ...matched.filter(item => item.id === 'role').map(item => item.reason),
    preferred.length ? `Recorded preferred skill mentions overlap: ${shortList(preferred)}.` : '',
    ...matched.filter(item => ['experience', 'degreeLevel', 'degreeField'].includes(item.id)).map(item => item.reason),
  ];
}
