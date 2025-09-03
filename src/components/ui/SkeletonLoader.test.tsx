import { render, screen } from '@testing-library/react';
import {
    SkeletonCard,
    SkeletonForm,
    SkeletonList,
    SkeletonLoader,
    SkeletonTable,
} from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders with default props', () => {
    render(<SkeletonLoader />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-gray-200', 'rounded', 'animate-pulse');
  });

  it('renders with custom dimensions', () => {
    render(<SkeletonLoader width="200px" height="50px" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
  });

  it('renders without rounded corners when specified', () => {
    render(<SkeletonLoader rounded={false} />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).not.toHaveClass('rounded');
  });

  it('renders without animation when specified', () => {
    render(<SkeletonLoader animate={false} />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).not.toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    render(<SkeletonLoader className="custom-class" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('custom-class');
  });
});

describe('SkeletonTable', () => {
  it('renders table with default props', () => {
    render(<SkeletonTable />);
    const skeletons = screen.getAllByRole('status');
    // 1 header row + 5 data rows, each with 4 columns = 24 skeletons
    expect(skeletons).toHaveLength(24);
  });

  it('renders table with custom rows and columns', () => {
    render(<SkeletonTable rows={3} columns={2} />);
    const skeletons = screen.getAllByRole('status');
    // 1 header row + 3 data rows, each with 2 columns = 8 skeletons
    expect(skeletons).toHaveLength(8);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonTable className="custom-table" />);
    expect(container.firstChild).toHaveClass('custom-table');
  });
});

describe('SkeletonCard', () => {
  it('renders card without avatar', () => {
    render(<SkeletonCard />);
    const skeletons = screen.getAllByRole('status');
    // 3 lines of text
    expect(skeletons).toHaveLength(3);
  });

  it('renders card with avatar', () => {
    render(<SkeletonCard showAvatar={true} />);
    const skeletons = screen.getAllByRole('status');
    // 1 avatar + 3 lines of text
    expect(skeletons).toHaveLength(4);
  });

  it('renders card with custom number of lines', () => {
    render(<SkeletonCard lines={5} />);
    const skeletons = screen.getAllByRole('status');
    // 5 lines of text
    expect(skeletons).toHaveLength(5);
  });
});

describe('SkeletonList', () => {
  it('renders list with default props', () => {
    render(<SkeletonList />);
    const skeletons = screen.getAllByRole('status');
    // 5 items × 2 lines each = 10 skeletons
    expect(skeletons).toHaveLength(10);
  });

  it('renders list with custom number of items', () => {
    render(<SkeletonList items={3} />);
    const skeletons = screen.getAllByRole('status');
    // 3 items × 2 lines each = 6 skeletons
    expect(skeletons).toHaveLength(6);
  });

  it('renders list with avatars', () => {
    render(<SkeletonList showAvatar={true} />);
    const skeletons = screen.getAllByRole('status');
    // 5 items × (1 avatar + 2 lines) = 15 skeletons
    expect(skeletons).toHaveLength(15);
  });
});

describe('SkeletonForm', () => {
  it('renders form with default props', () => {
    render(<SkeletonForm />);
    const skeletons = screen.getAllByRole('status');
    // 4 fields × 2 elements each (label + input) + 1 submit button = 9 skeletons
    expect(skeletons).toHaveLength(9);
  });

  it('renders form with custom number of fields', () => {
    render(<SkeletonForm fields={2} />);
    const skeletons = screen.getAllByRole('status');
    // 2 fields × 2 elements each + 1 submit button = 5 skeletons
    expect(skeletons).toHaveLength(5);
  });

  it('renders form without submit button', () => {
    render(<SkeletonForm showSubmitButton={false} />);
    const skeletons = screen.getAllByRole('status');
    // 4 fields × 2 elements each = 8 skeletons
    expect(skeletons).toHaveLength(8);
  });
});
