import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders children when not loading', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders overlay when loading', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(
      <LoadingOverlay isLoading={true} message='Processing...'>
        <div>Content</div>
      </LoadingOverlay>,
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <LoadingOverlay isLoading={true} className='custom-overlay'>
        <div>Content</div>
      </LoadingOverlay>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-overlay');
  });

  it('renders loading spinner in overlay', () => {
    const { container } = render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>,
    );

    const spinner = container.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });
});
