
interface SuccessMessageProps {
  message: string;
  title?: string;
  onDismiss?: () => void;
  variant?: 'inline' | 'card' | 'banner';
  className?: string;
}

export function SuccessMessage({
  message,
  title = 'Success',
  onDismiss,
  variant = 'card',
  className = ''
}: SuccessMessageProps) {
  const baseClasses = 'flex items-start space-x-3 p-4 rounded-lg';
  const variantClasses = {
    inline: 'bg-green-50 border border-green-200',
    card: 'bg-white border border-green-200 shadow-sm',
    banner: 'bg-green-600 text-white',
  };

  const iconClasses = variant === 'banner' ? 'text-white' : 'text-green-400';
  const textClasses = variant === 'banner' ? 'text-white' : 'text-green-800';

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <div className="flex-shrink-0">
        <svg className={`h-5 w-5 ${iconClasses}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-medium ${textClasses}`}>{title}</h3>
        <p className={`mt-1 text-sm ${textClasses}`}>{message}</p>
        {onDismiss && (
          <div className="mt-3">
            <button
              onClick={onDismiss}
              className={`text-sm font-medium ${
                variant === 'banner'
                  ? 'text-white hover:text-green-100'
                  : 'text-green-800 hover:text-green-900'
              }`}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
