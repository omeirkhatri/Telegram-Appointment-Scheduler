import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  spinnerSize = 'lg',
  className = '',
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center space-y-4">
        <LoadingSpinner size={spinnerSize} color="primary" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
}
