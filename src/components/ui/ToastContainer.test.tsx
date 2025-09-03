import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToastContext } from './ToastContainer';

// Test component that uses the toast context
function TestComponent() {
  const { showToast, dismissToast, dismissAllToasts } = useToastContext();

  return (
    <div>
      <button onClick={() => showToast({ type: 'success', title: 'Success', message: 'Test success' })}>
        Show Success
      </button>
      <button onClick={() => showToast({ type: 'error', title: 'Error', message: 'Test error' })}>
        Show Error
      </button>
      <button onClick={() => dismissToast('test-id')}>
        Dismiss Toast
      </button>
      <button onClick={dismissAllToasts}>
        Dismiss All
      </button>
    </div>
  );
}

describe('ToastContainer', () => {
  it('should provide toast context to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    expect(screen.getByText('Show Success')).toBeInTheDocument();
    expect(screen.getByText('Show Error')).toBeInTheDocument();
  });

  it('should show toast when showToast is called', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Test success')).toBeInTheDocument();
  });

  it('should show multiple toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should have correct container positioning', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const container = screen.getByLabelText('Notifications');
    expect(container).toHaveClass('fixed', 'inset-0', 'z-50');
  });

  it('should have correct ARIA attributes on container', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const container = screen.getByLabelText('Notifications');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });
});

describe('useToastContext', () => {
  it('should throw error when used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToastContext must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });
});
