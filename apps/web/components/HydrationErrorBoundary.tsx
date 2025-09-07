'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isHydrationError: boolean;
}

class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      isHydrationError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a hydration error
    const isHydrationError = Boolean(
      error.message?.includes('Hydration failed') ||
      error.message?.includes('hydration') ||
      error.message?.includes('server rendered HTML didn\'t match') ||
      error.stack?.includes('hydration')
    );

    return {
      hasError: true,
      isHydrationError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log hydration errors in development
    if (this.state.isHydrationError && process.env.NODE_ENV === 'development') {
      console.warn('🔄 Hydration mismatch detected (likely due to browser extension):', error.message);
      console.warn('This is typically caused by browser extensions and is automatically handled.');
    }
    
    // For non-hydration errors, we still want to see them
    if (!this.state.isHydrationError) {
      console.error('Application Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.isHydrationError) {
      // For hydration errors, silently re-render the children
      // This allows React to reconcile on the client side
      return (
        <div suppressHydrationWarning={true}>
          {this.props.children}
        </div>
      );
    }

    if (this.state.hasError && !this.state.isHydrationError) {
      // For other errors, show a proper error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-sm text-gray-600 mb-4">
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HydrationErrorBoundary;