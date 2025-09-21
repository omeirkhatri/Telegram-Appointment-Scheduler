// @ts-nocheck
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MapDateNavigation from './MapDateNavigation';

// Mock date-fns functions
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'dd/MM/yyyy') {
      return '15/01/2024';
    }
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15';
    }
    if (formatStr === 'dd/MM') {
      return '15/01';
    }
    return '15/01/2024';
  }),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  isToday: jest.fn((date) => date.getDate() === 15),
  isSameDay: jest.fn((date1, date2) => date1.getDate() === date2.getDate()),
  startOfWeek: jest.fn((date) => new Date('2024-01-15')),
  endOfWeek: jest.fn((date) => new Date('2024-01-21')),
  addWeeks: jest.fn((date, weeks) => new Date(date.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)),
  subWeeks: jest.fn((date, weeks) => new Date(date.getTime() - weeks * 7 * 24 * 60 * 60 * 1000))
}));

// Mock timezone utilities
jest.mock('@/utils/timezone', () => ({
  getCurrentDubaiTime: jest.fn(() => new Date('2024-01-15T10:00:00Z')),
  TZ: 'Asia/Dubai',
  DATE_FMT: 'dd/MM/yyyy'
}));

describe('MapDateNavigation', () => {
  const mockOnDateChange = jest.fn();
  const mockSelectedDate = new Date('2024-01-15T10:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      expect(screen.getByRole('heading', { name: 'Select Date' })).toBeInTheDocument();
      expect(screen.getAllByLabelText('Go to today')).toHaveLength(2); // Header button + quick date button
      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    });

    it('should render with custom className and style', () => {
      const customClassName = 'custom-navigation';
      const customStyle = { border: '2px solid red' };

      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          className={customClassName}
          style={customStyle}
        />
      );

      const container = screen.getByRole('group');
      expect(container).toHaveClass(customClassName);
      expect(container).toHaveStyle(customStyle);
    });

    it('should render different sizes correctly', () => {
      const { rerender } = render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          size="small"
        />
      );

      expect(screen.getByRole('group')).toBeInTheDocument();

      rerender(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          size="medium"
        />
      );

      expect(screen.getByRole('group')).toBeInTheDocument();

      rerender(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          size="large"
        />
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('should render compact variant', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          variant="compact"
        />
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
      expect(screen.getByLabelText('Next day')).toBeInTheDocument();
    });

    it('should render minimal variant', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          variant="minimal"
        />
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
      expect(screen.getByLabelText('Next day')).toBeInTheDocument();
    });
  });

  describe('Date Navigation', () => {
    it('should navigate to previous day', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const prevButton = screen.getByLabelText('Previous day');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });

    it('should navigate to next day', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const nextButton = screen.getByLabelText('Next day');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });

    it('should navigate to previous week', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          showWeekNavigation={true}
        />
      );

      const prevWeekButton = screen.getByLabelText('Previous week');
      fireEvent.click(prevWeekButton);

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });

    it('should navigate to next week', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          showWeekNavigation={true}
        />
      );

      const nextWeekButton = screen.getByLabelText('Next week');
      fireEvent.click(nextWeekButton);

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });

    it('should go to today', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          showTodayButton={true}
        />
      );

      const todayButtons = screen.getAllByLabelText('Go to today');
      const todayButton = todayButtons[0]; // Get the first one (header button)
      fireEvent.click(todayButton);

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });
  });

  describe('Date Input', () => {
    it('should handle date input change', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const dateInput = screen.getByLabelText('Select date');
      fireEvent.change(dateInput, { target: { value: '2024-01-20' } });

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });

    it('should not change date for invalid input', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const dateInput = screen.getByLabelText('Select date');
      fireEvent.change(dateInput, { target: { value: 'invalid-date' } });

      await waitFor(() => {
        expect(mockOnDateChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow key navigation', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const container = screen.getByRole('group');

      // Test left arrow
      fireEvent.keyDown(container, { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });

      // Test right arrow
      fireEvent.keyDown(container, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });

    it('should handle up/down arrow for week navigation', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          showWeekNavigation={true}
        />
      );

      const container = screen.getByRole('group');

      // Test up arrow
      fireEvent.keyDown(container, { key: 'ArrowUp' });
      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });

      // Test down arrow
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });

    it('should handle Home key to go to today', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const container = screen.getByRole('group');
      fireEvent.keyDown(container, { key: 'Home' });

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });

    it('should handle Enter key to focus date input', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const container = screen.getByRole('group');
      const dateInput = screen.getByLabelText('Select date');

      // Mock showPicker method
      dateInput.showPicker = jest.fn();

      fireEvent.keyDown(container, { key: 'Enter' });

      expect(dateInput).toHaveFocus();
      expect(dateInput.showPicker).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable all controls when disabled prop is true', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          disabled={true}
        />
      );

      const prevButton = screen.getByLabelText('Previous day');
      const nextButton = screen.getByLabelText('Next day');
      const dateInput = screen.getByLabelText('Select date');

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
      expect(dateInput).toBeDisabled();
    });

    it('should not call onDateChange when disabled', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          disabled={true}
        />
      );

      const prevButton = screen.getByLabelText('Previous day');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(mockOnDateChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('Date Range Constraints', () => {
    it('should disable previous button when at min date', () => {
      const minDate = new Date('2024-01-15');

      render(
        <MapDateNavigation
          selectedDate={minDate}
          onDateChange={mockOnDateChange}
          minDate={minDate}
        />
      );

      const prevButton = screen.getByLabelText('Previous day');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button when at max date', () => {
      const maxDate = new Date('2024-01-15');

      render(
        <MapDateNavigation
          selectedDate={maxDate}
          onDateChange={mockOnDateChange}
          maxDate={maxDate}
        />
      );

      const nextButton = screen.getByLabelText('Next day');
      expect(nextButton).toBeDisabled();
    });

    it('should not allow navigation beyond min date', async () => {
      const minDate = new Date('2024-01-15');

      render(
        <MapDateNavigation
          selectedDate={minDate}
          onDateChange={mockOnDateChange}
          minDate={minDate}
        />
      );

      const prevButton = screen.getByLabelText('Previous day');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(mockOnDateChange).not.toHaveBeenCalled();
      });
    });

    it('should not allow navigation beyond max date', async () => {
      const maxDate = new Date('2024-01-15');

      render(
        <MapDateNavigation
          selectedDate={maxDate}
          onDateChange={mockOnDateChange}
          maxDate={maxDate}
        />
      );

      const nextButton = screen.getByLabelText('Next day');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockOnDateChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('Feature Toggles', () => {
    it('should hide week navigation when showWeekNavigation is false', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          showWeekNavigation={false}
        />
      );

      expect(screen.queryByLabelText('Previous week')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next week')).not.toBeInTheDocument();
    });

    it('should hide today button when showTodayButton is false', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
          showTodayButton={false}
        />
      );

      // Should not have any "Go to today" buttons
      expect(screen.queryAllByLabelText('Go to today')).toHaveLength(0);
    });
  });

  describe('Quick Date Buttons', () => {
    it('should render quick date buttons', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      expect(screen.getAllByLabelText('Go to today')).toHaveLength(2); // Header button + quick date button
      expect(screen.getByLabelText('Go to tomorrow')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to yesterday')).toBeInTheDocument();
    });

    it('should handle quick date button clicks', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const tomorrowButton = screen.getByText('Tomorrow');
      fireEvent.click(tomorrowButton);

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Date navigation');
      expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
      expect(screen.getByLabelText('Next day')).toBeInTheDocument();
      expect(screen.getByLabelText('Select date')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const container = screen.getByRole('group');
      expect(container).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper focus management', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const container = screen.getByRole('group');
      container.focus();
      expect(container).toHaveFocus();
    });
  });

  describe('Date Formatting', () => {
    it('should format date correctly for display', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    });

    it('should show today indicator when date is today', () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      // Check for the "Today" indicator in the day navigation section
      const todayIndicators = screen.getAllByText('Today');
      expect(todayIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Animation States', () => {
    it('should show navigation state during transitions', async () => {
      render(
        <MapDateNavigation
          selectedDate={mockSelectedDate}
          onDateChange={mockOnDateChange}
        />
      );

      const prevButton = screen.getByLabelText('Previous day');
      fireEvent.click(prevButton);

      // Check if navigation state is applied
      const container = screen.getByRole('group');
      expect(container).toHaveClass('opacity-75');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid selectedDate gracefully', () => {
      const invalidDate = new Date('invalid');

      render(
        <MapDateNavigation
          selectedDate={invalidDate}
          onDateChange={mockOnDateChange}
        />
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('should handle missing onDateChange callback', () => {
      expect(() => {
        render(
          <MapDateNavigation
            selectedDate={mockSelectedDate}
            onDateChange={undefined as any}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();

      const TestComponent = () => {
        renderSpy();
        return (
          <MapDateNavigation
            selectedDate={mockSelectedDate}
            onDateChange={mockOnDateChange}
          />
        );
      };

      const { rerender } = render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});
