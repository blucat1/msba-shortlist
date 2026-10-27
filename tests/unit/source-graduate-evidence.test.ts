import { describe, expect, it } from 'vitest';
import { assessExperience } from '../../src/domain/experience';
import type { JobSource } from '../../src/domain/types';
import { classify, extractExperience, location } from '../../src/ingestion/classification';
import { normalizePosting } from '../../src/ingestion/normalize';

// Bounded direct-hiring phrase captured from West Monroe's public student
// board, posting 6167515004, October 26, 2026. No numeric years are stated.
const directHiring = 'West Monroe is seeking entry-level Consultants to join our Data & Analytics team.';
const title = '2027 Data & Analytics Consultant';
function assess(text: string, jobTitle = title, company = 'West Monroe') {
  const experience = extractExperience(text);
  const classified = classify(jobTitle, text, [location('San Francisco, CA')], 'unknown', experience, company);
  return { ...classified, experience, assessment: assessExperience({ title: jobTitle, experience, classification: classified.classification }) };
}
const positive = (result: ReturnType<typeof assess>) => result.classification.reasons.find(reason => reason.code === 'experience.entry_level_explicit');

describe('explicit entry-level recruitment in source descriptions', () => {
  it('recognizes the exact employer hiring phrase without manufacturing a zero-year floor or full-time status', () => {
    const result = assess(directHiring);
    expect(positive(result)).toEqual({ code: 'experience.entry_level_explicit', text: directHiring.slice(0, -1) });
    expect(result.assessment).toMatchObject({ tier: 'new-grad', requiredYears: null });
    expect(result.experience.minYears).toBeNull();
    expect(result.classification.scope).toBe('needs-details');
  });

  it.each([
    'We are hiring entry-level analysts to join our analytics team.',
    'We’re recruiting entry-level engineers to join our data team.',
    'Our team is seeking entry-level data scientists to join our research team.',
  ])('recognizes direct first-person hiring: %s', text => {
    expect(assess(text).assessment.tier).toBe('new-grad');
  });

  it('does not use an unrelated employer name or a quotation about another company', () => {
    expect(positive(assess(directHiring, title, 'Different Employer'))).toBeUndefined();
    expect(positive(assess('A customer says: West Monroe is seeking entry-level Consultants to join our Data & Analytics team.'))).toBeUndefined();
    expect(positive(assess('Other Employer is seeking entry-level Consultants to join our team.'))).toBeUndefined();
  });

  it.each([
    'West Monroe is seeking Consultants to mentor entry-level analysts and manage our data team.',
    'You will mentor entry-level Consultants and manage our data team.',
    'Our clients are hiring entry-level analysts to join our platform.',
    'Our benefits support entry-level Consultants who join our company.',
    'West Monroe is not seeking entry-level Consultants to join our team.',
    'West Monroe is no longer hiring entry-level Consultants to join our team.',
  ])('does not promote mentoring, boilerplate or negated recruitment: %s', text => {
    expect(positive(assess(text))).toBeUndefined();
    expect(assess(text).assessment.tier).toBe('unverified');
  });

  it('preserves explicit new-grad exclusions ahead of the positive phrase', () => {
    const result = assess(`${directHiring}\nThis role is not an entry-level position.`);
    expect(positive(result)).toBeUndefined();
    expect(result.assessment.tier).toBe('early-career');
  });

  it('preserves numeric, senior-title and qualitative requirement overrides', () => {
    const numeric = assess(`${directHiring}\nRequirements\n4 years of professional experience required.`);
    expect(numeric.assessment).toMatchObject({ tier: 'experienced', requiredYears: 4 });
    expect(assess(directHiring, 'Senior Data & Analytics Consultant').assessment.tier).toBe('experienced');
    expect(assess(`${directHiring}\nRequired qualifications\nExtensive professional experience is required.`).assessment.tier).toBe('unverified');
  });

  it('escapes employer names and requires an exact match', () => {
    const company = 'Example (US) + Co.';
    expect(assess(`${company} is hiring entry-level analysts to join our team.`, title, company).assessment.tier).toBe('new-grad');
    expect(positive(assess('Example US Co is hiring entry-level analysts to join our team.', title, company))).toBeUndefined();
  });

  it('normalizes with the actual hiring company when a publisher supplies it', () => {
    const source: JobSource = { id: 'fixture', employerId: 'publisher', company: 'Publisher fixture',
      careersUrl: 'https://example.com', provider: 'greenhouse', board: 'fixture', state: 'verified',
      enabled: true, verifiedAt: null, evidenceUrl: 'https://example.com', usageReview: 'Fictional test identity.',
      lastSuccessfulCheck: null, lastAttemptAt: null, rawCount: null, relevantCount: null, error: null };
    const job = normalizePosting({ externalId: 'fixture', title, companyName: 'West Monroe',
      postingUrl: 'https://example.com/job', applicationUrl: 'https://example.com/job',
      locations: [location('San Francisco, CA')], description: directHiring, employment: null,
      workMode: null, sourcePostedAt: null, sourceUpdatedAt: null, sourcePublishedAt: null, salary: [],
    }, source, '2026-10-26T23:40:00.000Z');
    expect(job.company).toBe('West Monroe');
    expect(assessExperience(job)).toMatchObject({ tier: 'new-grad', requiredYears: null });
    expect(job.employmentType).toBe('unknown');
    expect(job.classification.scope).toBe('needs-details');
  });
});
