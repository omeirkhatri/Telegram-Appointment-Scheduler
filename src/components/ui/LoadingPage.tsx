import { LoadingSpinner } from './LoadingSpinner';

interface LoadingPageProps {
  message?: string;
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingPage({
  message = 'Loading page...',
  spinnerSize = 'xl',
  className = '',
}: LoadingPageProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${className}`}>
      <div className="text-center">
        <LoadingSpinner size={spinnerSize} color="primary" className="mb-4" />
        <p className="text-gray-600 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}
