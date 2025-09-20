'use client';

import type {
    MapBounds,
    MapError,
    MapSearchFilters
} from '@/types/map';
import { DATE_FMT } from '@/utils/timezone';
import { addDays, endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseMapNavigationOptions {
  initialDate?: Date;
  initialView?: 'day' | 'week' | 'month';
  enableDateRange?: boolean;
  enableTimeRange?: boolean;
  enableFilters?: boolean;
  autoUpdateMarkers?: boolean;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
  onFiltersChange?: (filters: MapSearchFilters) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  onError?: (error: MapError) => void;
}

export interface MapNavigationState {
  currentDate: Date;
  viewType: 'day' | 'week' | 'month';
  dateRange: {
    start: Date;
    end: Date;
  };
  timeRange: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  searchFilters: MapSearchFilters;
  mapBounds: MapBounds | null;
  isLoading: boolean;
  error: MapError | null;
}

export interface UseMapNavigationReturn {
  // State
  state: MapNavigationState;

  // Date navigation
  goToDate: (date: Date) => void;
  goToToday: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;

  // View management
  setViewType: (view: 'day' | 'week' | 'month') => void;
  toggleViewType: () => void;

  // Date range management
  setDateRange: (start: Date, end: Date) => void;
  setTimeRange: (start: string, end: string) => void;
  resetDateRange: () => void;
  resetTimeRange: () => void;

  // Filter management
  updateFilters: (filters: Partial<MapSearchFilters>) => void;
  clearFilters: () => void;
  resetFilters: () => void;

  // Map bounds management
  setMapBounds: (bounds: MapBounds) => void;
  clearMapBounds: () => void;
  fitToBounds: (bounds: MapBounds) => void;

  // Utility functions
  getCurrentDateRange: () => { start: Date; end: Date };
  getFormattedDate: (date: Date) => string;
  getFormattedDateRange: () => string;
  isDateInRange: (date: Date) => boolean;
  isTimeInRange: (time: string) => boolean;

  // Reset
  reset: () => void;
}

/**
 * Custom hook for map navigation and date management
 *
 * This hook provides comprehensive navigation functionality for map views
 * including date navigation, view switching, filtering, and bounds management.
 */
export function useMapNavigation(options: UseMapNavigationOptions = {}): UseMapNavigationReturn {
  const [state, setState] = useState<MapNavigationState>({
    currentDate: options.initialDate || new Date(),
    viewType: options.initialView || 'day',
    dateRange: {
      start: options.initialDate || new Date(),
      end: options.initialDate || new Date(),
    },
    timeRange: {
      start: '00:00',
      end: '23:59',
    },
    searchFilters: {},
    mapBounds: null,
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const navigationHistory = useRef<Date[]>([]);
  const maxHistorySize = 10;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update date range when current date or view type changes
  useEffect(() => {
    const newDateRange = calculateDateRange(state.currentDate, state.viewType);
    setState(prev => ({ ...prev, dateRange: newDateRange }));
  }, [state.currentDate, state.viewType]);

  // Notify parent components of changes
  useEffect(() => {
    if (isMountedRef.current) {
      options.onDateChange?.(state.currentDate);
    }
  }, [state.currentDate, options.onDateChange]);

  useEffect(() => {
    if (isMountedRef.current) {
      options.onViewChange?.(state.viewType);
    }
  }, [state.viewType, options.onViewChange]);

  useEffect(() => {
    if (isMountedRef.current) {
      options.onFiltersChange?.(state.searchFilters);
    }
  }, [state.searchFilters, options.onFiltersChange]);

  useEffect(() => {
    if (isMountedRef.current && state.mapBounds) {
      options.onBoundsChange?.(state.mapBounds);
    }
  }, [state.mapBounds, options.onBoundsChange]);

  /**
   * Navigate to a specific date
   */
  const goToDate = useCallback((date: Date) => {
    if (!isMountedRef.current) return;

    // Add to navigation history
    navigationHistory.current.unshift(state.currentDate);
    if (navigationHistory.current.length > maxHistorySize) {
      navigationHistory.current.pop();
    }

    setState(prev => ({ ...prev, currentDate: date }));
  }, [state.currentDate]);

  /**
   * Navigate to today
   */
  const goToToday = useCallback(() => {
    goToDate(new Date());
  }, [goToDate]);

  /**
   * Navigate to previous day
   */
  const goToPreviousDay = useCallback(() => {
    const previousDay = subDays(state.currentDate, 1);
    goToDate(previousDay);
  }, [state.currentDate, goToDate]);

  /**
   * Navigate to next day
   */
  const goToNextDay = useCallback(() => {
    const nextDay = addDays(state.currentDate, 1);
    goToDate(nextDay);
  }, [state.currentDate, goToDate]);

  /**
   * Navigate to previous week
   */
  const goToPreviousWeek = useCallback(() => {
    const previousWeek = subDays(state.currentDate, 7);
    goToDate(previousWeek);
  }, [state.currentDate, goToDate]);

  /**
   * Navigate to next week
   */
  const goToNextWeek = useCallback(() => {
    const nextWeek = addDays(state.currentDate, 7);
    goToDate(nextWeek);
  }, [state.currentDate, goToDate]);

  /**
   * Navigate to previous month
   */
  const goToPreviousMonth = useCallback(() => {
    const previousMonth = subDays(state.currentDate, 30);
    goToDate(previousMonth);
  }, [state.currentDate, goToDate]);

  /**
   * Navigate to next month
   */
  const goToNextMonth = useCallback(() => {
    const nextMonth = addDays(state.currentDate, 30);
    goToDate(nextMonth);
  }, [state.currentDate, goToDate]);

  /**
   * Set view type
   */
  const setViewType = useCallback((view: 'day' | 'week' | 'month') => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, viewType: view }));
  }, []);

  /**
   * Toggle between view types
   */
  const toggleViewType = useCallback(() => {
    const viewOrder: ('day' | 'week' | 'month')[] = ['day', 'week', 'month'];
    const currentIndex = viewOrder.indexOf(state.viewType);
    const nextIndex = (currentIndex + 1) % viewOrder.length;
    setViewType(viewOrder[nextIndex]);
  }, [state.viewType, setViewType]);

  /**
   * Set custom date range
   */
  const setDateRange = useCallback((start: Date, end: Date) => {
    if (!isMountedRef.current) return;

    if (start > end) {
      const error: MapError = {
        code: 'INVALID_DATE_RANGE',
        message: 'Start date cannot be after end date',
        timestamp: Date.now(),
        context: {
          component: 'useMapNavigation',
          action: 'setDateRange'
        }
      };

      setState(prev => ({ ...prev, error }));
      options.onError?.(error);
      return;
    }

    setState(prev => ({
      ...prev,
      dateRange: { start, end },
      searchFilters: {
        ...prev.searchFilters,
        date_range: {
          start_date: format(start, 'yyyy-MM-dd'),
          end_date: format(end, 'yyyy-MM-dd')
        }
      }
    }));
  }, [options.onError]);

  /**
   * Set time range
   */
  const setTimeRange = useCallback((start: string, end: string) => {
    if (!isMountedRef.current) return;

    if (start > end) {
      const error: MapError = {
        code: 'INVALID_TIME_RANGE',
        message: 'Start time cannot be after end time',
        timestamp: Date.now(),
        context: {
          component: 'useMapNavigation',
          action: 'setTimeRange'
        }
      };

      setState(prev => ({ ...prev, error }));
      options.onError?.(error);
      return;
    }

    setState(prev => ({
      ...prev,
      timeRange: { start, end },
      searchFilters: {
        ...prev.searchFilters,
        time_range: { start_time: start, end_time: end }
      }
    }));
  }, [options.onError]);

  /**
   * Reset date range to current view
   */
  const resetDateRange = useCallback(() => {
    const newDateRange = calculateDateRange(state.currentDate, state.viewType);
    setState(prev => ({
      ...prev,
      dateRange: newDateRange,
      searchFilters: {
        ...prev.searchFilters,
        date_range: {
          start_date: format(newDateRange.start, 'yyyy-MM-dd'),
          end_date: format(newDateRange.end, 'yyyy-MM-dd')
        }
      }
    }));
  }, [state.currentDate, state.viewType]);

  /**
   * Reset time range to full day
   */
  const resetTimeRange = useCallback(() => {
    setState(prev => ({
      ...prev,
      timeRange: { start: '00:00', end: '23:59' },
      searchFilters: {
        ...prev.searchFilters,
        time_range: { start_time: '00:00', end_time: '23:59' }
      }
    }));
  }, []);

  /**
   * Update search filters
   */
  const updateFilters = useCallback((filters: Partial<MapSearchFilters>) => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      searchFilters: { ...prev.searchFilters, ...filters }
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      searchFilters: {}
    }));
  }, []);

  /**
   * Reset filters to default state
   */
  const resetFilters = useCallback(() => {
    if (!isMountedRef.current) return;

    const defaultFilters: MapSearchFilters = {
      date_range: {
        start_date: format(state.dateRange.start, 'yyyy-MM-dd'),
        end_date: format(state.dateRange.end, 'yyyy-MM-dd')
      },
      time_range: {
        start_time: state.timeRange.start,
        end_time: state.timeRange.end
      }
    };

    setState(prev => ({
      ...prev,
      searchFilters: defaultFilters
    }));
  }, [state.dateRange, state.timeRange]);

  /**
   * Set map bounds
   */
  const setMapBounds = useCallback((bounds: MapBounds) => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, mapBounds: bounds }));
  }, []);

  /**
   * Clear map bounds
   */
  const clearMapBounds = useCallback(() => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, mapBounds: null }));
  }, []);

  /**
   * Fit map to bounds
   */
  const fitToBounds = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, [setMapBounds]);

  /**
   * Get current date range based on view type
   */
  const getCurrentDateRange = useCallback((): { start: Date; end: Date } => {
    return state.dateRange;
  }, [state.dateRange]);

  /**
   * Get formatted date string
   */
  const getFormattedDate = useCallback((date: Date): string => {
    return format(date, DATE_FMT);
  }, []);

  /**
   * Get formatted date range string
   */
  const getFormattedDateRange = useCallback((): string => {
    const { start, end } = state.dateRange;

    if (isSameDay(start, end)) {
      return getFormattedDate(start);
    }

    return `${getFormattedDate(start)} - ${getFormattedDate(end)}`;
  }, [state.dateRange, getFormattedDate]);

  /**
   * Check if date is in current range
   */
  const isDateInRange = useCallback((date: Date): boolean => {
    const { start, end } = state.dateRange;
    return date >= start && date <= end;
  }, [state.dateRange]);

  /**
   * Check if time is in current range
   */
  const isTimeInRange = useCallback((time: string): boolean => {
    const { start, end } = state.timeRange;
    return time >= start && time <= end;
  }, [state.timeRange]);

  /**
   * Reset all navigation state
   */
  const reset = useCallback(() => {
    if (!isMountedRef.current) return;

    const today = new Date();
    setState({
      currentDate: today,
      viewType: 'day',
      dateRange: { start: today, end: today },
      timeRange: { start: '00:00', end: '23:59' },
      searchFilters: {},
      mapBounds: null,
      isLoading: false,
      error: null,
    });

    navigationHistory.current = [];
  }, []);

  /**
   * Calculate date range based on current date and view type
   */
  const calculateDateRange = (date: Date, viewType: 'day' | 'week' | 'month'): { start: Date; end: Date } => {
    switch (viewType) {
      case 'day':
        return { start: date, end: date };

      case 'week':
        return {
          start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
          end: endOfWeek(date, { weekStartsOn: 1 })
        };

      case 'month':
        return {
          start: startOfMonth(date),
          end: endOfMonth(date)
        };

      default:
        return { start: date, end: date };
    }
  };

  return {
    // State
    state,

    // Date navigation
    goToDate,
    goToToday,
    goToPreviousDay,
    goToNextDay,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousMonth,
    goToNextMonth,

    // View management
    setViewType,
    toggleViewType,

    // Date range management
    setDateRange,
    setTimeRange,
    resetDateRange,
    resetTimeRange,

    // Filter management
    updateFilters,
    clearFilters,
    resetFilters,

    // Map bounds management
    setMapBounds,
    clearMapBounds,
    fitToBounds,

    // Utility functions
    getCurrentDateRange,
    getFormattedDate,
    getFormattedDateRange,
    isDateInRange,
    isTimeInRange,

    // Reset
    reset,
  };
}

/**
 * Hook for map navigation with default configuration
 */
export function useMapNavigationWithDefaults(): UseMapNavigationReturn {
  return useMapNavigation({
    initialDate: new Date(),
    initialView: 'day',
    enableDateRange: true,
    enableTimeRange: true,
    enableFilters: true,
    autoUpdateMarkers: true,
  });
}

/**
 * Hook for map navigation with custom date
 */
export function useMapNavigationWithDate(initialDate: Date): UseMapNavigationReturn {
  return useMapNavigation({
    initialDate,
    initialView: 'day',
    enableDateRange: true,
    enableTimeRange: true,
    enableFilters: true,
    autoUpdateMarkers: true,
  });
}

export default useMapNavigation;
