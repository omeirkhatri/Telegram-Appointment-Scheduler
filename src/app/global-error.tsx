'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console for debugging
    console.error('Global Application Error:', error);
    console.error('Error Stack:', error.stack);
    console.error('Error Digest:', error.digest);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Critical Application Error</h1>
              <p className="text-gray-600 mb-6">
                A critical error occurred. Here are the detailed information:
              </p>

              <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Error Details:</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Message:</span>
                    <pre className="mt-1 text-red-600 break-words">{error.message}</pre>
                  </div>
                  {error.digest && (
                    <div>
                      <span className="font-medium">Digest:</span>
                      <span className="ml-2 text-gray-600">{error.digest}</span>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <span className="font-medium">Stack Trace:</span>
                      <pre className="mt-1 text-xs text-gray-600 overflow-auto max-h-40">{error.stack}</pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-4 justify-center">
                <button
                  onClick={reset}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
