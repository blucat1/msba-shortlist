import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { appConfig } from '../config';

/** Filter changes and deep-linked sheets retain their own focus and scroll. */
export function PageNavigation() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const page = pathname.endsWith('/my-search') ? 'My Search'
      : pathname.endsWith('/insights') ? 'Insights'
        : pathname === '/auth/callback' ? 'Signing in' : 'Opportunities';
    document.title = `${page} · ${appConfig.name}`;
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
  }, [pathname]);
  return null;
}
