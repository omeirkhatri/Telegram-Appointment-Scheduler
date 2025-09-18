'use client';

import { Calendar, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CalendarDatePickerProps {
  currentDate: Date;
  currentView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  onDateChange: (date: Date) => void;
  className?: string;
}

export function CalendarDatePicker({
  currentDate,
  currentView,
  onDateChange,
  className = ''
}: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected date when currentDate changes
  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateChange(date);
    setIsOpen(false);
  };

  const goToToday = () => {
    const today = new Date();
    handleDateSelect(today);
  };

  const getButtonText = () => {
    if (currentView === 'dayGridMonth') {
      return selectedDate.toLocaleDateString('en', {
        month: 'long',
        year: 'numeric'
      });
    } else {
      return selectedDate.toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDaysInPreviousMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 0).getDate();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const renderCalendar = () => {
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const daysInPrevMonth = getDaysInPreviousMonth(selectedDate);

    const days = [];

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
      days.push(
        <button
          key={`prev-${i}`}
          className="w-8 h-8 text-gray-400 hover:bg-gray-100 rounded text-sm"
          onClick={() => handleDateSelect(day)}
        >
          {daysInPrevMonth - i}
        </button>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isCurrentDay = isToday(date);
      const isSelectedDay = isSelected(date);

      days.push(
        <button
          key={day}
          className={`w-8 h-8 text-sm rounded transition-colors ${
            isSelectedDay
              ? 'bg-blue-600 text-white'
              : isCurrentDay
              ? 'bg-blue-100 text-blue-600 font-semibold'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => handleDateSelect(date)}
        >
          {day}
        </button>
      );
    }

    // Next month's leading days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push(
        <button
          key={`next-${day}`}
          className="w-8 h-8 text-gray-400 hover:bg-gray-100 rounded text-sm"
          onClick={() => handleDateSelect(date)}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="p-4">
        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedDate(newDate);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <div className="text-lg font-semibold">
            {selectedDate.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedDate(newDate);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="w-8 h-8 text-xs font-medium text-gray-500 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        {/* Action buttons */}
        <div className="flex justify-between mt-4 pt-3 border-t border-[--border]">
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-1 text-sm text-[--muted-foreground] hover:text-[--foreground]"
          >
            Cancel
          </button>
          <div className="flex space-x-2">
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-[--muted-foreground] hover:text-[--foreground]"
            >
              Today
            </button>
            <button
              onClick={() => handleDateSelect(selectedDate)}
              className="px-3 py-1 text-sm text-[--primary] hover:text-[--primary]/80"
            >
              Go
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-[--foreground] bg-[--card] border border-[--border] rounded-lg hover:bg-[--accent] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>{getButtonText()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[--card] border border-[--border] rounded-lg shadow-lg z-50 min-w-[280px]">
          {renderCalendar()}
        </div>
      )}
    </div>
  );
}
