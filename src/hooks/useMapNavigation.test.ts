import type { MapBounds, MapSearchFilters } from '@/types/map';
import { act, renderHook } from '@testing-library/react';
import { useMapNavigation, useMapNavigationWithDate, useMapNavigationWithDefaults } from './useMapNavigation';

describe('useMapNavigation', () => {
  const mockDate = new Date('2024-01-15T10:00:00Z');
  const mockBounds: MapBounds = {
    northeast: { lat: 25.3, lng: 55.3 },
    southwest: { lat: 25.1, lng: 55.1 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with current date and day view', () => {
      const { result } = renderHook(() => useMapNavigation());

      expect(result.current.state.currentDate).toBeInstanceOf(Date);
      expect(result.current.state.viewType).toBe('day');
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should initialize with custom date', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      expect(result.current.state.currentDate).toEqual(mockDate);
    });

    it('should initialize with custom view type', () => {
      const { result } = renderHook(() => useMapNavigation({ initialView: 'week' }));

      expect(result.current.state.viewType).toBe('week');
    });

    it('should initialize with default configuration', () => {
      const { result } = renderHook(() => useMapNavigationWithDefaults());

      expect(result.current.state.currentDate).toBeInstanceOf(Date);
      expect(result.current.state.viewType).toBe('day');
    });

    it('should initialize with custom date hook', () => {
      const { result } = renderHook(() => useMapNavigationWithDate(mockDate));

      expect(result.current.state.currentDate).toEqual(mockDate);
    });
  });

  describe('date navigation', () => {
    it('should navigate to specific date', () => {
      const { result } = renderHook(() => useMapNavigation());
      const targetDate = new Date('2024-02-01');

      act(() => {
        result.current.goToDate(targetDate);
      });

      expect(result.current.state.currentDate).toEqual(targetDate);
    });

    it('should navigate to today', () => {
      const { result } = renderHook(() => useMapNavigation());
      const today = new Date();

      act(() => {
        result.current.goToToday();
      });

      expect(result.current.state.currentDate.getDate()).toBe(today.getDate());
    });

    it('should navigate to previous day', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      act(() => {
        result.current.goToPreviousDay();
      });

      const expectedDate = new Date(mockDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
      expect(result.current.state.currentDate).toEqual(expectedDate);
    });

    it('should navigate to next day', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      act(() => {
        result.current.goToNextDay();
      });

      const expectedDate = new Date(mockDate);
      expectedDate.setDate(expectedDate.getDate() + 1);
      expect(result.current.state.currentDate).toEqual(expectedDate);
    });

    it('should navigate to previous week', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      act(() => {
        result.current.goToPreviousWeek();
      });

      const expectedDate = new Date(mockDate);
      expectedDate.setDate(expectedDate.getDate() - 7);
      expect(result.current.state.currentDate).toEqual(expectedDate);
    });

    it('should navigate to next week', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      act(() => {
        result.current.goToNextWeek();
      });

      const expectedDate = new Date(mockDate);
      expectedDate.setDate(expectedDate.getDate() + 7);
      expect(result.current.state.currentDate).toEqual(expectedDate);
    });

    it('should navigate to previous month', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      act(() => {
        result.current.goToPreviousMonth();
      });

      const expectedDate = new Date(mockDate);
      expectedDate.setDate(expectedDate.getDate() - 30);
      expect(result.current.state.currentDate).toEqual(expectedDate);
    });

    it('should navigate to next month', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      act(() => {
        result.current.goToNextMonth();
      });

      const expectedDate = new Date(mockDate);
      expectedDate.setDate(expectedDate.getDate() + 30);
      expect(result.current.state.currentDate).toEqual(expectedDate);
    });
  });

  describe('view management', () => {
    it('should set view type', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.setViewType('week');
      });

      expect(result.current.state.viewType).toBe('week');
    });

    it('should toggle view type', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.toggleViewType();
      });

      expect(result.current.state.viewType).toBe('week');

      act(() => {
        result.current.toggleViewType();
      });

      expect(result.current.state.viewType).toBe('month');

      act(() => {
        result.current.toggleViewType();
      });

      expect(result.current.state.viewType).toBe('day');
    });
  });

  describe('date range management', () => {
    it('should set custom date range', () => {
      const { result } = renderHook(() => useMapNavigation());
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      act(() => {
        result.current.setDateRange(startDate, endDate);
      });

      expect(result.current.state.dateRange.start).toEqual(startDate);
      expect(result.current.state.dateRange.end).toEqual(endDate);
    });

    it('should set time range', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.setTimeRange('09:00', '17:00');
      });

      expect(result.current.state.timeRange.start).toBe('09:00');
      expect(result.current.state.timeRange.end).toBe('17:00');
    });

    it('should reset date range', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      act(() => {
        result.current.setDateRange(new Date('2024-01-01'), new Date('2024-01-31'));
        result.current.resetDateRange();
      });

      expect(result.current.state.dateRange.start).toEqual(mockDate);
      expect(result.current.state.dateRange.end).toEqual(mockDate);
    });

    it('should reset time range', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.setTimeRange('09:00', '17:00');
        result.current.resetTimeRange();
      });

      expect(result.current.state.timeRange.start).toBe('00:00');
      expect(result.current.state.timeRange.end).toBe('23:59');
    });

    it('should handle invalid date range', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useMapNavigation({ onError }));
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');

      act(() => {
        result.current.setDateRange(startDate, endDate);
      });

      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.error?.code).toBe('INVALID_DATE_RANGE');
      expect(onError).toHaveBeenCalled();
    });

    it('should handle invalid time range', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useMapNavigation({ onError }));

      act(() => {
        result.current.setTimeRange('17:00', '09:00');
      });

      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.error?.code).toBe('INVALID_TIME_RANGE');
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('filter management', () => {
    it('should update filters', () => {
      const { result } = renderHook(() => useMapNavigation());
      const filters: Partial<MapSearchFilters> = {
        appointment_types: ['doctor_on_call'],
        statuses: ['scheduled']
      };

      act(() => {
        result.current.updateFilters(filters);
      });

      expect(result.current.state.searchFilters.appointment_types).toEqual(['doctor_on_call']);
      expect(result.current.state.searchFilters.statuses).toEqual(['scheduled']);
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.updateFilters({ appointment_types: ['doctor_on_call'] });
        result.current.clearFilters();
      });

      expect(result.current.state.searchFilters).toEqual({});
    });

    it('should reset filters', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.updateFilters({ appointment_types: ['doctor_on_call'] });
        result.current.resetFilters();
      });

      expect(result.current.state.searchFilters.date_range).toBeDefined();
      expect(result.current.state.searchFilters.time_range).toBeDefined();
    });
  });

  describe('map bounds management', () => {
    it('should set map bounds', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.setMapBounds(mockBounds);
      });

      expect(result.current.state.mapBounds).toEqual(mockBounds);
    });

    it('should clear map bounds', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.setMapBounds(mockBounds);
        result.current.clearMapBounds();
      });

      expect(result.current.state.mapBounds).toBeNull();
    });

    it('should fit to bounds', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.fitToBounds(mockBounds);
      });

      expect(result.current.state.mapBounds).toEqual(mockBounds);
    });
  });

  describe('utility functions', () => {
    it('should get current date range', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      const dateRange = result.current.getCurrentDateRange();
      expect(dateRange.start).toEqual(mockDate);
      expect(dateRange.end).toEqual(mockDate);
    });

    it('should format date', () => {
      const { result } = renderHook(() => useMapNavigation());

      const formatted = result.current.getFormattedDate(mockDate);
      expect(formatted).toBe('15/01/2024');
    });

    it('should format date range for same day', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      const formatted = result.current.getFormattedDateRange();
      expect(formatted).toBe('15/01/2024');
    });

    it('should format date range for different days', () => {
      const { result } = renderHook(() => useMapNavigation());
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      act(() => {
        result.current.setDateRange(startDate, endDate);
      });

      const formatted = result.current.getFormattedDateRange();
      expect(formatted).toBe('01/01/2024 - 31/01/2024');
    });

    it('should check if date is in range', () => {
      const { result } = renderHook(() => useMapNavigation());
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      act(() => {
        result.current.setDateRange(startDate, endDate);
      });

      expect(result.current.isDateInRange(new Date('2024-01-15'))).toBe(true);
      expect(result.current.isDateInRange(new Date('2024-02-01'))).toBe(false);
    });

    it('should check if time is in range', () => {
      const { result } = renderHook(() => useMapNavigation());

      act(() => {
        result.current.setTimeRange('09:00', '17:00');
      });

      expect(result.current.isTimeInRange('12:00')).toBe(true);
      expect(result.current.isTimeInRange('18:00')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useMapNavigation({ initialDate: mockDate }));

      act(() => {
        result.current.setViewType('week');
        result.current.setDateRange(new Date('2024-01-01'), new Date('2024-01-31'));
        result.current.setTimeRange('09:00', '17:00');
        result.current.updateFilters({ appointment_types: ['doctor_on_call'] });
        result.current.setMapBounds(mockBounds);
        result.current.reset();
      });

      expect(result.current.state.viewType).toBe('day');
      expect(result.current.state.timeRange.start).toBe('00:00');
      expect(result.current.state.timeRange.end).toBe('23:59');
      expect(result.current.state.searchFilters).toEqual({});
      expect(result.current.state.mapBounds).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('should call onDateChange when date changes', () => {
      const onDateChange = jest.fn();
      const { result } = renderHook(() => useMapNavigation({ onDateChange }));

      act(() => {
        result.current.goToDate(mockDate);
      });

      expect(onDateChange).toHaveBeenCalledWith(mockDate);
    });

    it('should call onViewChange when view changes', () => {
      const onViewChange = jest.fn();
      const { result } = renderHook(() => useMapNavigation({ onViewChange }));

      act(() => {
        result.current.setViewType('week');
      });

      expect(onViewChange).toHaveBeenCalledWith('week');
    });

    it('should call onFiltersChange when filters change', () => {
      const onFiltersChange = jest.fn();
      const { result } = renderHook(() => useMapNavigation({ onFiltersChange }));

      act(() => {
        result.current.updateFilters({ appointment_types: ['doctor_on_call'] });
      });

      expect(onFiltersChange).toHaveBeenCalledWith({
        appointment_types: ['doctor_on_call']
      });
    });

    it('should call onBoundsChange when bounds change', () => {
      const onBoundsChange = jest.fn();
      const { result } = renderHook(() => useMapNavigation({ onBoundsChange }));

      act(() => {
        result.current.setMapBounds(mockBounds);
      });

      expect(onBoundsChange).toHaveBeenCalledWith(mockBounds);
    });
  });
});
