import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { analyzeResume, type ResumeAnalysis, type ResumeProfile } from '../domain/resume';
import type { ImportedResume } from '../lib/resume-import';

export interface ResumeDocument extends ImportedResume { importedAt: string; }
export interface ResumeWorkspaceState {
  document: ResumeDocument | null;
  analysis: ResumeAnalysis | null;
  profile: ResumeProfile | null;
  reviewed: boolean;
  analysisVersion: number;
  setDocument: (document: ResumeDocument | null) => void;
  setProfile: (profile: ResumeProfile) => void;
  setReviewed: (reviewed: boolean) => void;
  analyzeDocument: (document?: ResumeDocument) => void;
  clearResume: () => void;
}
interface State {
  document: ResumeDocument | null;
  analysis: ResumeAnalysis | null;
  profile: ResumeProfile | null;
  reviewed: boolean;
  analysisVersion: number;
}
const empty = (): State => ({ document: null, analysis: null, profile: null, reviewed: false, analysisVersion: 0 });
const ResumeContext = createContext<ResumeWorkspaceState | null>(null);

function useMemoryResume(): ResumeWorkspaceState {
  const [state, setState] = useState<State>(empty);
  const setDocument = useCallback((document: ResumeDocument | null) => {
    setState(current => ({ ...current, document, analysis: null, profile: null, reviewed: false }));
  }, []);
  const setProfile = useCallback((profile: ResumeProfile) => {
    setState(current => current.analysis ? { ...current, profile, reviewed: false } : current);
  }, []);
  const setReviewed = useCallback((reviewed: boolean) => {
    setState(current => ({ ...current, reviewed: reviewed && !!current.document && !!current.analysis && !!current.profile }));
  }, []);
  const analyzeDocument = useCallback((document?: ResumeDocument) => {
    // Explicit user action only; importing or editing text never runs analysis.
    const source = document || state.document;
    if (!source) return;
    const analysis = analyzeResume(source.text);
    setState(current => ({ document: source, analysis, profile: analysis.profile, reviewed: false, analysisVersion: current.analysisVersion + 1 }));
  }, [state.document]);
  const clearResume = useCallback(() => { setState(empty()); }, []);
  return useMemo(() => ({ ...state, setDocument, setProfile, setReviewed, analyzeDocument, clearResume }), [state, setDocument, setProfile, setReviewed, analyzeDocument, clearResume]);
}

/** Mount separately for demo/live and key by auth identity. No browser persistence,
 * module-level document state, cloud writes or raw-file retention are used. */
function MemoryResumeBoundary({ children }: { children: ReactNode }) {
  const value = useMemoryResume();
  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}
export function ResumeWorkspaceProvider({ children, mode }: { children: ReactNode; mode: 'demo' | 'live' }) {
  return <MemoryResumeBoundary key={mode}>{children}</MemoryResumeBoundary>;
}

export function useOptionalResumeWorkspace(): ResumeWorkspaceState | null { return useContext(ResumeContext); }

/** Components rendered outside the application provider get their own isolated
 * memory state, never a shared fallback document across tests or users. */
export function useResumeWorkspace(): ResumeWorkspaceState {
  const context = useOptionalResumeWorkspace();
  const local = useMemoryResume();
  return context || local;
}
