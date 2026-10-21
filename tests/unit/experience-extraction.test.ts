import { describe, expect, it } from 'vitest';
import { extractExperience } from '../../src/ingestion/classification';

describe('public employer experience wording regressions', () => {
  // Short excerpts from publicly listed employer postings audited 2026-10-21.
  it.each([
    ['Linear Analytics Engineer', '8+ years of experience in analytics engineering, data analytics, or data engineering, ideally at a fast-moving software company', 8],
    ['Ramp Product Manager Generalist', 'Minimum 2 years of professional experience working in product management, product operations, or strategy & operations roles, ideally', 2],
    ['Benchling Product Manager Schemas', '6+ years of product management experience', 6],
    ['Figma Product Manager Developer Platform', '6+ years of product management experience working on highly technical products', 6],
    ['Notion Business Operations', '5+ years of strategy experience, including 2+ years of experience in management consulting or a related field', 5],
    ['Ramp Procurement Product Operations', '3+ years in product operations, product management, or a customer-facing analytical role supporting B2B SaaS', 3],
    ['Ramp Procurement Product Manager', 'At least three years of product management or equivalent product-building experience', 3],
    ['Ro Analytics Engineer', '4+ years of full-time working experience in quantitative analysis roles', 4],
  ])('extracts the actual required floor for %s', (_title, text, years) => {
    const result = extractExperience(text);
    expect(result.minYears).toBe(years); expect(result.preferredYears).toBeNull(); expect(result.evidence).toContain(text);
  });
  it('keeps a preferred section separate and resumes required qualifications', () => {
    const result = extractExperience('Minimum qualifications\n2+ years in analytics.\nPreferred qualifications\n5 years of product management experience.\nRequired qualifications\n3 years working with data pipelines.');
    expect(result).toMatchObject({ minYears: 3, preferredYears: 5 });
    expect(extractExperience('Preferred qualification\n1 year of analytics experience\nMinimum qualification\n5 years of analytics experience')).toMatchObject({ minYears: 5, preferredYears: 1 });
  });
  it('distinguishes an optional experience threshold from required years', () => {
    expect(extractExperience('3 years experience is desirable')).toMatchObject({ minYears: null, preferredYears: 3 });
    expect(extractExperience('0–1 years experience would be ideal')).toMatchObject({ minYears: null, preferredYears: 0 });
  });
  it('does not let optional employer/skill context erase a required experience floor', () => {
    expect(extractExperience('5 years of analytical experience, preferably at a SaaS company. SQL preferred.').minYears).toBe(5);
    expect(extractExperience('Requirements\n5 years of relevant professional experience.\n3 years of SQL experience preferred.')).toMatchObject({ minYears: 5, preferredYears: 3 });
    expect(extractExperience('5 years of experience in analytics, and SQL is preferred.')).toMatchObject({ minYears: 5, preferredYears: null });
    expect(extractExperience('5 years of work experience, ideally in technology, consulting, finance, or analytics.')).toMatchObject({ minYears: 5, preferredYears: null });
    expect(extractExperience('5 years of professional experience, SQL is preferred.')).toMatchObject({ minYears: 5, preferredYears: null });
  });
  it.each([
    ['551b6963-1d68-4952-8dce-99950b658c72', 'Pleasanton'],
    ['6bcc8228-5b43-43e5-b96b-d62679b8c64a', 'Boston'],
    ['9a6eaa9b-0d86-4fd7-a687-17e70add8961', 'Boston'],
  ])('keeps Veeva APM %s (%s) one-year preference out of required experience', () => {
    const text = '1+ years’ work experience in a fast-paced environment such as technology, consulting, finance, or analytics is preferred';
    expect(extractExperience(`Requirements\n${text}`)).toMatchObject({ minYears: null, preferredYears: 1, evidence: text });
    expect(extractExperience(`5 years of professional experience required. ${text}`)).toMatchObject({ minYears: 5, preferredYears: 1 });
  });
  it('uses the strongest cumulative requirement rather than a lower sub-requirement', () => {
    const result = extractExperience('5+ years working in product analytics, including 2+ years using SQL. You must have 6 years of professional work.');
    expect(result.minYears).toBe(6); expect(result.maxYears).toBeNull();
  });
  it('preserves a real range and does not turn an upper bound into required years', () => {
    expect(extractExperience('Qualifications\n0–2 YOE.\nYou have less than two years of engineering experience.')).toMatchObject({ minYears: 0, maxYears: 2 });
    expect(extractExperience('You have less than two years of engineering experience.')).toMatchObject({ minYears: null, maxYears: 2 });
    expect(extractExperience('Two years or fewer of engineering experience.')).toMatchObject({ minYears: null, maxYears: 2 });
    expect(extractExperience('At most one year of professional experience.')).toMatchObject({ minYears: null, maxYears: 1 });
    expect(extractExperience('2–5 years of FP&A or Strategic Finance experience, with at least 2 years supporting a Sales organization.')).toMatchObject({ minYears: 2, maxYears: 5 });
    expect(extractExperience('Between 1 and 3 years analytical experience required')).toMatchObject({ minYears: 1, maxYears: 3 });
  });
  it('preserves numeric qualifiers and never parses half a year as two years', () => {
    expect(extractExperience('Five (5) years of professional experience.')).toMatchObject({ minYears: 5 });
    expect(extractExperience('3 yrs. of analytics experience.')).toMatchObject({ minYears: 3 });
    expect(extractExperience('1/2 year of professional experience.').minYears).toBeNull();
    expect(extractExperience('Qualifications\n0–2 years of experience required; 3 years of experience preferred.')).toMatchObject({ minYears: 0, maxYears: 2, preferredYears: 3 });
  });
  it('does not invent a hard maximum from an open-ended range', () => {
    expect(extractExperience('5-7+ years of product management or equivalent experience')).toMatchObject({ minYears: 5, maxYears: null });
  });
});

