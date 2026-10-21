import { describe, expect, it } from 'vitest';
import { assessExperience, isLeadershipTitle, type ExperienceView } from '../../src/domain/experience';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { rankJob, rankJobs } from '../../src/domain/ranking';
import { opportunityFromJob } from '../../src/domain/records';
import { DEFAULT_PREFERENCES, type Evidence, type Job } from '../../src/domain/types';
import { createDemoRepository } from '../../src/repositories/demo';

const now = new Date('2026-10-21T19:00:00.000Z');
function posting(options: {
  id?: string; title?: string; min?: number | null; max?: number | null;
  preferred?: number | null; alternatives?: string[]; seniority?: Job['classification']['seniority']; reasons?: Evidence[];
} = {}): Job {
  const base = createDemoSnapshot(now).jobs[0];
  const min = options.min === undefined ? null : options.min;
  return {
    ...base, id: options.id ?? 'eligibility-job', title: options.title ?? 'Business Analyst',
    classification: { ...base.classification, scope: 'included', seniority: options.seniority ?? 'unknown', reasons: options.reasons ?? [] },
    experience: { minYears: min, maxYears: options.max ?? min, preferredYears: options.preferred ?? null, alternatives: options.alternatives ?? [], evidence: min === null ? null : `${min} years of relevant experience required` },
  };
}
const preferences = { ...DEFAULT_PREFERENCES, roleFamilies: ['business-analytics'] as Job['roleFamilies'], skills: ['SQL', 'Excel'], yearsExperience: 0 };

