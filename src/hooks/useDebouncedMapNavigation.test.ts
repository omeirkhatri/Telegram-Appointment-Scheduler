import { act, renderHook, waitFor } from '@testing-library/react';
import { addDays, subDays } from 'date-fns';
import { useDebouncedMapNavigation } from './useDebouncedMapNavigation';

// Mock date-fns functions
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  addDays: jest.fn(),
  subDays: jest.fn(),
  format: jest.fn((date) => date.toISOString().split('T')[0]),
  isSameDay: jest.fn((a, b) => a.getTime() === b.getTime()),
  startOfWeek: jest.fn((date) => date),
  endOfWeek: jest.fn((date) => date),
  startOfMonth: jest.fn((date) => date),
  endOfMonth: jest.fn((date) => date),
}));

// Mock timezone utils
jest.mock('@/utils/timezone', () => ({
  DATE_FMT: 'dd/MM/yyyy',
}));

describe('useDebouncedMapNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      expect(result.current.state.currentDate).toBeInstanceOf(Date);
      expect(result.current.state.viewType).toBe('day');
      expect(result.current.state.isDebouncing).toBe(false);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should initialize with custom options', () => {
      const initialDate = new Date('2024-01-15');
      const { result } = renderHook(() => useDebouncedMapNavigation({
        initialDate,
        initialView: 'week',
        debounceDelay: 500,
      }));

      expect(result.current.state.currentDate).toEqual(initialDate);
      expect(result.current.state.viewType).toBe('week');
    });
  });

  describe('Date Navigation (Debounced)', () => {
    it('should debounce date navigation calls', async () => {
      const onDateChange = jest.fn();
      const { result } = renderHook(() => useDebouncedMapNavigation({
        onDateChange,
        debounceDelay: 300,
      }));

      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-16');
      const date3 = new Date('2024-01-17');

      // Make rapid date changes
      act(() => {
        result.current.goToDate(date1);
        result.current.goToDate(date2);
        result.current.goToDate(date3);
      });

      // Should be debouncing
      expect(result.current.state.isDebouncing).toBe(true);
      expect(onDateChange).not.toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.state.isDebouncing).toBe(false);
        expect(result.current.state.currentDate).toEqual(date3);
        expect(onDateChange).toHaveBeenCalledTimes(1);
        expect(onDateChange).toHaveBeenCalledWith(date3);
      });
    });

    it('should navigate to today', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());
      const today = new Date();

      act(() => {
        result.current.goToToday();
      });

      expect(result.current.state.isDebouncing).toBe(true);
    });

    it('should navigate to previous day', () => {
      const mockSubDays = subDays as jest.MockedFunction<typeof subDays>;
      const previousDay = new Date('2024-01-14');
      mockSubDays.mockReturnValue(previousDay);

      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.goToPreviousDay();
      });

      expect(mockSubDays).toHaveBeenCalledWith(expect.any(Date), 1);
      expect(result.current.state.isDebouncing).toBe(true);
    });

    it('should navigate to next day', () => {
      const mockAddDays = addDays as jest.MockedFunction<typeof addDays>;
      const nextDay = new Date('2024-01-16');
      mockAddDays.mockReturnValue(nextDay);

      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.goToNextDay();
      });

      expect(mockAddDays).toHaveBeenCalledWith(expect.any(Date), 1);
      expect(result.current.state.isDebouncing).toBe(true);
    });

    it('should navigate to previous week', () => {
      const mockSubDays = subDays as jest.MockedFunction<typeof subDays>;
      const previousWeek = new Date('2024-01-08');
      mockSubDays.mockReturnValue(previousWeek);

      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.goToPreviousWeek();
      });

      expect(mockSubDays).toHaveBeenCalledWith(expect.any(Date), 7);
      expect(result.current.state.isDebouncing).toBe(true);
    });

    it('should navigate to next week', () => {
      const mockAddDays = addDays as jest.MockedFunction<typeof addDays>;
      const nextWeek = new Date('2024-01-22');
      mockAddDays.mockReturnValue(nextWeek);

      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.goToNextWeek();
      });

      expect(mockAddDays).toHaveBeenCalledWith(expect.any(Date), 7);
      expect(result.current.state.isDebouncing).toBe(true);
    });

    it('should navigate to previous month', () => {
      const mockSubDays = subDays as jest.MockedFunction<typeof subDays>;
      const previousMonth = new Date('2023-12-15');
      mockSubDays.mockReturnValue(previousMonth);

      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.goToPreviousMonth();
      });

      expect(mockSubDays).toHaveBeenCalledWith(expect.any(Date), 30);
      expect(result.current.state.isDebouncing).toBe(true);
    });

    it('should navigate to next month', () => {
      const mockAddDays = addDays as jest.MockedFunction<typeof addDays>;
      const nextMonth = new Date('2024-02-14');
      mockAddDays.mockReturnValue(nextMonth);

      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.goToNextMonth();
      });

      expect(mockAddDays).toHaveBeenCalledWith(expect.any(Date), 30);
      expect(result.current.state.isDebouncing).toBe(true);
    });
  });

  describe('View Management', () => {
    it('should set view type immediately (not debounced)', () => {
      const onViewChange = jest.fn();
      const { result } = renderHook(() => useDebouncedMapNavigation({
        onViewChange,
      }));

      act(() => {
        result.current.setViewType('week');
      });

      expect(result.current.state.viewType).toBe('week');
      expect(result.current.state.isDebouncing).toBe(false);
      expect(onViewChange).toHaveBeenCalledWith('week');
    });

    it('should toggle view type', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.toggleViewType();
      });

      expect(result.current.state.viewType).toBe('week');
    });
  });

  describe('Filter Management (Debounced)', () => {
    it('should debounce filter updates', async () => {
      const onFiltersChange = jest.fn();
      const { result } = renderHook(() => useDebouncedMapNavigation({
        onFiltersChange,
        debounceDelay: 200,
      }));

      act(() => {
        result.current.updateFilters({ appointment_types: ['consultation'] });
        result.current.updateFilters({ statuses: ['scheduled'] });
        result.current.updateFilters({ search_query: 'test' });
      });

      expect(result.current.state.isDebouncing).toBe(true);
      expect(onFiltersChange).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(result.current.state.isDebouncing).toBe(false);
        expect(onFiltersChange).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear filters immediately', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      // Set some filters first
      act(() => {
        result.current.updateFilters({ appointment_types: ['consultation'] });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.state.searchFilters).toEqual({});
      expect(result.current.state.isDebouncing).toBe(false);
    });

    it('should reset filters to default state', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.state.searchFilters).toHaveProperty('date_range');
      expect(result.current.state.searchFilters).toHaveProperty('time_range');
    });
  });

  describe('Date Range Management', () => {
    it('should set date range immediately', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.setDateRange(startDate, endDate);
      });

      expect(result.current.state.dateRange.start).toEqual(startDate);
      expect(result.current.state.dateRange.end).toEqual(endDate);
      expect(result.current.state.isDebouncing).toBe(false);
    });

    it('should handle invalid date range', () => {
      const onError = jest.fn();
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const { result } = renderHook(() => useDebouncedMapNavigation({ onError }));

      act(() => {
        result.current.setDateRange(startDate, endDate);
      });

      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.error?.code).toBe('INVALID_DATE_RANGE');
      expect(onError).toHaveBeenCalled();
    });

    it('should set time range immediately', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.setTimeRange('09:00', '17:00');
      });

      expect(result.current.state.timeRange.start).toBe('09:00');
      expect(result.current.state.timeRange.end).toBe('17:00');
      expect(result.current.state.isDebouncing).toBe(false);
    });

    it('should handle invalid time range', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useDebouncedMapNavigation({ onError }));

      act(() => {
        result.current.setTimeRange('17:00', '09:00');
      });

      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.error?.code).toBe('INVALID_TIME_RANGE');
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Map Bounds Management', () => {
    it('should set map bounds immediately', () => {
      const bounds = {
        northeast: { lat: 25.3, lng: 55.4 },
        southwest: { lat: 25.2, lng: 55.3 }
      };
      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.setMapBounds(bounds);
      });

      expect(result.current.state.mapBounds).toEqual(bounds);
      expect(result.current.state.isDebouncing).toBe(false);
    });

    it('should clear map bounds', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.clearMapBounds();
      });

      expect(result.current.state.mapBounds).toBeNull();
    });
  });

  describe('Debouncing Controls', () => {
    it('should flush pending changes immediately', async () => {
      const onDateChange = jest.fn();
      const { result } = renderHook(() => useDebouncedMapNavigation({
        onDateChange,
        debounceDelay: 1000,
      }));

      const newDate = new Date('2024-01-20');

      act(() => {
        result.current.goToDate(newDate);
      });

      expect(result.current.state.isDebouncing).toBe(true);

      act(() => {
        result.current.flushPendingChanges();
      });

      await waitFor(() => {
        expect(result.current.state.isDebouncing).toBe(false);
        expect(result.current.state.currentDate).toEqual(newDate);
        expect(onDateChange).toHaveBeenCalledWith(newDate);
      });
    });

    it('should cancel pending changes', () => {
      const onDateChange = jest.fn();
      const { result } = renderHook(() => useDebouncedMapNavigation({
        onDateChange,
        debounceDelay: 1000,
      }));

      const newDate = new Date('2024-01-20');

      act(() => {
        result.current.goToDate(newDate);
      });

      expect(result.current.state.isDebouncing).toBe(true);

      act(() => {
        result.current.cancelPendingChanges();
      });

      expect(result.current.state.isDebouncing).toBe(false);
      expect(onDateChange).not.toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    it('should get current date range', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      const dateRange = result.current.getCurrentDateRange();

      expect(dateRange).toHaveProperty('start');
      expect(dateRange).toHaveProperty('end');
    });

    it('should format date', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());
      const date = new Date('2024-01-15');

      const formatted = result.current.getFormattedDate(date);

      expect(formatted).toBe('2024-01-15');
    });

    it('should check if date is in range', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());
      const date = new Date('2024-01-15');

      const isInRange = result.current.isDateInRange(date);

      expect(typeof isInRange).toBe('boolean');
    });

    it('should check if time is in range', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      const isInRange = result.current.isTimeInRange('12:00');

      expect(typeof isInRange).toBe('boolean');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      // Set some state first
      act(() => {
        result.current.goToDate(new Date('2024-01-20'));
        result.current.setViewType('week');
        result.current.updateFilters({ appointment_types: ['consultation'] });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.isDebouncing).toBe(false);
      expect(result.current.state.viewType).toBe('day');
      expect(result.current.state.searchFilters).toEqual({});
    });
  });

  describe('Default Hooks', () => {
    it('should provide default configuration', () => {
      const { result } = renderHook(() => useDebouncedMapNavigation());

      expect(result.current.state.currentDate).toBeInstanceOf(Date);
      expect(result.current.state.viewType).toBe('day');
    });

    it('should provide configuration with custom date', () => {
      const customDate = new Date('2024-01-15');
      const { result } = renderHook(() => useDebouncedMapNavigation({
        initialDate: customDate,
      }));

      expect(result.current.state.currentDate).toEqual(customDate);
    });
  });

  describe('Error Handling', () => {
    it('should handle component unmount gracefully', () => {
      const { result, unmount } = renderHook(() => useDebouncedMapNavigation());

      act(() => {
        result.current.goToDate(new Date('2024-01-20'));
      });

      // Unmount component
      unmount();

      // Should not throw errors
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(300);
        });
      }).not.toThrow();
    });
  });
});
