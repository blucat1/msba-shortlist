export interface MarketSearchLink {
  label: string;
  url: string;
  description: string;
}

export const DEFAULT_MARKET_QUERY = 'analyst';
export const DEFAULT_MARKET_LOCATION = 'United States';

/** Public search links only: never fetch results or include private tracker records. */
export function buildMarketSearchLinks(
  query = '', location = '', includeEntryLevelTerms = true,
): MarketSearchLink[] {
  const role = query.trim() || DEFAULT_MARKET_QUERY;
  const place = location.trim() || DEFAULT_MARKET_LOCATION;
  const keywords = includeEntryLevelTerms ? `${role} entry level` : role;
  const google = new URL('https://www.google.com/search');
  google.searchParams.set('q', `${keywords} jobs in ${place}`);
  const indeed = new URL('https://www.indeed.com/jobs');
  indeed.searchParams.set('q', keywords);
  indeed.searchParams.set('l', place);
  const linkedIn = new URL('https://www.linkedin.com/jobs/search/');
  linkedIn.searchParams.set('keywords', keywords);
  linkedIn.searchParams.set('location', place);

  return [
    { label: 'Google', url: google.href, description: 'Search for jobs across employer and career sites.' },
    { label: 'Indeed', url: indeed.href, description: 'Search a broader job board by keywords and location.' },
    { label: 'LinkedIn', url: linkedIn.href, description: 'Search LinkedIn Jobs; sign-in may be required.' },
  ];
}
