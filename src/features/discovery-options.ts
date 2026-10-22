import { createDiscoveryFilters, normalizeDiscoveryFilters, type DiscoveryFilters } from '../domain/discovery';
import { EXPERIENCE_VIEWS } from '../domain/experience';
import { ROLE_FAMILIES } from '../domain/types';

export type MatchingMode = 'filters' | 'resume' | 'combined';
export const MATCHING_MODES: { value: MatchingMode; label: string; description: string }[] = [
  { value: 'filters', label: 'Filters only', description: 'Use search filters and your saved preferences. Your resume does not affect results.' },
  { value: 'resume', label: 'Resume only', description: 'Compare open catalog roles across all experience levels with your reviewed resume. Search filters and saved preferences are paused; source conflicts stay hidden.' },
  { value: 'combined', label: 'Resume + filters', description: 'Apply your filters, then rank the remaining roles by resume compatibility.' },
];
export const FILTER_KEYS = ['q', 'role', 'location', 'work', 'employment', 'experience', 'pay', 'deadline', 'words', 'unknown-experience', 'unknown-pay', 'date-basis', 'from', 'through', 'age', 'unknown-date', 'companies', 'providers', 'sources', 'availability', 'show-saved', 'details', 'stale', 'conflicts', 'excluded'] as const;
export function filterLabel(key: string, value: string): string {
  const flags: Record<string, string> = { 'unknown-experience': 'Unknown experience included', 'unknown-pay': 'Unknown pay included', 'unknown-date': 'Unknown dates included', 'show-saved': value === '0' ? 'Saved & dismissed hidden' : 'Saved & dismissed included', details: value === '0' ? 'Verified scope only' : 'Uncertain scope included', stale: 'Stale results included', conflicts: 'Known conflicts included', excluded: 'Wider scope included' };
  if (flags[key]) return flags[key];
  const labels: Record<string, string> = { q: 'Search', role: 'Roles', location: 'Locations', work: 'Work', employment: 'Employment', experience: 'Maximum years', pay: 'Minimum USD base', deadline: 'Deadline by', words: 'Search words', 'date-basis': 'Date evidence', from: 'From', through: 'Through', age: 'Within days', companies: 'Employers', providers: 'Platforms', sources: 'Feeds', availability: 'Availability' };
  const shown = key === 'role' ? value.split(',').map(role => ROLE_FAMILIES.includes(role as typeof ROLE_FAMILIES[number]) ? role.replaceAll('-', ' ') : role).join(', ') : key === 'availability' && !value ? 'none selected' : value.replaceAll(',', ', ');
  return `${labels[key] || key}: ${shown}`;
}
export function filtersFromParams(params: URLSearchParams, catalog = false): DiscoveryFilters {
  const defaults = createDiscoveryFilters(catalog ? 'catalog' : 'shortlist');
  const flag = (key: string) => params.get(key) === '1';
  const list = (key: string) => (params.get(key) || '').split(',').map(item => item.trim()).filter(Boolean).slice(0, 100);
  const select = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = params.get(key); if (!value) return fallback;
    if (!allowed.includes(value as T)) throw new Error(`Choose a valid ${key.replaceAll('-', ' ')} option.`);
    return value as T;
  };
  const selected = <T extends string>(key: string, allowed: readonly T[]): T[] => {
    const values = list(key); if (values.some(value => !allowed.includes(value as T))) throw new Error(`Choose valid ${key.replaceAll('-', ' ')} options.`);
    return values as T[];
  };
  const number = (key: string, max: number): number | null => {
    const raw = params.get(key); if (!raw) return null;
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error(`Enter a valid ${key === 'pay' ? 'annual base pay' : key} limit.`);
    const value = Number(raw); if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(`Enter a valid ${key === 'pay' ? 'annual base pay' : key} limit.`);
    return value;
  };
  return normalizeDiscoveryFilters({ ...defaults,
    keyword: (params.get('q') || '').slice(0, 500), keywordMode: select<'all' | 'any'>('words', ['all', 'any'], 'all'),
    roleFamilies: selected('role', ROLE_FAMILIES), locations: list('location'),
    workArrangements: selected('work', ['remote', 'hybrid', 'onsite', 'unknown']),
    employmentTypes: selected('employment', ['full-time', 'part-time', 'contract', 'internship', 'unknown']),
    maxRequiredYears: number('experience', 80), includeUnknownExperience: flag('unknown-experience'),
    minAnnualBaseUsd: number('pay', 10_000_000), includeUnknownSalary: flag('unknown-pay'),
    dateBasis: select<'found' | 'posted' | 'published'>('date-basis', ['found', 'posted', 'published'], 'found'), dateFrom: params.get('from') || null, dateTo: params.get('through') || null,
    maxAgeDays: number('age', 3650), includeUnknownDate: flag('unknown-date'), companies: list('companies'), sourceIds: list('sources'),
    providers: selected('providers', ['greenhouse', 'lever', 'ashby', 'jobicy']),
    availability: params.has('availability') ? selected('availability', ['open', 'availability_unconfirmed', 'closed']) : ['open'],
    experienceView: select('career', EXPERIENCE_VIEWS.map(view => view.value), defaults.experienceView),
    includeTracked: flag('show-saved') || catalog && !params.has('show-saved'), includeDismissed: flag('show-saved') || catalog && !params.has('show-saved'),
    includeNeedsDetails: flag('details') || catalog && !params.has('details'), includeStale: flag('stale'),
    includeKnownConflicts: flag('conflicts'), includeExcluded: flag('excluded'),
  });
}
