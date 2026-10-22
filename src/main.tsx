import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './app/AppShell';
import { Opportunities } from './features/Opportunities';
import { MySearch } from './features/MySearch';
import { AuthCallback } from './app/AuthCallback';
import './styles.css';
import './styles/apple.css';
import './styles/studio.css';
import './styles/typography.css';
import './styles/landmarks.css';
import './styles/discovery.css';
import { appConfig } from './config';
document.title = `${appConfig.name} · Find your next step`;
const Insights = lazy(() => import('./features/Insights'));
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });
const defaultRoute = import.meta.env.VITE_APP_MODE === 'production' ? '/opportunities' : '/demo/opportunities';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><Suspense fallback={<div className="page-loading">Opening your workspace…</div>}><Routes>
    <Route path="/" element={<Navigate to={defaultRoute} replace />} />
    <Route path="/demo" element={<Navigate to="/demo/opportunities" replace />} />
    <Route element={<AppShell key="demo" mode="demo" />}>
      <Route path="/demo/opportunities" element={<Opportunities />} />
      <Route path="/demo/my-search" element={<MySearch />} />
      <Route path="/demo/insights" element={<Insights />} />
    </Route>
    <Route element={<AppShell key="live" mode="live" />}>
      <Route path="/opportunities" element={<Opportunities />} />
      <Route path="/my-search" element={<MySearch />} />
      <Route path="/insights" element={<Insights />} />
    </Route>
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="*" element={<Navigate to={defaultRoute} replace />} />
  </Routes></Suspense></BrowserRouter></QueryClientProvider></React.StrictMode>,
);
