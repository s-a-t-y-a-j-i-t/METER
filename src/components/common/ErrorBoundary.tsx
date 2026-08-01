"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/common/Button";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors so the whole app does not go blank.
 * Does not expose stack traces to end users.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // Intentionally no console dump of sensitive app state
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
          <h2 className="text-section-title">Something went wrong</h2>
          <p className="mt-2 max-w-sm text-body">
            {this.props.label ||
              "Please try again. If the problem continues, reload the page."}
          </p>
          <Button className="mt-6 min-h-11" onClick={this.handleReload}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
