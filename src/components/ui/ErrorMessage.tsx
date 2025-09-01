import React from 'react';

interface ErrorMessageProps {
  error: string | Error | null;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'card' | 'banner';
  className?: string;
}

export function ErrorMessage({ 
  error, 
  title = 'Error',
  onRetry,
  onDismiss,
  variant = 'card',
  className = '' 
}: ErrorMessageProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  const baseClasses = 'flex items-start space-x-3 p-4 rounded-lg';
  const variantClasses = {
    inline: 'bg-red-50 border border-red-200',
    card: 'bg-white border border-red-200 shadow-sm',
    banner: 'bg-red-600 text-white',
  };

  const iconClasses = variant === 'banner' ? 'text-white' : 'text-red-400';
  const textClasses = variant === 'banner' ? 'text-white' : 'text-red-800';

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <div className="flex-shrink-0">
        <svg className={`h-5 w-5 ${iconClasses}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-medium ${textClasses}`}>{title}</h3>
        <p className={`mt-1 text-sm ${textClasses}`}>{errorMessage}</p>
        {(onRetry || onDismiss) && (
          <div className="mt-3 flex space-x-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`text-sm font-medium ${
                  variant === 'banner' 
                    ? 'text-white hover:text-red-100' 
                    : 'text-red-800 hover:text-red-900'
                }`}
              >
                Try again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-sm font-medium ${
                  variant === 'banner' 
                    ? 'text-white hover:text-red-100' 
                    : 'text-red-800 hover:text-red-900'
                }`}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
