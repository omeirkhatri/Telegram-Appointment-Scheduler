// @ts-nocheck
'use client';

import type { MapError } from '@/types/map';
import { Component, ErrorInfo, ReactNode } from 'react';

interface MapErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: MapError) => void;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error: MapError | null;
}

export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    const mapError: MapError = {
      code: 'MAP_COMPONENT_ERROR',
      message: error.message || 'An error occurred in the map component',
      details: error,
      timestamp: Date.now(),
      context: {
        component: 'MapErrorBoundary',
        action: 'getDerivedStateFromError'
      }
    };

    return {
      hasError: true,
      error: mapError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('MapErrorBoundary caught an error:', error, errorInfo);
    }

    // Create a more detailed error object
    const mapError: MapError = {
      code: 'MAP_COMPONENT_ERROR',
      message: error.message || 'An error occurred in the map component',
      details: error,
      timestamp: Date.now(),
      context: {
        component: 'MapErrorBoundary',
        action: 'componentDidCatch',
        data: {
          componentStack: errorInfo.componentStack,
          errorBoundary: errorInfo.errorBoundary
        }
      }
    };

    this.setState({ error: mapError });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(mapError);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Map Error
            </h3>
            <p className="text-red-600 text-sm mb-4">
              {this.state.error?.message || 'Something went wrong with the map component.'}
            </p>
            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Try Again
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                    Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 font-mono overflow-auto max-h-32">
                    <div><strong>Code:</strong> {this.state.error.code}</div>
                    <div><strong>Message:</strong> {this.state.error.message}</div>
                    <div><strong>Timestamp:</strong> {new Date(this.state.error.timestamp).toISOString()}</div>
                    {this.state.error.context && (
                      <div>
                        <strong>Context:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(this.state.error.context, null, 2)}
                        </pre>
                      </div>
                    )}
                    {this.state.error.details && (
                      <div>
                        <strong>Details:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.error.details instanceof Error
                            ? this.state.error.details.stack
                            : JSON.stringify(this.state.error.details, null, 2)
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
