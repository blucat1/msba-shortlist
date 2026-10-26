import { DEFAULT_PREFERENCES, type Preferences } from '../domain/types';
import type { ResumeProfile } from '../domain/resume';
import type { ExperienceView } from '../domain/experience';
import { filtersFromParams, type MatchingMode } from './discovery-options';

export const DEFAULT_RECOMMENDATION_EXPERIENCE: ExperienceView = 'early-career';

/** Recommendations include supported 0–3-year roles; explicit views and All
 * listings keep their own controls. Empty/reset options use this default. */
export function recommendationFilters(options: URLSearchParams) {
  const effective = new URLSearchParams(options);
  if (!effective.get('career')) effective.set('career', DEFAULT_RECOMMENDATION_EXPERIENCE);
  return filtersFromParams(effective);
}

// Only public search criteria belong in shareable recommendation URLs.
// Resume text, extracted skills and confirmed profile fields are never accepted.
export const RECOMMENDATION_KEYS = ['match', 'career', 'role', 'location', 'work', 'q', 'pay', 'unknown-pay', 'experience', 'unknown-experience', 'details'] as const;

export function readRecommendationOptions(params: URLSearchParams): URLSearchParams {
  const result = new URLSearchParams();
  for (const key of RECOMMENDATION_KEYS) if (params.has(`rec-${key}`)) result.set(key, params.get(`rec-${key}`)!);
  return result;
}

export function writeRecommendationOptions(current: URLSearchParams, draft: URLSearchParams): URLSearchParams {
  const result = new URLSearchParams(current);
  for (const key of [...result.keys()]) if (key.startsWith('rec-')) result.delete(key);
  for (const key of RECOMMENDATION_KEYS) if (draft.has(key)) result.set(`rec-${key}`, draft.get(key)!);
  return result;
}

export function recommendationMode(options: URLSearchParams): MatchingMode {
  const value = options.get('match');
  return value === 'resume' || value === 'combined' ? value : 'filters';
}

export function recommendationPreferences(base: Preferences, options: URLSearchParams): Preferences {
  const filters = recommendationFilters(options);
  return { ...base,
    ...(options.has('role') ? { roleFamilies: filters.roleFamilies, primaryRoleFamilies: base.primaryRoleFamilies.filter(role => filters.roleFamilies.includes(role)) } : {}),
    ...(options.has('location') ? { locations: filters.locations } : {}),
    ...(options.has('work') ? { workArrangements: filters.workArrangements.filter(work => work !== 'unknown') } : {}),
    ...(options.has('pay') ? { desiredSalary: filters.minAnnualBaseUsd, salaryCurrency: 'USD' } : {}),
  };
}

export function recommendationResumePreferences(profile: ResumeProfile, timezone: string): Preferences {
  return { ...DEFAULT_PREFERENCES, timezone, graduationMonth: null, graduationDate: null, earliestStart: null,
    roleFamilies: profile.roleInterests, primaryRoleFamilies: [], skills: profile.skills, yearsExperience: profile.yearsExperience,
    educationLevel: profile.educationLevel, degreeField: profile.degreeField };
}
