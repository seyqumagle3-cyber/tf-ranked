import React from "react";

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
              Frontend error
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Le site a planté au chargement</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              L&apos;erreur affichée ci-dessous nous dira exactement quoi corriger.
            </p>
            <pre className="mt-5 overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs text-foreground/90">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
