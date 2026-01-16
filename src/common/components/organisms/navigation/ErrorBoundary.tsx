"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/common/components/atoms/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component for navigation-related errors
 * Catches errors in navigation components and displays a fallback UI
 */
export class NavigationErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    if (process.env.NODE_ENV === "development") {
      console.error("Navigation error caught by boundary:", error);
      console.error("Error info:", errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Store error info for display
    this.setState({
      errorInfo,
    });

    // TODO: Integrate with error logging service (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-6 border border-red-200 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Navigation Error
          </h2>
          <p className="text-sm text-red-600 mb-4 text-center">
            Something went wrong with the navigation. Please try refreshing the page.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="w-full mb-4">
              <summary className="text-xs text-red-500 cursor-pointer mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack && (
                  <>
                    {"\n\nComponent Stack:\n"}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          <Button
            onClick={this.handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

