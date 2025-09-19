'use client';

import { DATE_FMT, getCurrentDubaiTime, TZ } from '@/utils/timezone';
import { addDays, addWeeks, endOfWeek, format, isToday, startOfWeek, subDays, subWeeks } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';

interface MapDateNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
  style?: React.CSSProperties;
  showWeekNavigation?: boolean;
  showMonthNavigation?: boolean;
  showTodayButton?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'minimal';
}

export function MapDateNavigation({
  selectedDate,
  onDateChange,
  className = '',
  style = {},
  showWeekNavigation = true,
  showMonthNavigation = true,
  showTodayButton = true,
  minDate,
  maxDate,
  disabled = false,
  size = 'medium',
  variant = 'default'
}: MapDateNavigationProps) {
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update current date when selectedDate prop changes
  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  // Size configuration with mobile optimization
  const getSizeConfig = useCallback((size: string, isMobileDevice: boolean) => {
    const baseConfigs = {
      small: {
        button: isMobileDevice ? 'px-3 py-2 text-sm min-h-[44px]' : 'px-2 py-1 text-xs',
        input: isMobileDevice ? 'px-3 py-2 text-sm min-h-[44px]' : 'px-2 py-1 text-xs',
        icon: isMobileDevice ? 'w-5 h-5' : 'w-4 h-4',
        spacing: isMobileDevice ? 'gap-2' : 'gap-1'
      },
      large: {
        button: isMobileDevice ? 'px-5 py-3 text-lg min-h-[48px]' : 'px-4 py-2 text-base',
        input: isMobileDevice ? 'px-5 py-3 text-lg min-h-[48px]' : 'px-4 py-2 text-base',
        icon: isMobileDevice ? 'w-7 h-7' : 'w-6 h-6',
        spacing: isMobileDevice ? 'gap-4' : 'gap-3'
      },
      medium: {
        button: isMobileDevice ? 'px-4 py-2.5 text-base min-h-[44px]' : 'px-3 py-1.5 text-sm',
        input: isMobileDevice ? 'px-4 py-2.5 text-base min-h-[44px]' : 'px-3 py-1.5 text-sm',
        icon: isMobileDevice ? 'w-6 h-6' : 'w-5 h-5',
        spacing: isMobileDevice ? 'gap-3' : 'gap-2'
      }
    };

    return baseConfigs[size as keyof typeof baseConfigs] || baseConfigs.medium;
  }, []);

  const sizeConfig = getSizeConfig(size, isMobile);

  // Check if date is within allowed range
  const isDateAllowed = useCallback((date: Date) => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  }, [minDate, maxDate]);

  // Navigate to previous day
  const goToPreviousDay = useCallback(() => {
    if (disabled) return;

    const newDate = subDays(currentDate, 1);
    if (isDateAllowed(newDate)) {
      setIsNavigating(true);
      setCurrentDate(newDate);
      onDateChange(newDate);

      // Reset navigation state after animation
      setTimeout(() => setIsNavigating(false), 200);
    }
  }, [currentDate, onDateChange, disabled, isDateAllowed]);

  // Navigate to next day
  const goToNextDay = useCallback(() => {
    if (disabled) return;

    const newDate = addDays(currentDate, 1);
    if (isDateAllowed(newDate)) {
      setIsNavigating(true);
      setCurrentDate(newDate);
      onDateChange(newDate);

      // Reset navigation state after animation
      setTimeout(() => setIsNavigating(false), 200);
    }
  }, [currentDate, onDateChange, disabled, isDateAllowed]);

  // Navigate to previous week
  const goToPreviousWeek = useCallback(() => {
    if (disabled || !showWeekNavigation) return;

    const newDate = subWeeks(currentDate, 1);
    if (isDateAllowed(newDate)) {
      setIsNavigating(true);
      setCurrentDate(newDate);
      onDateChange(newDate);

      setTimeout(() => setIsNavigating(false), 200);
    }
  }, [currentDate, onDateChange, disabled, showWeekNavigation, isDateAllowed]);

  // Navigate to next week
  const goToNextWeek = useCallback(() => {
    if (disabled || !showWeekNavigation) return;

    const newDate = addWeeks(currentDate, 1);
    if (isDateAllowed(newDate)) {
      setIsNavigating(true);
      setCurrentDate(newDate);
      onDateChange(newDate);

      setTimeout(() => setIsNavigating(false), 200);
    }
  }, [currentDate, onDateChange, disabled, showWeekNavigation, isDateAllowed]);

  // Go to today
  const goToToday = useCallback(() => {
    if (disabled || !showTodayButton) return;

    const today = getCurrentDubaiTime();
    if (isDateAllowed(today)) {
      setIsNavigating(true);
      setCurrentDate(today);
      onDateChange(today);

      setTimeout(() => setIsNavigating(false), 200);
    }
  }, [onDateChange, disabled, showTodayButton, isDateAllowed]);

  // Handle date input change
  const handleDateInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const inputDate = new Date(event.target.value);
    if (!isNaN(inputDate.getTime()) && isDateAllowed(inputDate)) {
      setIsNavigating(true);
      setCurrentDate(inputDate);
      onDateChange(inputDate);

      setTimeout(() => setIsNavigating(false), 200);
    }
  }, [onDateChange, disabled, isDateAllowed]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        goToPreviousDay();
        break;
      case 'ArrowRight':
        event.preventDefault();
        goToNextDay();
        break;
      case 'ArrowUp':
        event.preventDefault();
        goToPreviousWeek();
        break;
      case 'ArrowDown':
        event.preventDefault();
        goToNextWeek();
        break;
      case 'Home':
        event.preventDefault();
        goToToday();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Focus on date input for manual entry
        const dateInput = event.currentTarget.querySelector('input[type="date"]') as HTMLInputElement;
        if (dateInput) {
          dateInput.focus();
          dateInput.showPicker?.();
        }
        break;
    }
  }, [disabled, goToPreviousDay, goToNextDay, goToPreviousWeek, goToNextWeek, goToToday]);

  // Handle touch gestures for mobile swipe navigation
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!isMobile || disabled) return;

    const touch = event.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
  }, [isMobile, disabled]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!isMobile || disabled) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Only trigger if it's a horizontal swipe (not vertical scroll)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - go to previous day
        goToPreviousDay();
      } else {
        // Swipe left - go to next day
        goToNextDay();
      }

      // Provide haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  }, [isMobile, disabled, touchStartX, touchStartY, goToPreviousDay, goToNextDay]);

  // Format date for display
  const formatDisplayDate = useCallback((date: Date) => {
    return format(date, DATE_FMT, { timeZone: TZ });
  }, []);

  // Format date for input value
  const formatInputDate = useCallback((date: Date) => {
    return format(date, 'yyyy-MM-dd');
  }, []);

  // Check if previous/next buttons should be disabled
  const isPreviousDisabled = disabled || (minDate && currentDate <= minDate);
  const isNextDisabled = disabled || (maxDate && currentDate >= maxDate);
  const isPreviousWeekDisabled = disabled || !showWeekNavigation || (minDate && subWeeks(currentDate, 1) < minDate);
  const isNextWeekDisabled = disabled || !showWeekNavigation || (maxDate && addWeeks(currentDate, 1) > maxDate);

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div
        className={`
          flex items-center justify-between bg-[--card] rounded-lg border border-[--border] p-2
          ${isMobile ? 'touch-manipulation' : ''}
          ${className}
        `}
        style={{
          ...style,
          touchAction: isMobile ? 'manipulation' : 'auto',
          WebkitTapHighlightColor: isMobile ? 'transparent' : 'auto'
        }}
        onKeyDown={handleKeyDown}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        tabIndex={0}
        role="group"
        aria-label="Date navigation"
      >
        {/* Previous day button */}
        <button
          onClick={goToPreviousDay}
          disabled={isPreviousDisabled}
          className={`
            ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
            hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
          `}
          aria-label="Previous day"
        >
          <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Date display */}
        <div className="flex-1 text-center">
          <div className={`font-medium ${sizeConfig.input.replace('px-3 py-1.5', 'px-2 py-1')}`}>
            {formatDisplayDate(currentDate)}
          </div>
          {isToday(currentDate) && (
            <div className="text-xs text-[--primary] font-medium">Today</div>
          )}
        </div>

        {/* Next day button */}
        <button
          onClick={goToNextDay}
          disabled={isNextDisabled}
          className={`
            ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
            hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
          `}
          aria-label="Next day"
        >
          <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <div
        className={`
          flex items-center ${sizeConfig.spacing}
          ${className}
        `}
        style={style}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Date navigation"
      >
        <button
          onClick={goToPreviousDay}
          disabled={isPreviousDisabled}
          className={`
            ${sizeConfig.button} rounded-md hover:bg-[--accent] disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
          `}
          aria-label="Previous day"
        >
          <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className={`font-medium ${sizeConfig.input.replace('px-3 py-1.5', 'px-2 py-1')}`}>
          {formatDisplayDate(currentDate)}
        </div>

        <button
          onClick={goToNextDay}
          disabled={isNextDisabled}
          className={`
            ${sizeConfig.button} rounded-md hover:bg-[--accent] disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
          `}
          aria-label="Next day"
        >
          <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  // Render default variant
  return (
    <div
      className={`
        bg-[--card] rounded-lg border border-[--border] p-4 shadow-sm
        ${isNavigating ? 'opacity-75' : ''}
        ${className}
      `}
      style={style}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      aria-label="Date navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[--foreground]">Select Date</h3>
        {showTodayButton && (
          <button
            onClick={goToToday}
            disabled={disabled || !isDateAllowed(getCurrentDubaiTime())}
            className={`
              ${sizeConfig.button} rounded-md border border-[--primary] bg-[--primary] text-[--primary-foreground]
              hover:bg-[--primary]/90 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
            `}
            aria-label="Go to today"
          >
            Today
          </button>
        )}
      </div>

      {/* Date input */}
      <div className="mb-4">
        <label htmlFor="date-input" className="block text-sm font-medium text-[--foreground] mb-2">
          Select Date
        </label>
        <input
          id="date-input"
          type="date"
          value={formatInputDate(currentDate)}
          onChange={handleDateInputChange}
          disabled={disabled}
          min={minDate ? formatInputDate(minDate) : undefined}
          max={maxDate ? formatInputDate(maxDate) : undefined}
          className={`
            ${sizeConfig.input} w-full rounded-md border border-[--border] bg-[--background] text-[--foreground]
            focus:outline-none focus:ring-2 focus:ring-[--primary] focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label="Select date"
        />
      </div>

      {/* Navigation controls */}
      <div className="space-y-3">
        {/* Day navigation */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[--foreground]">Day Navigation</span>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousDay}
              disabled={isPreviousDisabled}
              className={`
                ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
                hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
              `}
              aria-label="Previous day"
            >
              <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className={`px-3 py-1 text-center min-w-[120px] ${sizeConfig.input}`}>
              <div className="font-medium">{formatDisplayDate(currentDate)}</div>
              {isToday(currentDate) && (
                <div className="text-xs text-[--primary] font-medium">Today</div>
              )}
            </div>

            <button
              onClick={goToNextDay}
              disabled={isNextDisabled}
              className={`
                ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
                hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
              `}
              aria-label="Next day"
            >
              <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Week navigation */}
        {showWeekNavigation && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[--foreground]">Week Navigation</span>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                disabled={isPreviousWeekDisabled}
                className={`
                  ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
                  hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
                `}
                aria-label="Previous week"
              >
                <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <div className={`px-3 py-1 text-center min-w-[120px] ${sizeConfig.input}`}>
                <div className="font-medium">
                  {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM')} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
                </div>
                <div className="text-xs text-[--muted-foreground]">Week</div>
              </div>

              <button
                onClick={goToNextWeek}
                disabled={isNextWeekDisabled}
                className={`
                  ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
                  hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
                `}
                aria-label="Next week"
              >
                <svg className={sizeConfig.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick date buttons */}
      <div className="mt-4 pt-4 border-t border-[--border]">
        <div className="flex flex-wrap gap-2">
          {showTodayButton && (
            <button
              onClick={() => onDateChange(getCurrentDubaiTime())}
              disabled={disabled || !isDateAllowed(getCurrentDubaiTime())}
              className={`
                ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
                hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
              `}
              aria-label="Go to today"
            >
              Today
            </button>
          )}
          <button
            onClick={() => onDateChange(addDays(getCurrentDubaiTime(), 1))}
            disabled={disabled || !isDateAllowed(addDays(getCurrentDubaiTime(), 1))}
            className={`
              ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
              hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
            `}
            aria-label="Go to tomorrow"
          >
            Tomorrow
          </button>
          <button
            onClick={() => onDateChange(subDays(getCurrentDubaiTime(), 1))}
            disabled={disabled || !isDateAllowed(subDays(getCurrentDubaiTime(), 1))}
            className={`
              ${sizeConfig.button} rounded-md border border-[--border] bg-[--background]
              hover:bg-[--accent] hover:text-[--accent-foreground] disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[--primary] focus:ring-offset-2
            `}
            aria-label="Go to yesterday"
          >
            Yesterday
          </button>
        </div>
      </div>
    </div>
  );
}

export default MapDateNavigation;
