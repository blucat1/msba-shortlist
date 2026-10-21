import { addDays, dateOnlyInTimezone } from './dates';
import { DEFAULT_PREFERENCES, type AppSnapshot, type Job, type OpportunityEvent, type Stage, type Task, type RoleFamily } from './types';

const listings: [string, string, RoleFamily, string, string[]][] = [
  ['Juniper Metrics', 'Associate Business Analyst', 'business-analytics', 'San Francisco, CA', ['SQL', 'Excel']],
  ['Juniper Metrics', 'Product Analyst', 'product-analytics', 'San Francisco, CA', ['SQL', 'Python']],
  ['Cedarline Health', 'Decision Scientist', 'data-science', 'San Diego, CA', ['Python', 'Statistics']],
  ['Lumen Cart', 'Associate Product Manager', 'product-management', 'New York, NY', ['Product strategy', 'SQL']],
  ['Tidewell Energy', 'Strategy & Operations Analyst', 'strategy-operations', 'Austin, TX', ['Excel', 'Financial modeling']],
  ['Kindred Atlas', 'Business Intelligence Analyst', 'business-intelligence', 'Chicago, IL', ['SQL', 'Tableau']],
  ['Orchard Loop', 'Customer Insights Analyst', 'marketing-analytics', 'Los Angeles, CA', ['SQL', 'Statistics']],
  ['Alder Freight', 'Supply Chain Analyst', 'operations-analytics', 'Seattle, WA', ['Excel', 'Python']],
  ['Cobalt Harbor', 'Credit Risk Analyst', 'financial-analytics', 'Boston, MA', ['SQL', 'Python']],
  ['Mosslight Data', 'Analytics Engineer', 'analytics-engineering', 'Remote — United States', ['SQL', 'dbt']],
  ['Pinecrest Signal', 'Data Engineer I', 'data-engineering', 'Denver, CO', ['Python', 'SQL']],
  ['Daybreak Systems', 'Applied ML Engineer', 'machine-learning', 'San Jose, CA', ['Python', 'Machine learning']],
  ['Solace Markets', 'Revenue Analytics Associate', 'financial-analytics', 'Remote — United States', ['SQL', 'Excel']],
  ['Bluejay Studio', 'Growth Analyst', 'product-analytics', 'San Francisco, CA', ['SQL', 'Experimentation']],
  ['Fernbridge', 'Data Analyst — New Graduate', 'business-analytics', 'Remote — United States', ['SQL', 'Tableau']],
  ['Cedarline Health', 'Associate Data Scientist', 'data-science', 'San Diego, CA', ['Python', 'R', 'Statistics']],
  ['Orchard Loop', 'Product Operations Associate', 'product-management', 'Los Angeles, CA', ['Excel', 'Product strategy']],
  ['Alder Freight', 'Logistics Analytics Associate', 'operations-analytics', 'Seattle, WA', ['SQL', 'Excel']],
  ['Kindred Atlas', 'Reporting Analyst', 'business-intelligence', 'Remote — United States', ['Power BI', 'SQL']],
  ['Tidewell Energy', 'Business Operations Associate', 'strategy-operations', 'Austin, TX', ['Excel', 'SQL']],
  ['Cobalt Harbor', 'Pricing Analyst', 'financial-analytics', 'Boston, MA', ['SQL', 'Statistics']],
  ['Mosslight Data', 'Junior Analytics Engineer', 'analytics-engineering', 'New York, NY', ['SQL', 'dbt']],
  ['Pinecrest Signal', 'Graduate Data Engineer', 'data-engineering', 'Denver, CO', ['Python', 'SQL']],
  ['Daybreak Systems', 'Machine Learning Engineer I', 'machine-learning', 'Remote — United States', ['Python', 'PyTorch']],
  ['Solace Markets', 'Marketing Measurement Analyst', 'marketing-analytics', 'Remote — United States', ['SQL', 'Statistics']],
  ['Bluejay Studio', 'Experimentation Analyst', 'product-analytics', 'San Francisco, CA', ['SQL', 'Experimentation']],
  ['Fernbridge', 'Principal Data Scientist', 'data-science', 'Seattle, WA', ['Python', 'Statistics']],
  ['Lumen Cart', 'Senior Product Manager', 'product-management', 'New York, NY', ['Product strategy', 'SQL']],
  ['Juniper Metrics', 'Decision Analytics Associate', 'business-analytics', 'Remote — location not specified', ['SQL', 'Excel']],
  ['Cedarline Health', 'Analytics Associate', 'business-analytics', 'San Diego, CA', ['Excel']],
];
export function createDemoSnapshot(referenceDate = new Date()): AppSnapshot {
  const today = dateOnlyInTimezone(referenceDate), stamp = referenceDate.toISOString();
  const at = (days: number) => `${addDays(today, days)}T17:00:00.000Z`;
  const jobs: Job[] = listings.map(([company, title, family, location, skills], i) => {
    const experience = i === 26 ? 7 : i === 27 ? 5 : i % 5 === 0 ? 0 : i % 4 === 0 ? 3 : 1;
    const sourceId = `demo-source-${i % 3}`;
    const salaryMin = 78000 + i % 6 * 7000;
    const salaryMax = Math.max(110000 + i % 5 * 8000, salaryMin + 20000);
    return {
      id: `demo-job-${String(i + 1).padStart(2, '0')}`, sourceId, externalId: `fictional-${i + 1}`, employerId: company.toLowerCase().replaceAll(' ', '-'), company, title,
      postingUrl: null, applicationUrl: null, locations: [{ label: location, country: i === 28 ? null : 'US', region: null, city: location.includes(',') ? location.split(',')[0] : null }],
      countryEvidence: i === 28 ? [] : ['Fictional sample explicitly located in the United States.'], workArrangement: location.startsWith('Remote') ? 'remote' : i % 3 === 0 ? 'hybrid' : 'onsite', employmentType: i === 29 ? 'unknown' : 'full-time', employmentEvidence: i === 29 ? null : 'Full-time (fictional sample)',
      roleFamilies: [family, ...(i === 1 ? ['business-analytics' as RoleFamily] : [])], primaryRoleFamily: family,
      classification: { confidence: 'high', reasons: [{ code: 'demo_role_title', text: `Fictional ${family} role.` }], version: 'demo-v1', scope: i >= 28 ? 'needs-details' : 'included', seniority: i >= 26 && i < 28 ? 'senior' : 'early-career' },
      summary: `Help ${company} turn business questions into clear decisions. Work with a small team on ${family.replaceAll('-', ' ')} and present useful findings. Fictional demonstration opportunity.`,
      description: `This is a fictional demonstration role at ${company}.\n\nYou would collaborate with cross-functional teams, investigate data, and communicate practical recommendations.\n\nRequirements: ${skills.join(', ')}; ${experience} year${experience === 1 ? '' : 's'} of relevant experience. Full-time US opportunity unless explicitly labeled unknown.\n\nPreferred: clear communication and curiosity. No application is submitted from this demo.`,
      requiredSkills: skills, preferredSkills: ['Communication', ...(i % 2 ? ['Tableau'] : ['Python'])],
      experience: { minYears: i === 29 ? null : experience, maxYears: i === 29 ? null : experience + 2, preferredYears: null, alternatives: i === 15 ? ["Bachelor's + 3 years OR master's + 1 year"] : [], evidence: i === 29 ? null : `${experience}–${experience + 2} years relevant experience` },
      salary: i % 6 === 0 ? [] : [{ min: salaryMin, max: salaryMax, currency: 'USD', period: 'year', compensationType: 'base', location: null, sourceText: `$${salaryMin.toLocaleString('en-US')}–$${salaryMax.toLocaleString('en-US')} annual base (simulated)` }],
      timing: { graduationStart: null, graduationEnd: null, earliestStart: null, latestStart: null, deadline: i === 0 ? addDays(today, 2) : i === 7 ? addDays(today, 3) : null, deadlineVerified: i === 0 || i === 7, evidence: [] },
      availability: i === 3 ? 'availability_unconfirmed' : 'open', sourcePostedAt: null, sourceUpdatedAt: at(-(i % 8)), sourcePublishedAt: null,
      firstSeenAt: at(-(i % 15 + 1)), lastSeenAt: i === 25 ? at(-4) : at(0), lastVerifiedAt: i === 25 ? at(-4) : stamp, contentHash: `demo-content-${i + 1}`, isDemo: true,
    };
  });
  const stages: Stage[] = ['Saved', 'Applied', 'Interviewing', 'Rejected', 'Assessment', 'Offer', 'Applied', 'Saved', 'Withdrawn', 'Applied', 'Interviewing', 'Saved'];
  const applicationAges = [null, 4, 22, 38, 12, 45, null, null, 30, 17, 55, null];
  const opportunities = jobs.slice(0, 12).map((job, i) => ({
    id: `demo-opportunity-${i + 1}`, userId: 'demo-user', catalogJobId: job.id, companyKey: `employer:${job.employerId}`, company: job.company, title: job.title,
    location: job.locations.map(l => l.label).join(' · '), workArrangement: job.workArrangement, postingUrl: null, salaryText: job.salary.map(s => s.sourceText).join('; '), deadline: job.timing.deadline,
    stage: stages[i], priority: (i === 2 || i === 5 ? 'High' : i === 8 ? 'Low' : 'Normal') as 'High' | 'Low' | 'Normal',
    applicationDate: applicationAges[i] === null ? null : addDays(today, -applicationAges[i]!), applicationDatePrecision: (applicationAges[i] === null ? 'unknown' : 'day') as 'unknown' | 'day',
    notes: i === 2 ? 'Prepare one example of a decision changed by analysis.' : i === 6 ? 'Historical application; exact submission date is unknown.' : '', primaryRoleFamily: job.primaryRoleFamily, snapshot: job, createdAt: at(-(applicationAges[i] ?? 2) - 2), updatedAt: at(-1),
  }));
  const events: OpportunityEvent[] = [];
  const addEvent = (index: number, stage: Stage, days: number, oldStage: Stage | null) => events.push({ id: `demo-event-${events.length + 1}`, userId: 'demo-user', opportunityId: opportunities[index].id, type: oldStage ? 'stage_changed' : 'created', oldStage, newStage: stage, occurredAt: at(-days), provenance: 'demo', idempotencyKey: `demo-history-${events.length + 1}` });
  opportunities.forEach((opportunity, i) => {
    addEvent(i, 'Saved', (applicationAges[i] ?? 2) + 2, null);
    if (opportunity.stage === 'Saved') return;
    addEvent(i, 'Applied', applicationAges[i] ?? 18, 'Saved');
    if (['Assessment', 'Interviewing', 'Offer'].includes(opportunity.stage)) addEvent(i, 'Assessment', Math.max(2, (applicationAges[i] ?? 18) - 5), 'Applied');
    if ([2, 3, 5, 10].includes(i)) addEvent(i, 'Interviewing', Math.max(2, (applicationAges[i] ?? 18) - 12), 'Assessment');
    if (['Rejected', 'Withdrawn', 'Offer'].includes(opportunity.stage)) addEvent(i, opportunity.stage, 2, i === 8 ? 'Applied' : 'Interviewing');
  });
  const makeTask = (id: number, index: number, title: string, due: number, type: Task['type'], status: Task['status'] = 'open', origin: Task['origin'] = 'user'): Task => ({
    id: `demo-task-${id}`, userId: 'demo-user', opportunityId: opportunities[index].id, title, type, dueDate: addDays(today, due), dueAt: null, status, snoozedUntil: status === 'snoozed' ? addDays(today, 3) : null,
    origin, createdAt: at(-5), updatedAt: stamp, completedAt: status === 'done' ? at(-1) : null,
  });
  const tasks = [makeTask(1, 2, 'Prepare for decision science interview', 1, 'interview'), makeTask(2, 1, 'Review application status', -2, 'review'), makeTask(3, 5, 'Review offer details and questions', 0, 'offer'), makeTask(4, 4, 'Complete assessment practice', 0, 'general'), makeTask(5, 9, 'Review application status', 3, 'review', 'open', 'suggested'), makeTask(6, 10, 'Practice project walkthrough', 4, 'interview'), makeTask(7, 6, 'Check next steps', -1, 'review', 'snoozed'), makeTask(8, 2, 'Read interview format', -1, 'general', 'done'), makeTask(9, 3, 'Archive application notes', -2, 'general')];
  return { jobs, sources: [0, 1, 2].map(i => ({ id: `demo-source-${i}`, employerId: `demo-board-${i}`, company: ['Fictional employer feed A', 'Fictional employer feed B', 'Fictional employer feed C'][i], careersUrl: 'https://example.invalid', provider: (['greenhouse', 'lever', 'ashby'] as const)[i], board: `fictional-demo-${i}`, state: 'verified', enabled: true, verifiedAt: stamp, evidenceUrl: null, usageReview: 'Fictional fixtures only; no live feed or employer affiliation.', lastSuccessfulCheck: stamp, lastAttemptAt: stamp, rawCount: 10, relevantCount: 10, error: null })),
    preferences: { ...DEFAULT_PREFERENCES, roleFamilies: ['business-analytics', 'product-analytics', 'data-science'], primaryRoleFamilies: ['business-analytics'], locations: ['San Francisco', 'San Diego'], workArrangements: ['hybrid', 'remote'], desiredSalary: 90000, yearsExperience: 1, skills: ['SQL', 'Python', 'Excel', 'Tableau'], onboardingComplete: false },
    opportunities, events, tasks, companyNotes: [{ companyKey: 'employer:juniper-metrics', userId: 'demo-user', note: 'Two separate roles; keep each application history distinct.', updatedAt: stamp }], jobPreferences: [], userId: 'demo-user', catalogTotal: jobs.length,
  };
}
