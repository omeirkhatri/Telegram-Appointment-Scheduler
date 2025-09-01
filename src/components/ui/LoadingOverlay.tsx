import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
  children?: React.ReactNode;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  className = '',
  children,
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {children}
      <div className='absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50'>
        <div className='text-center'>
          <LoadingSpinner size='lg' variant='primary' className='mb-2' />
          <p className='text-gray-600 text-sm'>{message}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
