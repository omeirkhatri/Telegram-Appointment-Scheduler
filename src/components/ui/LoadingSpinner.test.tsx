import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-6', 'w-6', 'border-blue-600');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="lg" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders with custom color', () => {
    render(<LoadingSpinner color="secondary" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-gray-600');
  });

  it('renders with custom className', () => {
    render(<LoadingSpinner className="custom-class" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
  });

  it('renders with white color variant', () => {
    render(<LoadingSpinner color="white" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-white');
  });

  it('renders with gray color variant', () => {
    render(<LoadingSpinner color="gray" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-gray-400');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });
});
