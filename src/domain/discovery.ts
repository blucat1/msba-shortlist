import { DAY_MS, dateOnlyInTimezone, freshness, isDateOnly } from './dates';
import { assessExperience, isLeadershipTitle, matchesExperienceView, type ExperienceView } from './experience';
import { rankJob, type RankedJob } from './ranking';
import { ROLE_LABELS, type DateOnly, type EmploymentType, type Job, type JobSource, type Preferences, type RoleFamily, type SourceProvider, type WorkArrangement } from './types';

export type DiscoveryMode = 'shortlist' | 'catalog';
export type DiscoveryDateBasis = 'posted' | 'published' | 'found';
export interface DiscoveryFilters {
  mode: DiscoveryMode;
  keyword: string;
  keywordMode: 'any' | 'all';
  roleFamilies: RoleFamily[];
  workArrangements: WorkArrangement[];
  employmentTypes: EmploymentType[];
  locations: string[];
  maxRequiredYears: number | null;
  includeUnknownExperience: boolean;
  minAnnualBaseUsd: number | null;
  includeUnknownSalary: boolean;
  /** These three evidence fields never substitute for one another. */
  dateBasis: DiscoveryDateBasis;
  dateFrom: DateOnly | null;
  dateTo: DateOnly | null;
  /** A rolling number of 24-hour days, excluding future timestamps. */
  maxAgeDays: number | null;
  includeUnknownDate: boolean;
  sourceIds: string[];
  providers: SourceProvider[];
  /** Exact employer names, compared without case or incidental whitespace. */
  companies: string[];
  /** Unlike optional facets, an empty availability selection matches no rows. */
  availability: Job['availability'][];
  experienceView: ExperienceView;
  includeNeedsDetails: boolean;
  includeExcluded: boolean;
  includeKnownConflicts: boolean;
  includeTracked: boolean;
  includeDismissed: boolean;
  /** Allows results beyond the existing 72-hour verification cutoff. */
  includeStale: boolean;
  sort: 'preference' | 'found-newest' | 'date-newest';
}
export interface DiscoveryContext {
  now?: Date;
  sources?: readonly JobSource[];
  trackedJobIds?: readonly string[];
  dismissedJobIds?: readonly string[];
}

/** A reset creates independent arrays and returns to strict graduate discovery.
 * Choosing catalog is explicit: all experience tiers and uncertain scope become
 * visible, while excluded scope, conflicts, closed/unconfirmed and stale do not. */
export function createDiscoveryFilters(mode: DiscoveryMode = 'shortlist'): DiscoveryFilters {
  return {
    mode, keyword: '', keywordMode: 'all', roleFamilies: [], workArrangements: [], employmentTypes: [], locations: [],
    maxRequiredYears: null, includeUnknownExperience: false, minAnnualBaseUsd: null, includeUnknownSalary: false,
    dateBasis: 'posted', dateFrom: null, dateTo: null, maxAgeDays: null, includeUnknownDate: false,
    sourceIds: [], providers: [], companies: [], availability: ['open'], experienceView: mode === 'catalog' ? 'all' : 'new-grad',
    includeNeedsDetails: mode === 'catalog', includeExcluded: false, includeKnownConflicts: false,
    includeTracked: false, includeDismissed: false, includeStale: false, sort: 'preference',
  };
}

const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const timestamp = (value: string | null): number | null => {
  if (!value) return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
};
const dateValue = (job: Job, basis: DiscoveryDateBasis) => basis === 'posted' ? job.sourcePostedAt : basis === 'published' ? job.sourcePublishedAt : job.firstSeenAt;
const unique = <T>(values: T[]) => [...new Set(values)];

