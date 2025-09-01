import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingPageProps {
  message?: string;
  className?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="xl" variant="primary" className="mb-4" />
        <p className="text-gray-600 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingPage;
