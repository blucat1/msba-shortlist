import { createContext, useContext } from 'react';
import type { AppSnapshot, Job, Opportunity } from '../domain/types';
import type { Repository } from '../repositories/types';
export interface Workspace {
  snapshot: AppSnapshot; repository: Repository; mode: 'demo' | 'live'; base: string;
  run: <T>(work: () => Promise<T>, success?: string) => Promise<T>;
  notify: (message: string) => void; requireUser: () => boolean;
  showSettings: () => void; showCoverage: () => void;
  showManual: (opportunity?: Opportunity) => void;
  openApplication: (job: Job) => void; confirmApplication: (opportunity: Opportunity) => void;
}
export const WorkspaceContext = createContext<Workspace | null>(null);
export function useWorkspace() { const state = useContext(WorkspaceContext); if (!state) throw new Error('Workspace is not available'); return state; }