/** Validate typed callers too: NaN or malformed ranges must not remove a filter. */
export function normalizeDiscoveryFilters(input: Partial<DiscoveryFilters> = {}): DiscoveryFilters {
  const result = { ...createDiscoveryFilters(input.mode), ...input };
  for (const key of ['maxRequiredYears', 'minAnnualBaseUsd', 'maxAgeDays'] as const) {
    const value = result[key];
    if (value !== null && (!Number.isFinite(value) || value < 0 || (key === 'maxAgeDays' && value === 0))) throw new Error(`Invalid discovery filter: ${key}.`);
  }
  for (const key of ['dateFrom', 'dateTo'] as const) if (result[key] !== null && !isDateOnly(result[key]!)) throw new Error(`Invalid discovery filter: ${key}.`);
  if (result.dateFrom && result.dateTo && result.dateFrom > result.dateTo) throw new Error('The discovery date range is reversed.');
  return { ...result, keyword: result.keyword.trim(), roleFamilies: unique(result.roleFamilies), workArrangements: unique(result.workArrangements),
    employmentTypes: unique(result.employmentTypes), sourceIds: unique(result.sourceIds), providers: unique(result.providers), availability: unique(result.availability),
    locations: unique(result.locations.map(normalize).filter(Boolean)), companies: unique(result.companies.map(normalize).filter(Boolean)),
  };
}

function keywordTerms(query: string): RegExp[] {
  const words = normalize(query).match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu) ?? [];
  return unique(words.map(word => word.replace(/[.-]+$/g, '')).filter(Boolean)).map(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'u');
  });
}

const comparePreference = (a: RankedJob, b: RankedJob) => a.conflicts.length - b.conflicts.length || b.score - a.score || b.coverage - a.coverage
  || Number(b.job.availability === 'open') - Number(a.job.availability === 'open') || b.job.firstSeenAt.localeCompare(a.job.firstSeenAt) || a.job.id.localeCompare(b.job.id);

/** Filter only the supplied catalog. No network, provider fetches or resume data.
 * OR within each selected facet; AND across facets. Reuses the existing evidence
 * assessment without treating unknown years, pay or dates as known values. */