describe('new graduate discovery evidence', () => {
  it('keeps an unknown requirement unverified even when an old classifier called it early career', () => {
    const job = posting({ seniority: 'early-career' });
    const assessment = assessExperience(job);
    expect(assessment.tier).toBe('unverified'); expect(assessment.requiredYears).toBeNull(); expect(assessment.explicitGraduate).toBe(false);
    expect(job.experience.minYears).toBeNull();
  });

  it.each(['Associate Business Analyst', 'Associate Product Manager', 'APM', 'Junior Data Analyst'])(
    'does not treat the ambiguous title %s as a verified zero-year requirement', title => {
      const assessment = assessExperience(posting({ title }));
      expect(assessment.tier).toBe('unverified'); expect(assessment.requiredYears).toBeNull();
    },
  );

  it.each(['Business Analyst — New Graduate', 'Data Analyst, New Grad', 'Entry-Level Product Analyst'])(
    'accepts explicit graduate evidence from %s without inventing a numeric requirement', title => {
      const assessment = assessExperience(posting({ title }));
      expect(assessment.tier).toBe('new-grad'); expect(assessment.explicitGraduate).toBe(true); expect(assessment.requiredYears).toBeNull();
    },
  );

  it.each(['experience.entry_level_explicit', 'experience.no_experience_required'])(
    'accepts explicit source evidence code %s without fabricating unknown years', code => {
      const assessment = assessExperience(posting({ reasons: [{ code, text: 'Entry-level candidates are welcome; no prior professional experience required.' }] }));
      expect(assessment.tier).toBe('new-grad'); expect(assessment.explicitGraduate).toBe(true); expect(assessment.requiredYears).toBeNull();
    },
  );

  it('includes an explicit 0–1-year cohort while distinguishing the actual one-year requirement', () => {
    const zero = assessExperience(posting({ min: 0, max: 1 })), one = assessExperience(posting({ min: 1, max: 3 }));
    expect(zero.tier).toBe('new-grad'); expect(zero.requiredYears).toBe(0); expect(zero.label).toMatch(/no.+experience|0.*year/i);
    expect(one.tier).toBe('new-grad'); expect(one.requiredYears).toBe(1); expect(one.label).toMatch(/1.*year/i);
    expect(one.label).not.toMatch(/no.+experience/i);
  });

  it('does not confuse preferred years with required years', () => {
    const unknown = assessExperience(posting({ preferred: 3 })); expect(unknown.tier).toBe('unverified'); expect(unknown.requiredYears).toBeNull();
    const zeroRequired = assessExperience(posting({ min: 0, preferred: 3 })); expect(zeroRequired.tier).toBe('new-grad'); expect(zeroRequired.requiredYears).toBe(0);
  });

  it('keeps an early-career-only title with unstated years distinct from the strict graduate/0–1 cohort', () => {
    const job = posting({ title: 'Early Career Data Analyst' });
    expect(assessExperience(job).tier).not.toBe('new-grad');
    expect(rankJobs([job], preferences, { now })).toEqual([]);
  });

  it.each([2, 3])('keeps %i required years in the separate early-career cohort', min => {
    const assessment = assessExperience(posting({ min, title: 'Business Analyst — New Graduate' }));
    expect(assessment.tier).toBe('early-career'); expect(assessment.requiredYears).toBe(min);
  });

  it.each([4, 5, 8])('keeps %i required years in the experienced cohort', min => {
    const assessment = assessExperience(posting({ min, title: 'Associate Business Analyst' })); expect(assessment.tier).toBe('experienced'); expect(assessment.requiredYears).toBe(min);
  });

  it.each(['Senior Business Analyst', 'Sr. Product Analyst', 'Staff Data Scientist', 'Principal Data Engineer', 'Lead Data Analyst'])(
    'lets the senior title %s override stale early-career classification and a low numeric minimum', title => {
      expect(assessExperience(posting({ title, min: 0, seniority: 'early-career' })).tier).toBe('experienced');
      expect(assessExperience(posting({ title, min: null, seniority: 'early-career' })).tier).toBe('experienced');
    },
  );

  it('does not interpret Product Manager as a senior or people-leadership title by itself', () => {
    expect(assessExperience(posting({ title: 'Product Manager', min: 1 })).tier).toBe('new-grad');
    expect(assessExperience(posting({ title: 'Associate Product Manager', min: 0 })).tier).toBe('new-grad');
  });

  it('does not promote conditional education alternatives from their lowest parsed number', () => {
    const conditional = posting({ min: 0, alternatives: ["Bachelor's + 7 years OR PhD + 0 years"] });
    expect(assessExperience(conditional).tier).toBe('unverified');
    conditional.experience.minYears = 1; conditional.experience.maxYears = 3;
    conditional.experience.alternatives = ["Bachelor's + 3 years OR master's + 1 year"];
    expect(assessExperience(conditional).tier).toBe('unverified');
  });

  it('retains an independently established high requirement even when degree alternatives exist', () => {
    const assessment = assessExperience(posting({ min: 5, alternatives: ["Bachelor's or master's degree"] }));
    expect(assessment.tier).toBe('experienced'); expect(assessment.requiredYears).toBe(5);
  });

  it('honors explicit not-new-grad source evidence before a graduate title, low minimum or positive entry flag', () => {
    const job = posting({ title: 'Business Analyst — New Graduate', min: 0, reasons: [
      { code: 'experience.entry_level_explicit', text: 'Early career candidates.' },
      { code: 'experience.not_new_grad', text: 'This is not a new grad role.' },
    ] });
    expect(assessExperience(job).tier).toBe('early-career');
    expect(rankJobs([job], preferences, { now })).toEqual([]);
    job.experience.minYears = null; job.experience.maxYears = null; expect(assessExperience(job).tier).toBe('early-career');
    job.experience.minYears = 4; job.experience.maxYears = 4; expect(assessExperience(job).tier).toBe('experienced');
  });
});

