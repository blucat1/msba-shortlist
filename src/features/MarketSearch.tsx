import { useId, useState } from 'react';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { Field } from '../components/ui';
import {
  buildMarketSearchLinks, DEFAULT_MARKET_LOCATION, DEFAULT_MARKET_QUERY,
} from '../domain/market-search';

interface MarketSearchProps {
  initialQuery?: string;
  initialLocation?: string;
  onAddOpportunity: () => void;
}

export function MarketSearch({ initialQuery, initialLocation, onAddOpportunity }: MarketSearchProps) {
  const headingId = useId();
  const termsHintId = useId();
  const [query, setQuery] = useState(initialQuery?.trim() || DEFAULT_MARKET_QUERY);
  const [location, setLocation] = useState(initialLocation?.trim() || DEFAULT_MARKET_LOCATION);
  const [includeEntryLevelTerms, setIncludeEntryLevelTerms] = useState(true);
  const links = buildMarketSearchLinks(query, location, includeEntryLevelTerms);

  return <section className="market-search aside-card" aria-labelledby={headingId}>
    <div className="section-top"><h2 id={headingId}><Search size={17} aria-hidden="true" /> Search beyond this catalog</h2></div>
    <p className="hint">Find roles across the wider market, including employers outside our connected feeds.</p>
    <div className="market-search-fields form-grid">
      <Field label="Market search keywords"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Analyst, product, strategy…" maxLength={200} /></Field>
      <Field label="Market search location"><input value={location} onChange={event => setLocation(event.target.value)} placeholder="City, state, country, or remote" maxLength={160} /></Field>
    </div>
    <label className="checkbox-label market-search-entry-level"><input type="checkbox" checked={includeEntryLevelTerms} onChange={event => setIncludeEntryLevelTerms(event.target.checked)} aria-describedby={termsHintId} /> Include entry-level keywords</label>
    <p id={termsHintId} className="hint">These search terms do not verify 0–1-year requirements. Check experience, location, and full-time status in the original posting.</p>
    <ul className="market-search-providers">
      {links.map(link => <li key={link.label}>
        <a className="button button-secondary" href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Search jobs on ${link.label} (opens in a new tab)`}>Search {link.label} <ArrowUpRight size={15} aria-hidden="true" /></a>
        <p className="hint">{link.description}</p>
      </li>)}
    </ul>
    <p className="hint market-search-disclosure">Opens an external site with your search terms and location. Its results are unverified by MSBA Shortlist and are not added to this catalog.</p>
    <div className="market-search-save">
      <p>Found a suitable role? Add its original link and details to My Search.</p>
      <button type="button" className="button button-primary" onClick={onAddOpportunity}><Plus size={16} aria-hidden="true" /> Track a job you found</button>
    </div>
  </section>;
}
