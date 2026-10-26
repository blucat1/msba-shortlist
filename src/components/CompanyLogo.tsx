import { useState } from 'react';
import { companyBranding, companyInitials } from '../domain/company-branding';

/** The adjacent company name supplies accessible text; branding is decorative. */
export function CompanyLogo({ company, size = '' }: { company: string; size?: string }) {
  const brand = companyBranding(company);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showLogo = !!brand && brand.logoPath !== failedSource;
  const colors = ['mint', 'peach', 'lavender', 'blue', 'cream'];
  const color = colors[[...company].reduce((sum, character) => sum + character.charCodeAt(0), 0) % colors.length];
  return <span className={`company-mark ${color} ${size}${showLogo ? ' has-logo' : ''}`} aria-hidden="true">
    {showLogo ? <img className="company-logo-image" src={brand.logoPath} alt="" width={44} height={44} decoding="async" onError={() => setFailedSource(brand.logoPath)} /> : companyInitials(company)}
  </span>;
}
