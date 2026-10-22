import type { Job } from '../domain/types';
import { safeUrl } from './ui';

export function SourceAttribution({ job }: { job: Pick<Job, 'publisher'> | null | undefined }) {
  const publisher = job?.publisher;
  const link = publisher && safeUrl(publisher.url);
  if (!publisher || !link) return null;
  return <a className="source-attribution" href={link} target="_blank" rel="noopener noreferrer">Source: {publisher.name} ↗</a>;
}
