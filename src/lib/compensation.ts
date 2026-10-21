import type { SalaryBand } from '../domain/types';

/** A summary of source compensation evidence; unknown currency/period stay unknown. */
export function formatCompensation(bands: readonly SalaryBand[]): string {
  if (!bands.length) return 'Pay not listed';
  const band = bands[0];
  const currency = band.currency.trim().toUpperCase();
  const options: Intl.NumberFormatOptions = {
    notation: band.period === 'year' ? 'compact' : 'standard',
    maximumFractionDigits: band.period === 'year' ? 1 : 2,
    minimumFractionDigits: 0,
  };
  let formatter = new Intl.NumberFormat('en-US', options);
  let currencySpecified = false;
  // Intl rejects sentinel values such as "unknown". Keep malformed/unavailable
  // source currency out of currency mode; never substitute the user's USD target.
  if (/^[A-Z]{3}$/.test(currency) && !['XXX', 'XTS'].includes(currency)) {
    try {
      formatter = new Intl.NumberFormat('en-US', { ...options, style: 'currency', currency });
      currencySpecified = true;
    } catch { /* Preserve the numbers and their uncertainty when a code is unsupported. */ }
  }
  const hasAmount = band.min !== null || band.max !== null;
  let amount: string;
  if (band.min !== null && band.max !== null) {
    amount = band.min === band.max ? formatter.format(band.min) : `${formatter.format(band.min)}–${formatter.format(band.max)}`;
  } else if (band.min !== null) amount = `${formatter.format(band.min)}+`;
  else if (band.max !== null) amount = `Up to ${formatter.format(band.max)}`;
  else amount = band.sourceText.trim() || 'Pay not listed';
  if (!hasAmount && !band.sourceText.trim()) return amount;
  const period = hasAmount ? ({ year: ' / yr', hour: ' / hr', month: ' / mo', unknown: '' } as const)[band.period] : '';
  const hints = [
    ...(!currencySpecified ? ['Currency not specified'] : []),
    ...(band.period === 'unknown' ? ['Pay period not specified'] : []),
    ...(bands.length > 1 ? ['location bands'] : []),
  ];
  return `${amount}${period}${hints.length ? ` · ${hints.join(' · ')}` : ''}`;
}
