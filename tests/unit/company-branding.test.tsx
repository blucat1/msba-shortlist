import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CompanyMark } from '../../src/components/ui';
import { COMPANY_BRANDING, companyBranding, companyInitials } from '../../src/domain/company-branding';

afterEach(cleanup);

describe('locally hosted employer branding', () => {
  it('resolves exact normalized company identities and never guesses from a publisher or URL', () => {
    expect(companyBranding('  CERTIK  ')?.logoPath).toBe('/logos/certik.webp');
    expect(companyBranding('erg — eastern research group')?.employerId).toBe('eastern-research-group');
    expect(companyBranding('Precision Medicine Group')?.logoPath).toBe('/logos/precision-medicine-group.png');
    for (const company of ['Fernbridge', 'Jobicy', 'Jobicy · remote market feed', 'Greenhouse', 'https://solace.health', 'Solace impostor', '']) {
      expect(companyBranding(company)).toBeNull();
    }
  });

  it('publishes only local asset paths that exist in the release', () => {
    expect(COMPANY_BRANDING.length).toBeGreaterThan(0);
    for (const brand of COMPANY_BRANDING) {
      expect(brand.logoPath).toMatch(/^\/logos\/[a-z0-9-]+\.(?:ico|png|svg|webp|jpe?g)$/);
      expect(existsSync(resolve('public', brand.logoPath.slice(1))), brand.company).toBe(true);
    }
    const employers = JSON.parse(readFileSync(resolve('data/employers.json'), 'utf8')) as { employerId: string; company: string; enabled: boolean; provider: string }[];
    for (const employer of employers.filter(row => row.enabled && row.provider !== 'jobicy')) {
      expect(companyBranding(employer.company)?.employerId, employer.company).toBe(employer.employerId);
    }
  });

  it('shows a real logo without repeating adjacent company text to assistive technology', () => {
    const { container } = render(<CompanyMark company="CertiK" size="small" />);
    expect(container.firstElementChild).toHaveClass('company-mark', 'small', 'has-logo');
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toHaveAttribute('src', '/logos/certik.webp');
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('falls back after an image failure and can show another company’s logo after a row changes', () => {
    const { container, rerender } = render(<CompanyMark company="CertiK" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstElementChild).toHaveTextContent('C');
    rerender(<CompanyMark company="Solace" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/logos/solace.png');
    rerender(<CompanyMark company="Fernbridge" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstElementChild).toHaveTextContent('F');
    expect(companyInitials('ERG (Eastern Research Group)')).toBe('ERG');
  });
});
