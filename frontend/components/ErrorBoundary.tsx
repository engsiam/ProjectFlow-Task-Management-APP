import { Component } from "preact";
import type { ComponentChildren } from "preact";
import { Icon } from "./ui.tsx";

interface Props {
  children: ComponentChildren;
  fallback?: ComponentChildren;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static override getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error) {
    this.props.onError?.(error);
    console.error("[ErrorBoundary]", error);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div class="error-boundary">
          <div class="error-boundary-inner">
            <Icon name="error" size={32} style={{ color: "var(--danger)" }} />
            <p><strong>Something went wrong</strong></p>
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
