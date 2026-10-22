import type { Preferences } from './types';
export const COHORT = { graduationDate: '2027-05-15', graduationMonth: '2027-05', earliestStart: '2027-05-16', label: 'May 15, 2027 graduation' } as const;
/** Old profiles that never chose timing receive the visible cohort baseline.
 * Explicit new opt-outs and any prior timing choice remain unchanged. */
export function mergeCohortPreferences(base: Preferences, stored: Partial<Preferences>): Preferences {
  const merged = { ...base, ...stored };
  if (Object.hasOwn(stored, 'graduationDate')) return merged;
  if (stored.graduationMonth || stored.earliestStart) return { ...merged, graduationDate: null };
  return { ...merged, graduationDate: COHORT.graduationDate, graduationMonth: COHORT.graduationMonth, earliestStart: COHORT.earliestStart };
}
export function withCohortDefaults(preferences: Preferences): Preferences { return mergeCohortPreferences(preferences, preferences); }
