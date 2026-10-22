import { dateOnlyInTimezone } from './dates';
import type { Job, Opportunity, Task } from './types';
export function newId(): string { return globalThis.crypto.randomUUID(); }
export function companyKey(name: string): string { return `manual:${name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')}`; }
export function catalogCompanyKey(job: Pick<Job, 'employerId' | 'employerGroupingKey'>): string {
  return job.employerGroupingKey ?? `employer:${job.employerId}`;
}
export function manualOpportunity(fields: Partial<Opportunity> & Pick<Opportunity, 'company' | 'title'>, userId: string, now = new Date()): Opportunity {
  const stamp = now.toISOString();
  return { id: newId(), userId, catalogJobId: null, companyKey: companyKey(fields.company), location: '', workArrangement: 'unknown', postingUrl: null, salaryText: '', deadline: null, stage: 'Saved', priority: 'Normal', applicationDate: null, applicationDatePrecision: 'unknown', notes: '', primaryRoleFamily: null, snapshot: null, createdAt: stamp, updatedAt: stamp, ...fields };
}
export function opportunityFromJob(job: Job, userId: string, now = new Date()): Opportunity {
  return manualOpportunity({ company: job.company, title: job.title, catalogJobId: job.id, companyKey: catalogCompanyKey(job), location: job.locations.map(l => l.label).join(' · '), workArrangement: job.workArrangement, postingUrl: job.postingUrl, salaryText: job.salary.map(s => s.sourceText).join('; '), deadline: job.timing.deadline, primaryRoleFamily: job.primaryRoleFamily, snapshot: job }, userId, now);
}
export function createTask(opportunityId: string, userId: string, title: string, now = new Date()): Task {
  return { id: newId(), userId, opportunityId, title, type: 'general', dueDate: dateOnlyInTimezone(now), dueAt: null, status: 'open', snoozedUntil: null, origin: 'user', createdAt: now.toISOString(), updatedAt: now.toISOString(), completedAt: null };
}
