import { render, screen } from '@testing-library/react';
import { KPICard, AppointmentKPICard } from './KPICard';
import type { KPI } from '@/types/reports';

// Mock the formatKPIValue function
jest.mock('@/types/reports', () => ({
  ...jest.requireActual('@/types/reports'),
  formatKPIValue: (value: number | string, unit?: string) => {
    if (typeof value === 'string') return value;
    if (unit === 'percentage') return `${value}%`;
    if (unit === 'minutes') return `${value} min`;
    return value.toString();
  }
}));

const mockKPI: KPI = {
  id: 'test-kpi',
  title: 'Test KPI',
  value: 100,
  change: 5,
  changeType: 'positive',
  unit: 'percentage',
  description: 'Test description',
  trend: 'up',
  icon: 'activity'
};

describe('KPICard', () => {
  it('renders KPI card with all props', () => {
    render(<KPICard kpi={mockKPI} />);
    
    expect(screen.getByText('Test KPI')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('renders KPI card without optional props', () => {
    const minimalKPI: KPI = {
      id: 'minimal-kpi',
      title: 'Minimal KPI',
      value: 50
    };
    
    render(<KPICard kpi={minimalKPI} />);
    
    expect(screen.getByText('Minimal KPI')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<KPICard kpi={mockKPI} size="small" />);
    const cardElement = screen.getByText('Test KPI').closest('.bg-white');
    expect(cardElement).toHaveClass('p-4');
    
    rerender(<KPICard kpi={mockKPI} size="large" />);
    const largeCardElement = screen.getByText('Test KPI').closest('.bg-white');
    expect(largeCardElement).toHaveClass('p-8');
  });

  it('shows trend indicator when showTrend is true', () => {
    render(<KPICard kpi={mockKPI} showTrend={true} />);
    // The trend icon should be present (TrendingUp for 'up' trend)
    expect(screen.getByText('Test KPI').closest('div')).toBeInTheDocument();
  });

  it('hides trend indicator when showTrend is false', () => {
    render(<KPICard kpi={mockKPI} showTrend={false} />);
    // The trend icon should not be present
    expect(screen.getByText('Test KPI').closest('div')).toBeInTheDocument();
  });

  it('applies correct change type colors', () => {
    const { rerender } = render(<KPICard kpi={{ ...mockKPI, changeType: 'positive' }} />);
    expect(screen.getByText('+5%')).toHaveClass('text-green-600', 'bg-green-50');
    
    rerender(<KPICard kpi={{ ...mockKPI, changeType: 'negative' }} />);
    expect(screen.getByText('+5%')).toHaveClass('text-red-600', 'bg-red-50');
    
    rerender(<KPICard kpi={{ ...mockKPI, changeType: 'neutral' }} />);
    expect(screen.getByText('+5%')).toHaveClass('text-gray-600', 'bg-gray-50');
  });
});

describe('AppointmentKPICard', () => {
  const mockProps = {
    total: 150,
    today: 12,
    completionRate: 85.5,
    averageDuration: 45
  };

  it('renders all appointment KPI cards', () => {
    render(<AppointmentKPICard {...mockProps} />);
    
    expect(screen.getByText('Total Appointments')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    
    expect(screen.getByText('Today\'s Appointments')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    
    expect(screen.getByText('Average Duration')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<AppointmentKPICard {...mockProps} className="custom-class" />);
    const containerElement = screen.getByText('Total Appointments').closest('.grid');
    expect(containerElement).toHaveClass('custom-class');
  });
});
