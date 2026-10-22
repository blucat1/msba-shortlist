import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import * as currentClassifier from '../src/ingestion/classification';
import * as currentExperience from '../src/domain/experience';
import { normalizePosting } from '../src/ingestion/normalize';
import { loadRegistry } from '../src/ingestion/registry';
import type { ProviderPosting } from '../src/ingestion/adapters';
import type { Job, JobSource } from '../src/domain/types';

// Predeclared regression policy, not estimates of market-wide efficacy. Both
// false recommendations and missed reviewed positives fail this small gate.
const args = process.argv.slice(2);
const arg = (flag: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const path = arg('--dataset') || 'data/quality-benchmark-v1.json';
const output = arg('--output');
const baseline = arg('--baseline');
const schema = z.object({
  schemaVersion: z.literal(1), reviewMethod: z.string(), reviewedAt: z.string(),
  reviews: z.array(z.object({
    id: z.string(), company: z.string(), title: z.string(), postingUrl: z.string().url(),
    sourceId: z.string().optional(), provider: z.enum(['greenhouse', 'lever', 'ashby', 'jobicy']), board: z.string(), externalId: z.string(),
    expected: z.object({ scope: z.enum(['included', 'excluded', 'needs-details']), experienceTier: z.enum(['new-grad', 'early-career', 'experienced', 'unverified']).optional(), strictDefault: z.boolean(), zeroExperienceDefault: z.boolean().optional() }),
    rawInput: z.object({ title: z.string(), description: z.string().min(1), externalId: z.string(), locations: z.array(z.object({ label: z.string(), country: z.string().nullable(), region: z.string().nullable(), city: z.string().nullable() })) }).passthrough(),
  }).passthrough()).min(1),
}).passthrough();
const dataset = schema.parse(JSON.parse(await readFile(path, 'utf8')));
if (new Set(dataset.reviews.map(row => row.id)).size !== dataset.reviews.length) throw new Error('Duplicate reviewed IDs.');
let classifier = currentClassifier, experience = currentExperience;
let temporary: string | undefined;
try {
  if (baseline) {
    if (!/^[a-f0-9]{7,40}$/.test(baseline)) throw new Error('Baseline must be an exact Git commit.');
    temporary = await mkdtemp(join(tmpdir(), 'msba-quality-baseline-'));
    const file = (name: string) => execFileSync('git', ['show', `${baseline}:src/${name}`], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    await writeFile(join(temporary, 'classification.ts'), file('ingestion/classification.ts').replace("'../domain/experience'", "'./experience'"));
    await writeFile(join(temporary, 'experience.ts'), file('domain/experience.ts'));
    classifier = await import(pathToFileURL(join(temporary, 'classification.ts')).href) as typeof currentClassifier;
    experience = await import(pathToFileURL(join(temporary, 'experience.ts')).href) as typeof currentExperience;
  }
  const registry = await loadRegistry();
  const matrix = { truePositive: 0, falsePositive: 0, falseNegative: 0, trueNegative: 0 };
  const mismatches: { id: string; company: string; title: string; dimension: string; expected: unknown; actual: unknown; postingUrl: string }[] = [];
  let scopeCorrect = 0, experienceCorrect = 0, zeroCorrect = 0;
  const resultRows = dataset.reviews.map(row => {
    const source: JobSource = registry.find(source => source.id === row.sourceId || source.provider === row.provider && source.board === row.board) || { id: row.sourceId || `${row.provider}-${row.board}`, employerId: row.board, company: row.company, careersUrl: row.postingUrl, provider: row.provider, board: row.board, state: 'candidate', enabled: false, verifiedAt: null, evidenceUrl: row.postingUrl, usageReview: 'Reviewed sample only; not an enabled production source.', lastSuccessfulCheck: null, lastAttemptAt: null, rawCount: null, relevantCount: null, error: null };
    const posting = row.rawInput as unknown as ProviderPosting;
    let job: Job;
    if (baseline) {
      const required = classifier.extractExperience(posting.description);
      const type = classifier.employment(posting.employment, posting.title, posting.description);
      const classified = classifier.classify(posting.title, posting.description, posting.locations, type.type, required);
      job = { ...normalizePosting(posting, source, dataset.reviewedAt), ...classified, experience: required, sourceReview: undefined };
    } else job = normalizePosting(posting, source, dataset.reviewedAt);
    const assessment = experience.assessExperience(job);
    const strict = job.classification.scope === 'included' && assessment.tier === 'new-grad' && !job.sourceReview;
    const zero = strict && assessment.requiredYears === 0;
    if (strict && row.expected.strictDefault) matrix.truePositive++;
    else if (strict) matrix.falsePositive++;
    else if (row.expected.strictDefault) matrix.falseNegative++;
    else matrix.trueNegative++;
    const compare = (dimension: string, actual: unknown, expected: unknown) => {
      if (actual !== expected) mismatches.push({ id: row.id, company: row.company, title: row.title, dimension, expected, actual, postingUrl: row.postingUrl });
      return actual === expected;
    };
    if (compare('scope', job.classification.scope, row.expected.scope)) scopeCorrect++;
    if (row.expected.experienceTier !== undefined && compare('experienceTier', assessment.tier, row.expected.experienceTier)) experienceCorrect++;
    compare('strictDefault', strict, row.expected.strictDefault);
    if (row.expected.zeroExperienceDefault !== undefined && compare('zeroExperienceDefault', zero, row.expected.zeroExperienceDefault)) zeroCorrect++;
    return { id: row.id, scope: job.classification.scope, experienceTier: assessment.tier, requiredYears: assessment.requiredYears, strictDefault: strict, zeroExperienceDefault: zero, sourceConflict: !!job.sourceReview };
  });
  const precision = matrix.truePositive + matrix.falsePositive ? matrix.truePositive / (matrix.truePositive + matrix.falsePositive) : null;
  const recall = matrix.truePositive + matrix.falseNegative ? matrix.truePositive / (matrix.truePositive + matrix.falseNegative) : null;
  const passed = dataset.reviews.length >= 80 && matrix.falsePositive === 0 && matrix.falseNegative === 0 && mismatches.length === 0;
  const report = { evaluatedAt: new Date().toISOString(), dataset: path, reviewedAt: dataset.reviewedAt, reviewMethod: dataset.reviewMethod, classifierVersion: classifier.CLASSIFIER_VERSION, baselineCommit: baseline || null, reviewedCount: dataset.reviews.length, minimumSample: 80, policy: 'At least 80 reviewed records. No strict-default false positives or missed positives; all reviewed scope, experience and confirmed-zero labels must agree.', matrix, precision, recall, scopeCorrect, experienceCorrect, experienceReviewed: dataset.reviews.filter(row => row.expected.experienceTier !== undefined).length, zeroCorrect, zeroReviewed: dataset.reviews.filter(row => row.expected.zeroExperienceDefault !== undefined).length, passed, mismatches, results: resultRows, limitations: ['Source-reviewed by an assistant; no independent human adjudication or student pilot yet.', 'Purposive bounded excerpts, not a random or exhaustive market sample; results do not estimate whole-market recall or hiring outcomes.', 'Strict policy is measured before individual cohort, degree, GPA and authorization checks; separate regression tests cover those criteria.', 'Baseline evaluates frozen code against the same current reviewed evidence; it is not a historical production count.'] };
  if (output) await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ classifierVersion: report.classifierVersion, reviewedCount: report.reviewedCount, matrix, precision, recall, scopeCorrect, experienceCorrect, zeroCorrect, passed, mismatchCount: mismatches.length, mismatches: mismatches.slice(0, 30) }, null, 2));
  if (!passed && !baseline) process.exitCode = 1;
} finally { if (temporary) await rm(temporary, { recursive: true, force: true }); }
