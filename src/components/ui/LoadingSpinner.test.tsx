import React from 'react';
import { render } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin', 'w-6', 'h-6', 'text-blue-600');
  });

  it('renders with custom size', () => {
    const { container } = render(<LoadingSpinner size='lg' />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('w-8', 'h-8');
  });

  it('renders with custom variant', () => {
    const { container } = render(<LoadingSpinner variant='secondary' />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('text-gray-600');
  });

  it('renders with custom className', () => {
    const { container } = render(<LoadingSpinner className='custom-class' />);
    const wrapper = container.querySelector('div');

    expect(wrapper).toHaveClass('inline-block', 'custom-class');
  });

  it('renders with all custom props', () => {
    const { container } = render(
      <LoadingSpinner size='xl' variant='white' className='test-class' />,
    );
    const svg = container.querySelector('svg');
    const wrapper = container.querySelector('div');

    expect(svg).toHaveClass('w-12', 'h-12', 'text-white');
    expect(wrapper).toHaveClass('test-class');
  });
});
