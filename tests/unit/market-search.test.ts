import { describe, expect, it } from 'vitest';
import { buildMarketSearchLinks } from '../../src/domain/market-search';

const expectedDestinations = [
  ['Google', 'www.google.com', '/search'],
  ['Indeed', 'www.indeed.com', '/jobs'],
  ['LinkedIn', 'www.linkedin.com', '/jobs/search/'],
];

describe('market search links', () => {
  it('opens only three fixed HTTPS search destinations without credentials or fragments', () => {
    const links = buildMarketSearchLinks();
    expect(links).toHaveLength(3);
    links.forEach((link, index) => {
      const url = new URL(link.url);
      expect([link.label, url.hostname, url.pathname]).toEqual(expectedDestinations[index]);
      expect(url.protocol).toBe('https:');
      expect(url.username).toBe(''); expect(url.password).toBe('');
      expect(url.port).toBe(''); expect(url.hash).toBe('');
    });
  });

  it('uses useful defaults for empty or whitespace-only input', () => {
    expect(buildMarketSearchLinks(' \n ', ' \t ')).toEqual(buildMarketSearchLinks());
    const [google, indeed, linkedIn] = buildMarketSearchLinks().map(link => new URL(link.url));
    expect(google.searchParams.get('q')).toBe('analyst entry level jobs in United States');
    expect(indeed.searchParams.get('q')).toBe('analyst entry level');
    expect(indeed.searchParams.get('l')).toBe('United States');
    expect(linkedIn.searchParams.get('keywords')).toBe('analyst entry level');
    expect(linkedIn.searchParams.get('location')).toBe('United States');
  });

  it('preserves Unicode and query punctuation inside encoded keyword/location values', () => {
    const query = '分析 analyst C++ & "R&D" 100%';
    const location = 'Montréal / São Paulo + 東京';
    const [google, indeed, linkedIn] = buildMarketSearchLinks(query, location, false).map(link => new URL(link.url));
    expect(google.searchParams.get('q')).toBe(`${query} jobs in ${location}`);
    expect(indeed.searchParams.get('q')).toBe(query);
    expect(indeed.searchParams.get('l')).toBe(location);
    expect(linkedIn.searchParams.get('keywords')).toBe(query);
    expect(linkedIn.searchParams.get('location')).toBe(location);
  });

  it.each([
    'https://evil.example/phish?next=https://another.example',
    'javascript:alert(document.cookie)',
    '//evil.example@www.google.com/../../',
    '&redirect_uri=https://evil.example#fragment',
    '" onmouseover="alert(1)"><script>alert(1)</script>',
  ])('keeps untrusted input as search text rather than a destination or extra parameter: %s', input => {
    const links = buildMarketSearchLinks(input, input, false);
    links.forEach((link, index) => {
      const url = new URL(link.url);
      expect(url.origin).toBe(`https://${expectedDestinations[index][1]}`);
      expect(url.pathname).toBe(expectedDestinations[index][2]);
      expect(url.hash).toBe(''); expect(url.username).toBe(''); expect(url.password).toBe('');
      expect([...url.searchParams.keys()]).toEqual(index === 0 ? ['q'] : index === 1 ? ['q', 'l'] : ['keywords', 'location']);
      if (index === 0) expect(url.searchParams.get('q')).toBe(`${input} jobs in ${input}`);
      else {
        expect(url.searchParams.get(index === 1 ? 'q' : 'keywords')).toBe(input);
        expect(url.searchParams.get(index === 1 ? 'l' : 'location')).toBe(input);
      }
    });
  });

  it('allows the user to remove the optional entry-level search terms', () => {
    const withTerms = buildMarketSearchLinks('product analyst', 'California');
    const withoutTerms = buildMarketSearchLinks('product analyst', 'California', false);
    expect(new URL(withTerms[1].url).searchParams.get('q')).toBe('product analyst entry level');
    expect(new URL(withoutTerms[1].url).searchParams.get('q')).toBe('product analyst');
    expect(new URL(withoutTerms[1].url).searchParams.get('l')).toBe('California');
  });
});
