import { Component, type ReactNode } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { appConfig } from '../config';

/** Rendering failures never print exception contents or private workspace data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    const home = window.location.pathname.startsWith('/demo') ? '/demo/opportunities' : '/opportunities';
    return <main className="recovery-state" aria-labelledby="recovery-heading">
      <span className="eyebrow">{appConfig.name}</span>
      <h1 id="recovery-heading">Your workspace hit a problem</h1>
      <p>Reload the page to try again. If the problem continues, return to Opportunities.</p>
      <div className="inline-actions">
        <button className="button button-primary" onClick={() => window.location.reload()}><RotateCcw size={17} aria-hidden="true" /> Reload page</button>
        <a className="button button-secondary" href={home}>Go to Opportunities <ArrowRight size={17} aria-hidden="true" /></a>
      </div>
    </main>;
  }
}
