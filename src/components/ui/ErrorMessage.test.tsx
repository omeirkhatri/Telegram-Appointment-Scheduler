import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage', () => {
  it('renders nothing when no error is provided', () => {
    const { container } = render(<ErrorMessage error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message with string error', () => {
    render(<ErrorMessage error="Something went wrong" />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders error message with Error object', () => {
    const error = new Error('Network error');
    render(<ErrorMessage error={error} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ErrorMessage error="Test error" title="Custom Error" />);
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders inline variant correctly', () => {
    render(<ErrorMessage error="Test error" variant="inline" />);
    
    const errorContainer = screen.getByText('Test error').closest('div');
    expect(errorContainer).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('renders banner variant correctly', () => {
    render(<ErrorMessage error="Test error" variant="banner" />);
    
    const errorContainer = screen.getByText('Test error').closest('div');
    expect(errorContainer).toHaveClass('bg-red-600', 'text-white');
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<ErrorMessage error="Test error" onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try again');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage error="Test error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows both retry and dismiss buttons when both handlers are provided', () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    
    render(<ErrorMessage error="Test error" onRetry={onRetry} onDismiss={onDismiss} />);
    
    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ErrorMessage error="Test error" className="custom-class" />);
    
    const errorContainer = screen.getByText('Test error').closest('div');
    expect(errorContainer).toHaveClass('custom-class');
  });

  it('renders with card variant by default', () => {
    render(<ErrorMessage error="Test error" />);
    
    const errorContainer = screen.getByText('Test error').closest('div');
    expect(errorContainer).toHaveClass('bg-white', 'border-red-200', 'shadow-sm');
  });
});