describe('experience discovery views and fit claims', () => {
  const jobs = () => [
    posting({ id: 'zero', min: 0 }), posting({ id: 'one', min: 1 }),
    posting({ id: 'two', min: 2 }), posting({ id: 'three', min: 3 }), posting({ id: 'four', min: 4 }),
    posting({ id: 'unknown' }), posting({ id: 'graduate', title: 'Business Analyst — New Graduate' }),
    posting({ id: 'conditional', min: 0, alternatives: ["Bachelor's + 5 years OR master's + 0 years"] }),
    posting({ id: 'senior', title: 'Senior Business Analyst', min: 0, seniority: 'early-career' }),
  ];
  const ids = (view?: ExperienceView) => rankJobs(jobs(), preferences, { now, ...(view ? { experienceView: view } : {}) }).map(row => row.job.id).sort();

  it('defaults to the user-selected new-grad/0–1 cohort rather than all plausible roles', () => {
    expect(ids()).toEqual(['graduate', 'one', 'zero']); expect(ids('new-grad')).toEqual(ids());
  });

  it('lets users explicitly broaden to 0–3 without silently adding experienced or unknown requirements', () => {
    expect(ids('early-career')).toEqual(['graduate', 'one', 'three', 'two', 'zero']);
    expect(ids('experienced')).toEqual(['four', 'senior']); expect(ids('unverified')).toEqual(['conditional', 'unknown']);
    expect(ids('all')).toHaveLength(9);
  });

  it('does not let the new experience view bypass country/employment uncertainty or leadership restrictions', () => {
    const uncertain = posting({ id: 'uncertain', min: 0 }); uncertain.classification.scope = 'needs-details';
    const leadership = posting({ id: 'leader', title: 'Director of Analytics', min: 0, seniority: 'leadership' });
    expect(rankJobs([uncertain, leadership], preferences, { now, experienceView: 'all' })).toEqual([]);
    expect(rankJobs([uncertain, leadership], preferences, { now, experienceView: 'all', includeNeedsDetails: true }).map(row => row.job.id)).toEqual(['uncertain']);
  });

  it('excludes leadership titles even when an old catalog classification said early career', () => {
    for (const title of ['Director of Analytics', 'Head of Data Science', 'VP of Analytics', 'Data Engineering Manager']) {
      expect(isLeadershipTitle(title)).toBe(true);
      const job = posting({ title, min: 0, seniority: 'early-career' });
      expect(rankJobs([job], preferences, { now, experienceView: 'experienced' })).toEqual([]);
      expect(rankJobs([job], preferences, { now, experienceView: 'all' })).toEqual([]);
    }
    expect(isLeadershipTitle('Product Manager')).toBe(false); expect(isLeadershipTitle('Associate Product Manager')).toBe(false);
  });

  it('labels the one-year requirement as a stretch for a zero-year user despite belonging to the default cohort', () => {
    const match = rankJob(posting({ min: 1 }), preferences, now);
    expect(match.label).toBe('Experience stretch'); expect(match.reasons.some(r => /1 more/.test(r.text))).toBe(true);
  });

  it.each([
    posting(), posting({ title: 'Business Analyst — New Graduate' }),
    posting({ min: 0, alternatives: ["Bachelor's + 5 years OR master's + 0 years"] }),
  ])('does not call unknown or conditional experience a strong alignment despite otherwise complete match evidence', job => {
    const match = rankJob(job, preferences, now); expect(match.label).toBe('Check details');
  });

  it('keeps experienced roles visibly marked as stretches even if years were omitted from user preferences', () => {
    expect(rankJob(posting({ title: 'Senior Business Analyst', min: 0 }), { ...preferences, yearsExperience: null }, now).label).toBe('Experience stretch');
  });

  it('leaves tracked opportunities, tasks and history intact when discovery narrows or broadens', async () => {
    const repository = createDemoRepository({ storage: null, referenceDate: now, now: () => now });
    const senior = posting({ id: 'private-senior', title: 'Staff Data Scientist', min: 8 });
    const saved = await repository.saveOpportunity(opportunityFromJob(senior, 'demo-user', now));
    const snapshot = await repository.getSnapshot(); snapshot.jobs.push(senior);
    const before = structuredClone(snapshot);
    for (const experienceView of ['new-grad', 'early-career', 'experienced', 'unverified', 'all'] as const) rankJobs(snapshot.jobs, snapshot.preferences, { now, experienceView, includeTracked: true });
    expect(snapshot).toEqual(before);
    const after = await repository.getSnapshot();
    expect(after.opportunities.find(o => o.id === saved.id)?.snapshot?.experience.minYears).toBe(8);
    expect(after.tasks).toEqual(before.tasks); expect(after.events).toEqual(before.events);
  });
});