export function discoverJobs(jobs: readonly Job[], preferences: Preferences, input: Partial<DiscoveryFilters> = {}, context: DiscoveryContext = {}): RankedJob[] {
  const filters = normalizeDiscoveryFilters(input), now = context.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error('Discovery requires a valid reference time.');
  const sources = new Map(context.sources?.map(source => [source.id, source]));
  const tracked = new Set(context.trackedJobIds), dismissed = new Set(context.dismissedJobIds);
  const roles = new Set(filters.roleFamilies), arrangements = new Set(filters.workArrangements), employment = new Set(filters.employmentTypes);
  const selectedSources = new Set(filters.sourceIds), providers = new Set(filters.providers), companies = new Set(filters.companies), availability = new Set(filters.availability);
  const words = keywordTerms(filters.keyword), dateActive = !!(filters.dateFrom || filters.dateTo || filters.maxAgeDays !== null);
  const rows: RankedJob[] = [];
  for (const job of jobs) {
    const source = sources.get(job.sourceId);
    // A manually disabled source is not re-enabled by a broad presentation mode.
    if (source && (!source.enabled || source.state === 'disabled')) continue;
    if (!filters.includeTracked && tracked.has(job.id)) continue;
    if (!filters.includeDismissed && dismissed.has(job.id)) continue;
    if (!availability.has(job.availability)) continue;
    const leadership = job.classification.seniority === 'leadership' || isLeadershipTitle(job.title);
    const nonFullTime = job.employmentType !== 'full-time' && job.employmentType !== 'unknown';
    const outsideUs = job.locations.length > 0 && job.locations.every(location => {
      if (!location.country || /\b(?:unknown|worldwide|remote|global)\b/i.test(location.country)) return false;
      return !['us', 'usa', 'unitedstates', 'unitedstatesofamerica'].includes(normalize(location.country).replace(/[^a-z]/g, ''));
    });
    const excludedScope = job.classification.scope === 'excluded' || leadership || nonFullTime || outsideUs;
    if (!filters.includeExcluded && excludedScope) continue;
    if (!filters.includeNeedsDetails && job.classification.scope === 'needs-details') continue;
    if (!filters.includeStale && freshness(job.lastVerifiedAt, now) === 'expired') continue;
    const experience = assessExperience(job);
    if (!matchesExperienceView(experience, filters.experienceView)) continue;
    if (roles.size && !job.roleFamilies.some(role => roles.has(role))) continue;
    if (arrangements.size && !arrangements.has(job.workArrangement)) continue;
    if (employment.size && !employment.has(job.employmentType)) continue;
    if (filters.locations.length && !job.locations.some(location => filters.locations.some(term => normalize([location.label, location.city, location.region, location.country].filter(Boolean).join(' ')).includes(term)))) continue;
    if (selectedSources.size && !selectedSources.has(job.sourceId)) continue;
    if (providers.size && (!source || !providers.has(source.provider))) continue;
    if (companies.size && !companies.has(normalize(job.company))) continue;
    if (words.length) {
      const searchable = normalize([job.title, job.company, job.summary, job.description ?? '', ...job.requiredSkills, ...job.preferredSkills, ...job.roleFamilies.map(role => ROLE_LABELS[role]), ...job.locations.map(location => location.label)].join(' '));
      if (filters.keywordMode === 'any' ? !words.some(word => word.test(searchable)) : !words.every(word => word.test(searchable))) continue;
    }
    const caveats: string[] = [];
    if (filters.maxRequiredYears !== null) {
      const years = experience.requiredYears;
      if (years === null || !Number.isFinite(years) || years < 0) {
        if (!filters.includeUnknownExperience) continue;
        caveats.push('Required years are unverified; included because unknown experience requirements were explicitly allowed.');
      } else if (years > filters.maxRequiredYears) continue;
    }
    if (filters.minAnnualBaseUsd !== null) {
      const knownMinimums = job.salary.filter(band => band.currency.toUpperCase() === 'USD' && band.period === 'year' && band.compensationType === 'base'
        && band.min !== null && Number.isFinite(band.min) && band.min >= 0).map(band => band.min!);
      if (knownMinimums.length ? !knownMinimums.some(minimum => minimum >= filters.minAnnualBaseUsd!) : !filters.includeUnknownSalary) continue;
      if (!knownMinimums.length) caveats.push('Annual USD base minimum is unverified; included because unknown pay was explicitly allowed. No currency conversion or annualization was assumed.');
      else if (job.salary.length > 1 || job.salary.some(band => band.location)) caveats.push('Salary filter matches a published band; location-specific bands and the applicable offer still need review.');
    }
    if (dateActive) {
      const value = dateValue(job, filters.dateBasis), time = timestamp(value);
      if (time === null) {
        if (!filters.includeUnknownDate) continue;
        caveats.push(`The selected ${filters.dateBasis === 'posted' ? 'original posting' : filters.dateBasis === 'published' ? 'last publication' : 'first discovery'} date is unverified; unknown dates were explicitly allowed.`);
      } else {
        const day = value && isDateOnly(value) ? value : dateOnlyInTimezone(new Date(time), preferences.timezone);
        if (filters.dateFrom && day < filters.dateFrom) continue;
        if (filters.dateTo && day > filters.dateTo) continue;
        if (filters.maxAgeDays !== null && (time < now.getTime() - filters.maxAgeDays * DAY_MS || time > now.getTime())) continue;
      }
    }
    const row = rankJob(job, preferences, now);
    if (!filters.includeKnownConflicts && row.conflicts.length) continue;
    if (excludedScope) caveats.push('Outside the supported graduate catalog scope; included only by the explicit excluded-scope option. Verify the original source and classification reasons.');
    if (leadership) caveats.push('People-leadership role; outside normal graduate discovery.');
    if (nonFullTime) caveats.push(`Source employment type is ${job.employmentType}, outside the normal full-time catalog.`);
    if (outsideUs) caveats.push('The source lists only known non-US locations; this is not verified US employment.');
    if (job.availability === 'closed') caveats.push('Closed listing included by your availability selection; it is not presented as an open vacancy.');
    if (job.availability === 'availability_unconfirmed') caveats.push('Availability is unconfirmed; this selection does not establish that the listing is open.');
    const needsWarning = caveats.length > 0;
    rows.push(needsWarning ? { ...row, label: row.conflicts.length ? 'Known conflict' : 'Check details', caveats: [...new Set([...row.caveats, ...caveats])] } : row);
  }
  return rows.sort((a, b) => {
    if (filters.sort !== 'preference') {
      const basis = filters.sort === 'found-newest' ? 'found' : filters.dateBasis;
      const first = timestamp(dateValue(a.job, basis)), second = timestamp(dateValue(b.job, basis));
      if (first !== second) { if (first === null) return 1; if (second === null) return -1; return second - first; }
    }
    return comparePreference(a, b);
  });
}
