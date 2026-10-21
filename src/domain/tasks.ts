import { dateOnlyInTimezone, daysBetween } from './dates';
import { rankJob } from './ranking';
import type { AppSnapshot, Opportunity, Task } from './types';
export interface QueueItem { id: string; opportunityId: string; title: string; reason: string; dueDate: string | null; tier: number; taskId: string | null; kind: 'task' | 'deadline'; }
const terminal = (o: Opportunity) => o.stage === 'Rejected' || o.stage === 'Withdrawn';
const priority = { High: 0, Normal: 1, Low: 2 };
export function taskDueDate(task: Task, timezone: string): string | null {
  return task.dueAt ? dateOnlyInTimezone(new Date(task.dueAt), timezone) : task.dueDate;
}
export function nextTask(tasks: Task[], opportunityId: string, today?: string): Task | null {
  return tasks.filter(t => t.opportunityId === opportunityId && t.status !== 'done' && (t.status !== 'snoozed' || !t.snoozedUntil || (today && t.snoozedUntil <= today)))
    .sort((a, b) => (a.dueAt ?? a.dueDate ?? '9999').localeCompare(b.dueAt ?? b.dueDate ?? '9999') || a.createdAt.localeCompare(b.createdAt))[0] ?? null;
}
export function dailyQueue(snapshot: AppSnapshot, now = new Date()): QueueItem[] {
  const today = dateOnlyInTimezone(now, snapshot.preferences.timezone);
  const opportunities = new Map(snapshot.opportunities.filter(o => !terminal(o)).map(o => [o.id, o]));
  const queue: QueueItem[] = [];
  for (const task of snapshot.tasks) {
    const opportunity = opportunities.get(task.opportunityId);
    if (!opportunity || task.status === 'done' || (task.status === 'snoozed' && task.snoozedUntil && task.snoozedUntil > today)) continue;
    const dueDate = taskDueDate(task, snapshot.preferences.timezone);
    const days = dueDate ? daysBetween(today, dueDate) : null;
    const overdue = task.dueAt ? new Date(task.dueAt).getTime() < now.getTime() : days !== null && days < 0;
    let tier: number, reason: string;
    if (days !== null && ((task.type === 'interview' || task.type === 'offer') && days <= 3 || overdue && task.origin === 'user')) {
      tier = 1; reason = overdue ? days < 0 ? `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue` : 'Overdue today' : days === 0 ? 'Due today' : `${task.type === 'interview' ? 'Interview' : 'Offer commitment'} ${days === 1 ? 'tomorrow' : `in ${days} days`}`;
    } else if (days !== null && days <= 0) { tier = 2; reason = days === 0 ? 'Due today' : 'Overdue reminder'; }
    else if (days !== null && days <= 7) { tier = 4; reason = days === 1 ? 'Due tomorrow' : `Due in ${days} days`; }
    else if (task.type === 'review' && task.origin === 'suggested' && (days === null || days <= 14)) { tier = 5; reason = 'Accepted review reminder'; }
    else continue;
    queue.push({ id: task.id, taskId: task.id, opportunityId: opportunity.id, title: task.title, reason, dueDate, tier, kind: 'task' });
  }
  for (const opportunity of opportunities.values()) {
    if (opportunity.stage !== 'Saved' || !opportunity.deadline || (opportunity.snapshot && !opportunity.snapshot.timing.deadlineVerified)) continue;
    const days = daysBetween(today, opportunity.deadline);
    if (days < 0 || days > 3) continue;
    if (queue.some(q => q.opportunityId === opportunity.id && q.kind === 'task' && snapshot.tasks.find(t => t.id === q.taskId)?.type === 'application')) continue;
    queue.push({ id: `deadline:${opportunity.id}`, opportunityId: opportunity.id, title: `Review application deadline · ${opportunity.company}`, reason: days === 0 ? 'Application deadline today' : `Deadline in ${days} day${days === 1 ? '' : 's'}`, dueDate: opportunity.deadline, tier: 3, taskId: null, kind: 'deadline' });
  }
  const fit = (id: string) => { const o = opportunities.get(id); return o?.snapshot ? rankJob(o.snapshot, snapshot.preferences, now).score : 50; };
  return queue.sort((a, b) => a.tier - b.tier || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || priority[opportunities.get(a.opportunityId)!.priority] - priority[opportunities.get(b.opportunityId)!.priority] || fit(b.opportunityId) - fit(a.opportunityId) || a.id.localeCompare(b.id));
}
