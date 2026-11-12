import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Changing this (e.g. the route path) clears a previous error. */
  resetKey?: string;
  /** Full-screen variant for the app root (no console shell around it). */
  fullScreen?: boolean;
}
interface State {
  error: Error | null;
}

const isChunkError = (e: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|error loading dynamically imported module/i.test(
    e?.message || '',
  );

/**
 * Keeps a render crash (bad API shape, failed lazy chunk) from unmounting the
 * whole console and leaving an empty white, scrollable page.
 */
export default class ConsoleErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[developer console] render error', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-3 px-6 py-16 text-center ${
          this.props.fullScreen ? 'min-h-[100dvh] bg-background text-foreground' : 'min-h-[50vh]'
        }`}
      >
        <h2 className="text-lg font-semibold">{chunk ? 'A new version is available' : 'This page failed to load'}</h2>
        <p className="max-w-md text-sm opacity-70">
          {chunk
            ? 'The console was updated. Reload to get the latest version.'
            : 'Something went wrong while showing this section. Try again, or go back to the dashboard.'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}
          >
            {chunk ? 'Reload' : 'Try again'}
          </button>
          <a href="/developer" className="rounded-md border px-4 py-2 text-sm font-medium">
            Dashboard
          </a>
        </div>
      </div>
    );
  }
}