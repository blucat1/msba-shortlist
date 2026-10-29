import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

/** Company sections organize presentation; every role keeps its own actions. */
export function CompanyRoleGroup({ company, roleCount, listingCount, children }: {
  company: string;
  roleCount: number;
  listingCount: number;
  children: ReactNode;
}) {
  return <details className="company-role-group" open>
    <summary className="company-role-heading">
      <CompanyLogo company={company} />
      <h2 className="company-role-name">{company}</h2>
      <span className="company-role-count">{roleCount} {roleCount === 1 ? 'role' : 'roles'}{listingCount > roleCount && ` · ${listingCount} listings`}</span>
      <ChevronDown size={20} aria-hidden="true" />
    </summary>
    <div className="company-role-list">{children}</div>
  </details>;
}
