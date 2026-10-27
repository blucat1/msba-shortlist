import { describe, expect, it } from 'vitest';
import type { JobSource } from '../../src/domain/types';
import { fetchBoard } from '../../src/ingestion/adapters';
import { normalizePosting } from '../../src/ingestion/normalize';

const checkedAt = '2026-10-26T23:40:00.000Z';
const source: JobSource = {
  id: 'greenhouse-evidence-fixture', employerId: 'evidence-fixture', company: 'Evidence fixture',
  careersUrl: 'https://example.com/careers', provider: 'greenhouse', board: 'evidence-fixture',
  state: 'verified', enabled: true, verifiedAt: checkedAt, evidenceUrl: 'https://example.com/careers',
  usageReview: 'Fictional test identity; never used in production.', lastSuccessfulCheck: null,
  lastAttemptAt: null, rawCount: null, relevantCount: null, error: null,
};

async function fromMetadata(metadata: { name: string; value: unknown }[], content = 'Requirements\n1 year of analytics experience.', place = 'Boston, MA') {
  const board = await fetchBoard(source, async () => ({
    jobs: [{ id: 123, title: 'Data Analyst', absolute_url: 'https://example.com/jobs/123',
      location: { name: place }, content, metadata }], meta: { total: 1 },
  }), checkedAt);
  return normalizePosting(board.postings[0], source, checkedAt);
}

describe('employment evidence in public Greenhouse custom fields', () => {
  // Actual metadata names/values observed on complete Reddit, Datadog and SoFi
  // public boards on October 26; provenance is in SOURCE_EVIDENCE_REVIEW.md.
  it('recovers explicit Time Type commitment and preserves its source field', async () => {
    const job = await fromMetadata([
      { name: 'Worker Sub-Type', value: 'Regular' },
      { name: 'Time Type', value: 'Full time' },
      { name: 'Worker Type', value: 'Employee' },
    ]);
    expect(job.employmentType).toBe('full-time');
    expect(job.employmentEvidence).toContain('Time Type: Full time');
    expect(job.classification.scope).toBe('included');
    expect(job.experience.minYears).toBe(1);
  });

  it.each(['Contract', 'Contractor', 'Fixed Term', 'Temporary'])('preserves %s ahead of full-time hours, regardless of field order', async value => {
    for (const fields of [
      [{ name: 'Time Type', value: 'Full time' }, { name: 'Worker Sub-Type', value }],
      [{ name: 'Worker Sub-Type', value }, { name: 'Time Type', value: 'Full time' }],
    ]) {
      const job = await fromMetadata(fields);
      expect(job.employmentType).toBe('contract');
      expect(job.classification.scope).toBe('excluded');
      expect(job.employmentEvidence).toContain(value);
    }
  });

  it('keeps an explicit internship out even when Time Type says full time', async () => {
    const job = await fromMetadata([
      { name: 'Time Type', value: 'Full time' },
      { name: 'Early Career Time Type', value: 'Internship' },
    ]);
    expect(job.employmentType).toBe('internship');
    expect(job.classification.scope).toBe('excluded');
  });

  it('does not hide part-time commitment inside a multi-select value', async () => {
    const job = await fromMetadata([{ name: 'Employment Type', value: ['Full time', 'Part time'] }]);
    expect(job.employmentType).toBe('part-time');
    expect(job.classification.scope).toBe('excluded');
    expect(job.employmentEvidence).toContain('Employment Type: Part time');
  });

  it.each(['Not full time', 'Non-Full-Time'])('does not turn negated commitment into a match: %s', async value => {
    const job = await fromMetadata([{ name: 'Time Type', value }]);
    expect(job.employmentType).toBe('unknown');
    expect(job.classification.scope).toBe('needs-details');
  });

  it('does not infer full time from regular employment, employee status, hours, salary or benefit boilerplate', async () => {
    const job = await fromMetadata([
      { name: 'Employment Type', value: 'Regular' },
      { name: 'Worker Type', value: 'Employee' },
      { name: 'Scheduled Weekly Hours', value: '40.0' },
      { name: 'Pay Rate Type', value: 'Salary' },
      { name: 'Benefits', value: 'Full-time employees receive medical coverage.' },
    ], 'Requirements\n1 year of analytics experience.\nFull-time employees are eligible for benefits.\nAnnual salary: USD 90,000.');
    expect(job.employmentType).toBe('unknown');
    expect(job.employmentEvidence).toBeNull();
    expect(job.classification.scope).toBe('needs-details');
  });

  it('ignores null/object values and type-like fields that describe a benefit or preference', async () => {
    const job = await fromMetadata([
      { name: 'Time Type', value: null },
      { name: 'Job Type', value: { label: 'Full time' } },
      { name: 'Preferred Employment Type', value: 'Full time' },
      { name: 'Benefits for Employment Type', value: 'Full time' },
    ]);
    expect(job.employmentType).toBe('unknown');
    expect(job.classification.scope).toBe('needs-details');
  });

  it('retains independent geography checks after recovering commitment', async () => {
    const fields = [{ name: 'Time Type', value: 'Full time' }];
    expect((await fromMetadata(fields, '', 'Remote')).classification.scope).toBe('needs-details');
    expect((await fromMetadata(fields, '', 'Toronto, Canada')).classification.scope).toBe('excluded');
  });
});
