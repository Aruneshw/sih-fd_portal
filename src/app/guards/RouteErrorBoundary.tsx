import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/** One boundary per route: a crash in one page never blanks the app (FR-M02-4). */
export class RouteErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route error', error, info.componentStack);
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-lg border border-red-700/30 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-red-700" aria-hidden />
            <div className="space-y-2">
              <h1 className="text-base font-semibold text-navy-900">This page ran into a problem</h1>
              <p className="text-sm text-slate-600">The rest of the application is unaffected. Your data has not been changed.</p>
              <p className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">{this.state.error.message}</p>
              <div className="flex gap-2 pt-1">
                <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => window.location.reload()}>Reload page</button>
                <a href="#/" className="rounded-md bg-navy-700 px-3 py-1.5 text-sm text-white" onClick={() => this.setState({ error: null })}>Go to dashboard</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
