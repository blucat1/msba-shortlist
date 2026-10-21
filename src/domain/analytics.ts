import { addDays, dateOnlyInTimezone, daysBetween } from './dates';
import { ROLE_LABELS, STAGES, type AppSnapshot, type RoleFamily, type Stage } from './types';
export interface Conversion { numerator: number; denominator: number; rate: number | null; }
export interface Insights {
  applications: number; uniqueCompanies: number; interviewConversion: Conversion; offerConversion: Conversion;
  pipeline: { stage: Stage; count: number }[]; weeklyApplications: { week: string; count: number }[];
  byRole: { family: RoleFamily | 'unknown'; label: string; applications: number; interviews: number; offers: number }[];
  pendingOutcomes: number; unknownApplicationDates: number; excludedRecent: number; overdueTasks: number;
  taskCompletion: Conversion; sampleWarning: string | null; periodStart: string | null; periodEnd: string;
}
export interface InsightsOptions { period: 30 | 90 | 'all'; matureOnly?: boolean; now?: Date; }
export function computeInsights(snapshot: AppSnapshot, options: InsightsOptions = { period: 90 }): Insights {
  const now = options.now ?? new Date();
  const today = dateOnlyInTimezone(now, snapshot.preferences.timezone);
  const start = options.period === 'all' ? null : addDays(today, -(options.period - 1));
  const inPeriod = (date: string) => (!start || date >= start) && date <= today;
  const historic = (id: string, stage: Stage) => snapshot.events.some(e => e.opportunityId === id && e.newStage === stage && new Date(e.occurredAt).getTime() <= now.getTime() && (e.type === 'stage_changed' || e.type === 'created'));
  const submitted = snapshot.opportunities.filter(o => o.stage !== 'Saved' || historic(o.id, 'Applied'));
  const known = submitted.filter(o => o.applicationDate && o.applicationDatePrecision === 'day' && inPeriod(o.applicationDate));
  const cohort = known.filter(o => !options.matureOnly || daysBetween(o.applicationDate!, today) >= 14);
  const interviewed = cohort.filter(o => historic(o.id, 'Interviewing')), offers = cohort.filter(o => historic(o.id, 'Offer'));
  const conversion = (numerator: number, denominator: number): Conversion => ({ numerator, denominator, rate: denominator ? numerator / denominator : null });
  const weekly = new Map<string, number>();
  for (const o of known) {
    const date = o.applicationDate!, day = new Date(`${date}T12:00:00Z`).getUTCDay();
    const monday = addDays(date, -(day === 0 ? 6 : day - 1)); weekly.set(monday, (weekly.get(monday) ?? 0) + 1);
  }
  const byRole = new Map<RoleFamily | 'unknown', { family: RoleFamily | 'unknown'; label: string; applications: number; interviews: number; offers: number }>();
  for (const o of cohort) {
    const family = o.primaryRoleFamily ?? 'unknown';
    const row = byRole.get(family) ?? { family, label: family === 'unknown' ? 'Unspecified' : ROLE_LABELS[family], applications: 0, interviews: 0, offers: 0 };
    row.applications++; if (historic(o.id, 'Interviewing')) row.interviews++; if (historic(o.id, 'Offer')) row.offers++; byRole.set(family, row);
  }
  const completed = snapshot.tasks.filter(t => t.status === 'done' && t.completedAt && inPeriod(dateOnlyInTimezone(new Date(t.completedAt), snapshot.preferences.timezone)));
  // Completion denominator is tasks due in period plus undated tasks completed in period.
  const dueInPeriod = snapshot.tasks.filter(t => { const due = t.dueAt ? dateOnlyInTimezone(new Date(t.dueAt), snapshot.preferences.timezone) : t.dueDate; return due ? inPeriod(due) : false; });
  const completionCohort = new Set([...dueInPeriod.map(t => t.id), ...completed.map(t => t.id)]);
  const openOpportunities = new Set(snapshot.opportunities.filter(o => !['Rejected', 'Withdrawn'].includes(o.stage)).map(o => o.id));
  const overdueTasks = snapshot.tasks.filter(t => {
    const due = t.dueAt ? dateOnlyInTimezone(new Date(t.dueAt), snapshot.preferences.timezone) : t.dueDate;
    const overdue = t.dueAt ? new Date(t.dueAt).getTime() < now.getTime() : due && due < today;
    return openOpportunities.has(t.opportunityId) && t.status !== 'done' && !(t.status === 'snoozed' && t.snoozedUntil && t.snoozedUntil > today) && overdue;
  }).length;
  return { applications: known.length, uniqueCompanies: new Set(known.map(o => o.companyKey)).size,
    interviewConversion: conversion(interviewed.length, cohort.length), offerConversion: conversion(offers.length, cohort.length),
    pipeline: STAGES.map(stage => ({ stage, count: snapshot.opportunities.filter(o => o.stage === stage).length })),
    weeklyApplications: [...weekly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, count]) => ({ week, count })),
    byRole: [...byRole.values()].sort((a, b) => b.applications - a.applications || a.label.localeCompare(b.label)),
    pendingOutcomes: cohort.filter(o => !historic(o.id, 'Interviewing') && !historic(o.id, 'Offer') && !['Rejected', 'Withdrawn'].includes(o.stage)).length,
    unknownApplicationDates: submitted.filter(o => !o.applicationDate || o.applicationDatePrecision !== 'day').length,
    excludedRecent: known.length - cohort.length, overdueTasks, taskCompletion: conversion(completed.length, completionCohort.size),
    sampleWarning: cohort.length < 10 ? 'Small sample: individual outcomes can change these rates substantially.' : null,
    periodStart: start, periodEnd: today,
  };
}
