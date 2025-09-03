import { RecurringRule } from '@/types/appointment';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecurrenceRuleBuilder } from './RecurrenceRuleBuilder';

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
}));

describe('RecurrenceRuleBuilder', () => {
  const mockOnChange = jest.fn();
  const baseDate = '2024-01-15';

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render disabled state initially', () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    expect(screen.getByText('Recurring Appointment')).toBeInTheDocument();
    expect(screen.getByText('Enable to create a recurring appointment with custom patterns')).toBeInTheDocument();
  });

  it('should enable when checkbox is clicked', () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(screen.getByText('Recurrence Pattern')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Every weekday')).toBeInTheDocument();
  });

  it('should render with existing value', () => {
    const existingRule: RecurringRule = {
      frequency: 'weekly',
      interval: 1,
      days_of_week: [1, 3, 5],
    };

    render(
      <RecurrenceRuleBuilder
        value={existingRule}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    expect(screen.getByText('Recurrence Pattern')).toBeInTheDocument();
    expect(screen.getByText('Days of the Week')).toBeInTheDocument();
  });

  it('should select pattern and update rule', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select daily pattern
    const dailyButton = screen.getByText('Daily');
    fireEvent.click(dailyButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'daily',
          interval: 1,
        }),
      );
    });
  });

  it('should handle weekly pattern with days selection', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select weekly pattern
    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);

    // Select specific days
    const mondayButton = screen.getByText('Mon');
    const wednesdayButton = screen.getByText('Wed');

    fireEvent.click(mondayButton);
    fireEvent.click(wednesdayButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'weekly',
          interval: 1,
          days_of_week: [1, 3],
        }),
      );
    });
  });

  it('should handle monthly pattern with day of month', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select monthly pattern
    const monthlyButton = screen.getByText('Monthly');
    fireEvent.click(monthlyButton);

    // Set day of month
    const dayInput = screen.getByDisplayValue('1');
    fireEvent.change(dayInput, { target: { value: '15' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'monthly',
          interval: 1,
          day_of_month: 15,
        }),
      );
    });
  });

  it('should handle yearly pattern with month and day', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select yearly pattern
    const yearlyButton = screen.getByText('Yearly');
    fireEvent.click(yearlyButton);

    // Set month
    const monthSelect = screen.getByDisplayValue('January');
    fireEvent.change(monthSelect, { target: { value: '6' } });

    // Set day of month
    const dayInput = screen.getByDisplayValue('1');
    fireEvent.change(dayInput, { target: { value: '15' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'yearly',
          interval: 1,
          month_of_year: 6,
          day_of_month: 15,
        }),
      );
    });
  });

  it('should handle end date condition', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select daily pattern
    const dailyButton = screen.getByText('Daily');
    fireEvent.click(dailyButton);

    // Set end date
    const endDateRadio = screen.getByLabelText(/End on date/);
    fireEvent.click(endDateRadio);

    const endDateInput = screen.getByDisplayValue('');
    fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'daily',
          interval: 1,
          end_date: '2024-12-31',
        }),
      );
    });
  });

  it('should handle end occurrences condition', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select daily pattern
    const dailyButton = screen.getByText('Daily');
    fireEvent.click(dailyButton);

    // Set end occurrences
    const endOccurrencesRadio = screen.getByLabelText(/End after/);
    fireEvent.click(endOccurrencesRadio);

    const occurrencesInput = screen.getByDisplayValue('0');
    fireEvent.change(occurrencesInput, { target: { value: '10' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'daily',
          interval: 1,
          end_occurrences: 10,
        }),
      );
    });
  });

  it('should show validation errors for invalid rules', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select weekly pattern but don't select any days
    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);

    await waitFor(() => {
      expect(screen.getByText('Please select at least one day')).toBeInTheDocument();
    });
  });

  it('should show preview for valid rules', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select daily pattern
    const dailyButton = screen.getByText('Daily');
    fireEvent.click(dailyButton);

    await waitFor(() => {
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Next occurrences:')).toBeInTheDocument();
    });
  });

  it('should disable all inputs when disabled prop is true', () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
        disabled={true}
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('should call onChange with undefined when disabled', () => {
    const existingRule: RecurringRule = {
      frequency: 'daily',
      interval: 1,
    };

    render(
      <RecurrenceRuleBuilder
        value={existingRule}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Disable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith(undefined);
  });

  it('should handle custom interval for custom pattern', async () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Select custom pattern
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);

    // The custom interval input should be available
    const intervalInput = screen.getByDisplayValue('1');
    fireEvent.change(intervalInput, { target: { value: '3' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'daily',
          interval: 3,
        }),
      );
    });
  });

  it('should show correct pattern descriptions', () => {
    render(
      <RecurrenceRuleBuilder
        value={undefined}
        onChange={mockOnChange}
        baseDate={baseDate}
      />,
    );

    // Enable the builder
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(screen.getByText('Every day')).toBeInTheDocument();
    expect(screen.getByText('Monday to Friday')).toBeInTheDocument();
    expect(screen.getByText('Every week on the same day')).toBeInTheDocument();
    expect(screen.getByText('Every other week')).toBeInTheDocument();
    expect(screen.getByText('Every month on the same date')).toBeInTheDocument();
    expect(screen.getByText('Every 3 months')).toBeInTheDocument();
    expect(screen.getByText('Every year on the same date')).toBeInTheDocument();
    expect(screen.getByText('Custom interval')).toBeInTheDocument();
  });
});
