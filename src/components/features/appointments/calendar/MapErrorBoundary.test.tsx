// @ts-nocheck
import type { MapError } from '@/types/map';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import MapErrorBoundary from './MapErrorBoundary';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws a non-Error object
const ThrowNonError = () => {
  throw 'String error';
};

// Component that throws an error with custom message
const ThrowCustomError = () => {
  const error = new Error('Custom error message');
  error.name = 'CustomError';
  throw error;
};

describe('MapErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <MapErrorBoundary>
          <div data-testid="child">Test content</div>
        </MapErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      render(
        <MapErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors and display error UI', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Map Error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle non-Error objects', () => {
      render(
        <MapErrorBoundary>
          <ThrowNonError />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Map Error')).toBeInTheDocument();
      expect(screen.getByText('An error occurred in the map component')).toBeInTheDocument();
    });

    it('should handle custom error messages', () => {
      render(
        <MapErrorBoundary>
          <ThrowCustomError />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Map Error')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should call onError callback when provided', () => {
      const onError = jest.fn();

      render(
        <MapErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MAP_COMPONENT_ERROR',
          message: 'Test error',
          timestamp: expect.any(Number),
          context: expect.objectContaining({
            component: 'MapErrorBoundary',
            action: 'componentDidCatch'
          })
        })
      );
    });
  });

  describe('Error Recovery', () => {
    it('should show retry button when error occurs', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Map Error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should reset error state on retry', () => {
      const { rerender } = render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Map Error')).toBeInTheDocument();

      // Click retry button
      fireEvent.click(screen.getByText('Try Again'));

      // Re-render with same error component
      rerender(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      // Should show error again
      expect(screen.getByText('Map Error')).toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should show error details in development mode', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();

      // Click to expand details
      fireEvent.click(screen.getByText('Error Details'));

      expect(screen.getByText(/Code:/)).toBeInTheDocument();
      expect(screen.getByText(/Message:/)).toBeInTheDocument();
      expect(screen.getByText(/Timestamp:/)).toBeInTheDocument();
      expect(screen.getByText(/Context:/)).toBeInTheDocument();
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });
  });

  describe('Error Object Structure', () => {
    it('should create proper MapError object', () => {
      const onError = jest.fn();

      render(
        <MapErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      const errorObject = onError.mock.calls[0][0] as MapError;

      expect(errorObject).toMatchObject({
        code: 'MAP_COMPONENT_ERROR',
        message: 'Test error',
        timestamp: expect.any(Number),
        context: {
          component: 'MapErrorBoundary',
          action: 'componentDidCatch',
          data: {
            componentStack: expect.any(String),
            errorBoundary: undefined
          }
        }
      });
    });

    it('should handle error with stack trace', () => {
      const onError = jest.fn();

      render(
        <MapErrorBoundary onError={onError}>
          <ThrowCustomError />
        </MapErrorBoundary>
      );

      const errorObject = onError.mock.calls[0][0] as MapError;

      expect(errorObject.details).toBeInstanceOf(Error);
      expect(errorObject.details).toHaveProperty('name', 'CustomError');
      expect(errorObject.details).toHaveProperty('message', 'Custom error message');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Map Error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();

      // Check that the retry button is accessible
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton.tagName).toBe('BUTTON');
    });

    it('should be keyboard accessible', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();

      // Should be focusable
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);
    });
  });

  describe('Multiple Errors', () => {
    it('should handle multiple error boundary instances', () => {
      render(
        <div>
          <MapErrorBoundary>
            <ThrowError shouldThrow={true} />
          </MapErrorBoundary>
          <MapErrorBoundary>
            <div>No error</div>
          </MapErrorBoundary>
        </div>
      );

      expect(screen.getByText('Map Error')).toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should isolate errors between boundaries', () => {
      const onError1 = jest.fn();
      const onError2 = jest.fn();

      render(
        <div>
          <MapErrorBoundary onError={onError1}>
            <ThrowError shouldThrow={true} />
          </MapErrorBoundary>
          <MapErrorBoundary onError={onError2}>
            <div>No error</div>
          </MapErrorBoundary>
        </div>
      );

      expect(onError1).toHaveBeenCalledTimes(1);
      expect(onError2).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', () => {
      render(
        <MapErrorBoundary>
          {null}
        </MapErrorBoundary>
      );

      // Should not throw an error
      expect(screen.queryByText('Map Error')).not.toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(
        <MapErrorBoundary>
          {undefined}
        </MapErrorBoundary>
      );

      // Should not throw an error
      expect(screen.queryByText('Map Error')).not.toBeInTheDocument();
    });

    it('should handle empty children', () => {
      render(
        <MapErrorBoundary>
          <></>
        </MapErrorBoundary>
      );

      // Should not throw an error
      expect(screen.queryByText('Map Error')).not.toBeInTheDocument();
    });
  });
});
