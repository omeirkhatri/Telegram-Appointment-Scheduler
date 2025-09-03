import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast } from './Toast';
import type { Toast as ToastType } from '@/hooks/useToast';

const mockToast: ToastType = {
  id: 'test-toast',
  type: 'success',
  title: 'Success',
  message: 'Test message',
  duration: 5000,
};

const mockOnDismiss = jest.fn();

describe('Toast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render toast with correct content', () => {
    render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render correct icon for success type', () => {
    render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);

    const icon = document.querySelector('.text-green-400');
    expect(icon).toBeInTheDocument();
  });

  it('should render correct icon for error type', () => {
    const errorToast = { ...mockToast, type: 'error' as const };
    render(<Toast toast={errorToast} onDismiss={mockOnDismiss} />);

    const icon = document.querySelector('.text-red-400');
    expect(icon).toBeInTheDocument();
  });

  it('should render correct icon for warning type', () => {
    const warningToast = { ...mockToast, type: 'warning' as const };
    render(<Toast toast={warningToast} onDismiss={mockOnDismiss} />);

    const icon = document.querySelector('.text-yellow-400');
    expect(icon).toBeInTheDocument();
  });

  it('should render correct icon for info type', () => {
    const infoToast = { ...mockToast, type: 'info' as const };
    render(<Toast toast={infoToast} onDismiss={mockOnDismiss} />);

    const icon = document.querySelector('.text-blue-400');
    expect(icon).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    jest.useFakeTimers();
    render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    // Advance timers to trigger the setTimeout in handleDismiss
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockOnDismiss).toHaveBeenCalledWith('test-toast');
    jest.useRealTimers();
  });

  it('should render action button when action is provided', () => {
    const toastWithAction = {
      ...mockToast,
      action: {
        label: 'Retry',
        onClick: jest.fn(),
      },
    };

    render(<Toast toast={toastWithAction} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should call action onClick when action button is clicked', () => {
    const mockActionClick = jest.fn();
    const toastWithAction = {
      ...mockToast,
      action: {
        label: 'Retry',
        onClick: mockActionClick,
      },
    };

    render(<Toast toast={toastWithAction} onDismiss={mockOnDismiss} />);

    const actionButton = screen.getByText('Retry');
    fireEvent.click(actionButton);

    expect(mockActionClick).toHaveBeenCalled();
  });

  it('should have correct ARIA attributes', () => {
    render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);

    const toastElement = screen.getByRole('alert');
    expect(toastElement).toHaveAttribute('aria-live', 'polite');
    expect(toastElement).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have correct styling classes for success type', () => {
    render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);

    const toastElement = screen.getByRole('alert');
    expect(toastElement).toHaveClass('border-green-200', 'shadow-green-100');
  });

  it('should have correct styling classes for error type', () => {
    const errorToast = { ...mockToast, type: 'error' as const };
    render(<Toast toast={errorToast} onDismiss={mockOnDismiss} />);

    const toastElement = screen.getByRole('alert');
    expect(toastElement).toHaveClass('border-red-200', 'shadow-red-100');
  });
});
