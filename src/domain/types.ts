/** Dates without a time remain YYYY-MM-DD; event timestamps are ISO UTC strings. */
export type DateOnly = string;
export type Timestamp = string;
export const ROLE_FAMILIES = ['business-analytics', 'data-science', 'product-analytics', 'product-management', 'strategy-operations', 'business-intelligence', 'marketing-analytics', 'operations-analytics', 'financial-analytics', 'analytics-engineering', 'data-engineering', 'machine-learning'] as const;
export type RoleFamily = typeof ROLE_FAMILIES[number];
export const ROLE_LABELS: Record<RoleFamily, string> = {
  'business-analytics': 'Business analytics', 'data-science': 'Data science', 'product-analytics': 'Product analytics',
  'product-management': 'Product management', 'strategy-operations': 'Strategy & operations', 'business-intelligence': 'Business intelligence',
  'marketing-analytics': 'Marketing analytics', 'operations-analytics': 'Operations analytics', 'financial-analytics': 'Financial analytics',
  'analytics-engineering': 'Analytics engineering', 'data-engineering': 'Data engineering', 'machine-learning': 'Machine learning',
};
export const STAGES = ['Saved', 'Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn'] as const;
export type Stage = typeof STAGES[number];
export type Priority = 'High' | 'Normal' | 'Low';
export type WorkArrangement = 'remote' | 'hybrid' | 'onsite' | 'unknown';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'unknown';
export interface Evidence { code: string; text: string; }
export interface JobLocation { label: string; country: string | null; region: string | null; city: string | null; }
export interface SalaryBand { min: number | null; max: number | null; currency: string; period: 'year' | 'hour' | 'month' | 'unknown'; compensationType: 'base' | 'total' | 'unknown'; location: string | null; sourceText: string; }
export interface Experience { minYears: number | null; maxYears: number | null; preferredYears: number | null; alternatives: string[]; evidence: string | null; }
export interface JobTiming { graduationStart: DateOnly | null; graduationEnd: DateOnly | null; earliestStart: DateOnly | null; latestStart: DateOnly | null; deadline: DateOnly | null; deadlineVerified: boolean; evidence: string[]; }
export interface Job {
  id: string; sourceId: string; externalId: string; employerId: string; company: string; title: string;
  postingUrl: string | null; applicationUrl: string | null; locations: JobLocation[]; countryEvidence: string[];
  workArrangement: WorkArrangement; employmentType: EmploymentType; employmentEvidence: string | null;
  roleFamilies: RoleFamily[]; primaryRoleFamily: RoleFamily | null;
  classification: { confidence: 'high' | 'medium' | 'low'; reasons: Evidence[]; version: string; scope: 'included' | 'needs-details' | 'excluded'; seniority: 'early-career' | 'mid-level' | 'senior' | 'leadership' | 'unknown'; };
  summary: string; description?: string; requiredSkills: string[]; preferredSkills: string[]; experience: Experience; salary: SalaryBand[]; timing: JobTiming;
  availability: 'open' | 'availability_unconfirmed' | 'closed';
  sourcePostedAt: Timestamp | null; sourceUpdatedAt: Timestamp | null; sourcePublishedAt: Timestamp | null;
  firstSeenAt: Timestamp; lastSeenAt: Timestamp; lastVerifiedAt: Timestamp | null; contentHash: string; isDemo?: boolean;
  publisher?: { name: string; url: string; kind: 'aggregator' };
  employerGroupingKey?: string;
}
export type SourceProvider = 'greenhouse' | 'lever' | 'ashby' | 'jobicy';
export interface JobSource {
  id: string; employerId: string; company: string; careersUrl: string; provider: SourceProvider; board: string;
  state: 'candidate' | 'verified' | 'disabled' | 'failed'; enabled: boolean; verifiedAt: Timestamp | null;
  evidenceUrl: string | null; usageReview: string; lastSuccessfulCheck: Timestamp | null; lastAttemptAt: Timestamp | null;
  rawCount: number | null; relevantCount: number | null; error: string | null; notes?: string; region?: string;
}
export interface Preferences {
  roleFamilies: RoleFamily[]; primaryRoleFamilies: RoleFamily[]; locations: string[]; workArrangements: Exclude<WorkArrangement, 'unknown'>[];
  desiredSalary: number | null; salaryCurrency: string; graduationMonth: string | null; earliestStart: DateOnly | null;
  yearsExperience: number | null; skills: string[]; timezone: string; onboardingComplete: boolean;
}
export interface Opportunity {
  id: string; userId: string; catalogJobId: string | null; companyKey: string; company: string; title: string;
  location: string; workArrangement: WorkArrangement; postingUrl: string | null; salaryText: string; deadline: DateOnly | null;
  stage: Stage; priority: Priority; applicationDate: DateOnly | null; applicationDatePrecision: 'day' | 'month' | 'unknown';
  notes: string; primaryRoleFamily: RoleFamily | null; snapshot: Job | null; createdAt: Timestamp; updatedAt: Timestamp;
}
export interface OpportunityEvent {
  id: string; userId: string; opportunityId: string; type: 'created' | 'stage_changed' | 'application_opened' | 'application_date_corrected' | 'edited';
  oldStage: Stage | null; newStage: Stage | null; occurredAt: Timestamp; provenance: 'user' | 'import' | 'demo'; idempotencyKey: string;
}
export interface Task {
  id: string; userId: string; opportunityId: string; title: string; type: 'general' | 'interview' | 'offer' | 'review' | 'application';
  dueDate: DateOnly | null; dueAt: Timestamp | null; status: 'open' | 'done' | 'snoozed'; snoozedUntil: DateOnly | null;
  origin: 'user' | 'suggested'; createdAt: Timestamp; updatedAt: Timestamp; completedAt: Timestamp | null;
}
export interface CompanyNote { companyKey: string; userId: string; note: string; updatedAt: Timestamp; }
export interface JobPreference { jobId: string; userId: string; dismissed: boolean; seenAt: Timestamp | null; }
export interface AppSnapshot {
  jobs: Job[]; sources: JobSource[]; preferences: Preferences; opportunities: Opportunity[]; events: OpportunityEvent[];
  tasks: Task[]; companyNotes: CompanyNote[]; jobPreferences: JobPreference[]; userId: string | null;
  catalogTruncated?: boolean; catalogTotal?: number;
}
export interface Backup {
  version: 1; sourceMode?: 'demo' | 'live'; exportedAt: Timestamp; preferences: Preferences; opportunities: Opportunity[]; events: OpportunityEvent[];
  tasks: Task[]; companyNotes: CompanyNote[]; jobPreferences: JobPreference[];
}
export interface ImportPreview { backup: Backup; opportunityCount: number; taskCount: number; duplicateCount: number; warnings: string[]; }
export interface ImportResult { imported: number; skipped: number; }
export const DEFAULT_PREFERENCES: Preferences = {
  roleFamilies: [], primaryRoleFamilies: [], locations: [], workArrangements: [], desiredSalary: null,
  salaryCurrency: 'USD', graduationMonth: null, earliestStart: null, yearsExperience: null, skills: [], timezone: 'America/Los_Angeles', onboardingComplete: false,
};
