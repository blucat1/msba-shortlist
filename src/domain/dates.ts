import type { DateOnly } from './types';
export const DAY_MS = 86_400_000;
export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function dateOnlyInTimezone(now = new Date(), timezone = 'America/Los_Angeles'): DateOnly {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(date: DateOnly, count: number): DateOnly {
  if (!isDateOnly(date)) throw new Error('Expected a valid date (YYYY-MM-DD).');
  return new Date(new Date(`${date}T12:00:00Z`).getTime() + count * DAY_MS).toISOString().slice(0, 10);
}
export function daysBetween(from: DateOnly, to: DateOnly): number {
  return Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / DAY_MS);
}
export function formatDate(value: string | null, locale = 'en-US'): string {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}
export function freshness(lastVerifiedAt: string | null, now = new Date()): 'fresh' | 'stale' | 'expired' {
  if (!lastVerifiedAt) return 'expired';
  const age = now.getTime() - new Date(lastVerifiedAt).getTime();
  if (!Number.isFinite(age)) return 'expired';
  return age > 72 * 3_600_000 ? 'expired' : age > 36 * 3_600_000 ? 'stale' : 'fresh';
}
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
