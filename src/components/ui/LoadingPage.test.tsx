import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingPage from './LoadingPage';

describe('LoadingPage', () => {
  it('renders with default message', () => {
    render(<LoadingPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingPage message='Please wait...' />);

    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<LoadingPage className='custom-bg' />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveClass('custom-bg');
  });

  it('renders loading spinner', () => {
    const { container } = render(<LoadingPage />);
    const spinner = container.querySelector('svg');

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });
});