describe('conditional education requirements and general uncertainty', () => {
  it('retains degree paths without assuming the candidate qualifies for the lowest one', () => {
    const text = "Bachelor's degree + 3 years of experience OR master's degree + 1 year of experience.";
    const result = extractExperience(text);
    expect(result.minYears).toBeNull(); expect(result.alternatives).toEqual([text]); expect(result.evidence).toContain('3 years'); expect(result.evidence).toContain('1 year');
  });
  it('does not allow one education alternative to lower an independent required floor', () => {
    expect(extractExperience("5 years of professional experience required. Bachelor's degree + 3 years of experience OR master's degree + 1 year of experience.")).toMatchObject({ minYears: 5 });
    expect(extractExperience("5 years of professional experience, and Bachelor's degree + 3 years of experience OR master's degree + 1 year of experience.")).toMatchObject({ minYears: 5 });
  });
  it('joins degree OR bullets and does not assume a PhD zero-year path', () => {
    const result = extractExperience("Required qualifications\nMaster's degree and 2 years of professional experience\nOR Ph.D. and 0 years of professional experience");
    expect(result.minYears).toBeNull(); expect(result.alternatives).toHaveLength(1); expect(result.alternatives[0]).toContain('Ph.D.');
    expect(extractExperience("Ph.D. with no experience required OR Master's degree with 2 years of experience.").minYears).toBeNull();
    expect(extractExperience("Bachelor's degree and several years of experience OR Master's degree and 1 year of experience.").minYears).toBeNull();
  });
  it('keeps a shared experience requirement after degree-name alternatives', () => {
    expect(extractExperience("Bachelor's or Master's degree and 5 years of relevant experience.").minYears).toBe(5);
  });
  it.each([
    'Our company was founded 20 years ago. We serve 3 million people.',
    'Our team has over 20 years of combined experience building products.',
    'With over 20 years of combined experience, our team builds products.',
    'You will work with a team with 20 years of combined experience.',
    "We've spent 10 years building analytics software.",
    'Benefits\nPaid month off after 4 years and every 2 years thereafter.',
    'Average tenure is 5 years. Equity vests over 4 years.',
    'New graduates welcome. We value experience with SQL.',
    'Several years of professional experience required.',
  ])('does not manufacture an experience floor from narrative or unquantified text: %s', text => {
    expect(extractExperience(text).minYears).toBeNull();
  });
  it('recognizes explicit zero experience while preserving ordinary unknowns', () => {
    expect(extractExperience('No prior professional experience required.')).toMatchObject({ minYears: 0 });
    expect(extractExperience('Previous work experience is not necessary.')).toMatchObject({ minYears: 0 });
    expect(extractExperience('3 years of experience not required.').minYears).toBeNull();
    expect(extractExperience('No experience in Python required.').minYears).toBeNull();
    expect(extractExperience('No experience required in our products, but experience in analytics is essential.').minYears).toBeNull();
    expect(extractExperience('No prior experience required with our platform.').minYears).toBeNull();
    expect(extractExperience('No previous experience is necessary for this role.').minYears).toBe(0);
  });
  it('keeps combined applicant experience as a genuine requirement', () => {
    expect(extractExperience('You have 5 years of combined product management and analytics experience.').minYears).toBe(5);
  });
  it('does not let company history in one clause hide the actual requirement', () => {
    expect(extractExperience('Founded 20 years ago, we require 3 years of analytics experience.').minYears).toBe(3);
  });
});
