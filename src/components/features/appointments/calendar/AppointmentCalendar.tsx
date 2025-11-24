'use client';

import { useAppointmentsForMapDateRange } from '@/hooks/useAppointmentsForMap';
import { useMapNavigation } from '@/hooks/useMapNavigation';
import { buildTimezoneArtifacts, getCurrentLocalTime } from '@/lib/timezoneArtifacts';
import type { Appointment } from '@/types';
import { getAppointmentTypeDisplayName } from '@/types/appointment';
import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import type { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { isSameMonth } from 'date-fns';
import { CalendarRange, Clock, Filter, Grid3X3, List, Map, Plus, Table } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppointmentMapView } from './AppointmentMapView';



// Helper function to get service type abbreviation (first 3 letters)
function getServiceAbbreviation(appointmentType: string): string {
  const abbreviations: Record<string, string> = {
    doctor_on_call: 'DOC',
    lab_test: 'LAB',
    teleconsultation: 'TC',
    physiotherapy: 'PHY',
    caregiver: 'CG',
    iv_therapy: 'IV',
  };
  return abbreviations[appointmentType] || appointmentType.substring(0, 3).toUpperCase();
}

// Component to display staff information for calendar events
function AppointmentStaffInfo({ appointment }: { appointment: Appointment }) {
  // Use pre-processed staff data from appointment object instead of making API calls
  const serviceAbbr = getServiceAbbreviation(appointment.appointment_type);

  // Get staff information from the appointment object (already processed by appointmentService)
  const primaryStaffName = appointment.staff_name || 'NAN';
  const allStaffNames = appointment.all_staff_names || 'NAN';

  // Extract driver from appointment_staff data if available
  const driver = appointment.appointment_staff?.find(staff => staff.role === 'driver');
  const driverName = driver ? `${driver.staff?.first_name} ${driver.staff?.last_name}` : undefined;

  // Also check for driver_id field in appointment data
  const hasDriverId = appointment.driver_id && !driverName;

  // Build staff text based on available data
  let staffText = '';

  if (primaryStaffName && primaryStaffName !== 'Staff not assigned' && primaryStaffName !== 'NAN') {
    if (driverName) {
      staffText = `${serviceAbbr}, ${primaryStaffName}, ${driverName}`;
    } else if (hasDriverId) {
      staffText = `${serviceAbbr}, ${primaryStaffName}, Driver`;
    } else {
      staffText = `${serviceAbbr}, ${primaryStaffName}, Self`;
    }
  } else if (driverName) {
    staffText = `${serviceAbbr}, NAN, ${driverName}`;
  } else if (hasDriverId) {
    staffText = `${serviceAbbr}, NAN, Driver`;
  } else {
    staffText = `${serviceAbbr}, NAN, Self`;
  }

  return (
    <div className="text-white truncate text-xs">
      {staffText}
    </div>
  );
}

type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek' | 'listDay' | 'map';

interface AppointmentCalendarProps {
  initialView?: CalendarViewType;
  height?: string | number;
  appointments?: Appointment[];
  isLoading?: boolean;
  error?: string | null;
  refetch?: () => void;
  onEventClick?: (appointment: Appointment) => void;
  onEventRightClick?: (appointment: Appointment, event: React.MouseEvent) => void;
  onDateSelect?: (start: Date, end: Date) => void;
  onEventDrop?: (appointmentId: string, newStart: Date, newEnd: Date) => Promise<void>;
  onEventResize?: (appointmentId: string, newStart: Date, newEnd: Date) => Promise<void>;
  filters?: {
    staffId?: string;
    appointmentType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  onToggleFilters?: () => void;
  filtersActiveCount?: number;
  isFilterPanelOpen?: boolean;
  onCreateAppointment?: () => void;
  filterSummaries?: string[];
  onClearFilters?: () => void;
  onSwitchToTable?: () => void;
}

export function AppointmentCalendar({
  initialView = 'timeGridWeek',
  height = 'auto',
  appointments = [],
  isLoading = false,
  error = null,
  refetch,
  onEventClick,
  onEventRightClick,
  onDateSelect,
  onEventDrop,
  onEventResize,
  filters = {},
  onToggleFilters,
  filtersActiveCount = 0,
  isFilterPanelOpen = false,
  onCreateAppointment,
  filterSummaries,
  onClearFilters,
  onSwitchToTable,
}: AppointmentCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<CalendarViewType>(initialView);
  const timezoneArtifacts = buildTimezoneArtifacts();
  const [currentDate, setCurrentDate] = useState(() => getCurrentLocalTime(timezoneArtifacts));
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => getCurrentLocalTime(timezoneArtifacts));
  const datePickerRef = useRef<HTMLDivElement>(null);
  const todayLocal = getCurrentLocalTime(timezoneArtifacts);
  const isCurrentDateToday = currentDate.toDateString() === todayLocal.toDateString();

  const todayHighlightClass = isCurrentDateToday
    ? 'bg-[#ff5c00] text-white rounded-md'
    : '';
  const todayHighlightPadding = isCurrentDateToday ? 'px-3 py-1.5' : '';

  // Close date picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

  // Track viewport width for responsive adjustments
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateLayout = () => {
      setIsCompactLayout(window.innerWidth < 640);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const handleMapDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleMapViewChange = useCallback((_view: 'day' | 'week' | 'month') => {
    // Map view manages its own layout; no calendar view sync needed here for now
  }, []);

  // Map navigation hook for map view
  const mapNavigation = useMapNavigation({
    initialDate: currentDate,
    initialView: 'day',
    enableDateRange: true,
    enableTimeRange: true,
    enableFilters: true,
    autoUpdateMarkers: true,
    onDateChange: handleMapDateChange,
    onViewChange: handleMapViewChange
  });

  // Map-specific data fetching for expanded recurring appointments
  const {
    appointments: mapAppointments,
    isLoading: isMapLoading,
    error: mapError,
    refetch: refetchMap
  } = useAppointmentsForMapDateRange(
    currentDate,
    currentDate,
    {
      appointmentType: filters.appointmentType,
      status: filters.status,
      // transportationType: filters.transportation_type,
    }
  );

  // Update currentView when initialView changes
  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  // Force calendar refresh when appointments change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const calendar = calendarRef.current;
      if (calendar) {
        try {
          calendar.render();
        } catch (error) {
          console.error('Error refreshing calendar:', error);
        }
      }
    }
  }, [appointments]);

  // Apply custom styles to now indicator based on view
  useEffect(() => {
    const applyNowIndicatorStyles = () => {
      // Remove any existing styles first
      const existingStyle = document.getElementById('calendar-now-indicator-styles');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'calendar-now-indicator-styles';

      // Determine thickness based on current view
      const thickness = currentView === 'timeGridDay' ? '3px' : '2px';

      style.textContent = `
        .fc-now-indicator {
          border-color: #ef4444 !important;
          border-width: ${thickness} !important;
          z-index: 10 !important;
        }
        .fc-now-indicator-line {
          border-color: #ef4444 !important;
          border-width: ${thickness} !important;
          height: ${thickness} !important;
        }
        .fc-now-indicator-arrow {
          display: block !important;
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background-color: #ef4444 !important;
          border: none !important;
          position: absolute !important;
          left: -4px !important;
          top: -3px !important;
          z-index: 11 !important;
        }
        .fc-now-indicator-arrow::before {
          display: none !important;
        }
        .fc-now-indicator-arrow::after {
          display: none !important;
        }
      `;

      document.head.appendChild(style);

      // Function to directly style the now indicator elements
      const styleNowIndicator = () => {
        const nowIndicator = document.querySelector('.fc-now-indicator');
        const nowIndicatorLine = document.querySelector('.fc-now-indicator-line');
        const nowIndicatorArrow = document.querySelector('.fc-now-indicator-arrow');

        if (nowIndicator) {
          (nowIndicator as HTMLElement).style.setProperty('border-color', '#ef4444', 'important');
          (nowIndicator as HTMLElement).style.setProperty('border-width', thickness, 'important');
          (nowIndicator as HTMLElement).style.setProperty('z-index', '10', 'important');
        }

        if (nowIndicatorLine) {
          (nowIndicatorLine as HTMLElement).style.setProperty('border-color', '#ef4444', 'important');
          (nowIndicatorLine as HTMLElement).style.setProperty('border-width', thickness, 'important');
          (nowIndicatorLine as HTMLElement).style.setProperty('height', thickness, 'important');
        }

        if (nowIndicatorArrow) {
          (nowIndicatorArrow as HTMLElement).style.setProperty('display', 'block', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('width', '8px', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('height', '8px', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('border-radius', '50%', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('background-color', '#ef4444', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('border', 'none', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('position', 'absolute', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('left', '-4px', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('top', '-3px', 'important');
          (nowIndicatorArrow as HTMLElement).style.setProperty('z-index', '11', 'important');
        }
      };

      // Apply styles immediately
      styleNowIndicator();

      // Set up observer to watch for now indicator changes
      const observer = new MutationObserver(() => {
        styleNowIndicator();
      });

      // Observe the calendar container for changes
      const calendarContainer = document.querySelector('.calendar-container');
      if (calendarContainer) {
        observer.observe(calendarContainer, {
          childList: true,
          subtree: true,
          attributes: true
        });
      }

      // Also apply styles periodically to ensure they stick
      const interval = setInterval(styleNowIndicator, 1000);

      return () => {
        observer.disconnect();
        clearInterval(interval);
        const styleElement = document.getElementById('calendar-now-indicator-styles');
        if (styleElement) {
          styleElement.remove();
        }
      };
    };

    const cleanup = applyNowIndicatorStyles();
    return cleanup;
  }, [currentView]);


  // Ensure calendar is properly initialized
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const calendar = calendarRef.current;
      if (calendar) {
        try {
          // Force the calendar to use the current date on mount
          const api = calendar.getApi();
          const now = getCurrentLocalTime(timezoneArtifacts);

          // Always force to current Dubai time on initialization
          api.gotoDate(now);
          setCurrentDate(now);

        } catch (error) {
          console.error('Error initializing calendar:', error);
        }
      }
    }
  }, []);

  // Filter appointments by current date for day and map views
  const getAppointmentsForCurrentDate = useCallback(() => {
    // For week and month views, show all appointments
    if (currentView !== 'map' && currentView !== 'timeGridDay') return appointments;
    // For day and map views, filter by current date
    const currentDateString = currentDate.toISOString().split('T')[0];
    return appointments.filter(appointment => appointment.appointment_date === currentDateString);
  }, [appointments, currentDate, currentView]);

  const filteredAppointments = getAppointmentsForCurrentDate();

  // Convert appointments to calendar events
  const events = filteredAppointments.map((appointment) => {
    // Convert start_time from HH:MM:SS to HH:MM format for proper date parsing
    const timeOnly = appointment.start_time.includes(':')
      ? appointment.start_time.split(':').slice(0, 2).join(':')
      : appointment.start_time;

    // The appointment_date and start_time are stored in UTC timezone
    // FullCalendar with timeZone="Asia/Dubai" expects UTC times, so we need to add 4 hours
    // to convert UTC to Dubai time for display (currently +2, need 0, so subtract 2)
    // ⚠️  DO NOT CHANGE THIS - EXISTING APPOINTMENTS ARE WORKING CORRECTLY NOW ⚠️
    const utcDateTime = new Date(`${appointment.appointment_date}T${timeOnly}:00`);
    // Add 4 hours to show correct time (was +6, now +4 to fix +2 offset)
    const startDateTime = new Date(utcDateTime.getTime() + (4 * 60 * 60 * 1000));
    const endDateTime = new Date(startDateTime.getTime() + appointment.duration_minutes * 60000);

    // Debug logging for event creation (commented out to reduce console noise)
    // console.log('Event created:', {
    //   appointment_date: appointment.appointment_date,
    //   start_time: appointment.start_time,
    //   startDateTime: startDateTime,
    //   endDateTime: endDateTime,
    //   startDateTimeUTC: startDateTime.toISOString(),
    //   startDateTimeLocal: startDateTime.toLocaleString(),
    //   currentLocalTime: getCurrentLocalTime(timezoneArtifacts),
    //   timezone: timezoneArtifacts.resolution.timezone,
    //   timezoneSource: timezoneArtifacts.resolution.source
    // });

    // Create title with patient name and appointment type
    const patientName = appointment.patient?.name || 'Unknown Patient';
    const appointmentType = getAppointmentTypeDisplayName(appointment.appointment_type);

    // Add recurring indicator to title
    const isRecurring = appointment.recurring_rule ||
                       (appointment.custom_fields as any)?.is_recurring_generated ||
                       (appointment.custom_fields as any)?.is_recurring_occurrence;

    const recurringIndicator = isRecurring ? ' 🔄' : '';
    const title = `${patientName} - ${appointmentType}${recurringIndicator}`;

    // Use different color for recurring appointments
    let color = getAppointmentTypeColor(appointment.appointment_type, 'primary');
    if (isRecurring) {
      // Make recurring appointments slightly more transparent and add a pattern
      color = getAppointmentTypeColor(appointment.appointment_type, 'light');
    }

    return {
      id: appointment.id,
      title,
      start: startDateTime,
      end: endDateTime,
      allDay: false,
      color,
      appointment: appointment,
      // Add metadata for recurring appointments
      extendedProps: {
        appointment,
        appointment_type: appointment.appointment_type,
        isRecurring,
        isGenerated: (appointment.custom_fields as any)?.is_recurring_generated || false,
        isOccurrence: (appointment.custom_fields as any)?.is_recurring_occurrence || false,
        baseAppointmentId: (appointment.custom_fields as any)?.base_appointment_id,
        occurrenceNumber: (appointment.custom_fields as any)?.occurrence_number,
      },
    };
  });


  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    if (onDateSelect) {
      onDateSelect(selectInfo.start, selectInfo.end);
    }
  }, [onDateSelect]);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const appointment = event.extendedProps?.appointment as Appointment;
    if (onEventClick && appointment) {
      onEventClick(appointment);
    }
  }, [onEventClick]);

  const handleEventRightClick = useCallback((clickInfo: EventClickArg, nativeEvent: MouseEvent) => {
    const event = clickInfo.event;
    const appointment = event.extendedProps?.appointment as Appointment;
    if (onEventRightClick && appointment) {
      const reactEvent = {
        ...nativeEvent,
        clientX: nativeEvent.clientX,
        clientY: nativeEvent.clientY,
        preventDefault: () => nativeEvent.preventDefault(),
        stopPropagation: () => nativeEvent.stopPropagation(),
      } as unknown as React.MouseEvent;
      onEventRightClick(appointment, reactEvent);
    }
  }, [onEventRightClick]);

  const handleEventDrop = useCallback(async (dropInfo: EventDropArg) => {
    const event = dropInfo.event;
    const appointmentId = event.id;
    const rawStart = event.start;

    if (!rawStart) {
      console.warn('Event drop missing start time', { appointmentId });
      dropInfo.revert();
      return;
    }

    const adjustByHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);

    // Calendar emits times 4h ahead of actual slot; offset back before persisting
    const adjustedStart = adjustByHours(rawStart, -4);
    const adjustedEnd = event.end
      ? adjustByHours(event.end, -4)
      : new Date(adjustedStart.getTime() + 60 * 60 * 1000);

    try {
      if (onEventDrop) {
        await onEventDrop(appointmentId, adjustedStart, adjustedEnd);
      }
    } catch (error) {
      console.error('Failed to update appointment:', error);
      dropInfo.revert();
    }
  }, [onEventDrop]);

  const handleEventResize = useCallback(async (resizeInfo: any) => {
    const event = resizeInfo.event;
    const appointmentId = event.id;
    const rawStart = event.start;
    const rawEnd = event.end;

    if (!rawStart || !rawEnd) {
      console.warn('Event resize missing boundaries', { appointmentId });
      resizeInfo.revert();
      return;
    }

    const adjustByHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);

    const adjustedStart = adjustByHours(rawStart, -4);
    const adjustedEnd = adjustByHours(rawEnd, -4);

    try {
      if (onEventResize) {
        await onEventResize(appointmentId, adjustedStart, adjustedEnd);
      }
    } catch (error) {
      console.error('Failed to resize appointment:', error);
      resizeInfo.revert();
    }
  }, [onEventResize]);

  // Simple date change function
  const changeDate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
    const calendar = calendarRef.current;
    if (calendar) {
      const api = calendar.getApi();
      api.gotoDate(newDate);
      // Force a complete re-render
      setTimeout(() => {
        calendar.render();
      }, 100);
    }
  }, []);

  // Simple view change function
  const changeView = useCallback((newView: CalendarViewType) => {
    setCurrentView(newView);
    const calendar = calendarRef.current;
    if (calendar && newView !== 'map') {
      const api = calendar.getApi();
      const fullCalendarView = newView === 'dayGridMonth' ? 'dayGridMonth' :
                              newView === 'timeGridWeek' ? 'timeGridWeek' :
                              newView === 'timeGridDay' ? 'timeGridDay' :
                              newView === 'listWeek' ? 'listWeek' : 'listDay';
      api.changeView(fullCalendarView);
    }
  }, []);

  // Simple navigation functions
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    if (currentView !== 'dayGridMonth') return;
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    changeDate(newDate);
  }, [currentView, currentDate, changeDate]);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    if (currentView !== 'timeGridWeek') return;
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    changeDate(newDate);
  }, [currentView, currentDate, changeDate]);

  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    changeDate(newDate);
  }, [currentDate, changeDate]);

  const calendarViews = useMemo(() => ({
    dayGridMonth: {
      dayHeaderFormat: { weekday: 'long' } // Always use full day names
    },
    timeGridWeek: {
      dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' } // Always use full day names
    },
    timeGridDay: {
      dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' } // Always use full day names
    },
    listWeek: {
      dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' }, // Always use full day names
      listDayFormat: { weekday: 'long', month: 'short', day: 'numeric' }
    },
    listDay: {
      dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' }, // Always use full day names
      listDayFormat: { weekday: 'long', month: 'short', day: 'numeric' }
    }
  }), []);

  const getCompactWeekdayLabel = (date: Date) => {
    const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const day = date.getDay();
    const index = (day + 6) % 7; // shift so Monday is first
    return labels[index] || labels[0];
  };

  const getResponsiveWeekdayLabel = (date: Date) => {
    const fullLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const shortLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const day = date.getDay();
    const index = (day + 6) % 7; // shift so Monday is first

    return {
      full: fullLabels[index] || fullLabels[0],
      short: shortLabels[index] || shortLabels[0]
    };
  };

  const iconButtonClass = (isActive: boolean) =>
    `p-2 rounded-md transition-colors ${
      isActive
        ? 'bg-[--primary] text-[--primary-foreground]'
        : 'text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent]'
    }`;

  const shouldEnableHorizontalScroll = isCompactLayout && currentView === 'timeGridWeek';

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load calendar</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="calendar-container" className="bg-[--card] rounded-lg shadow-sm border border-[--border] calendar-container">
      {/* Custom Header Toolbar */}
      <div className="flex flex-col gap-4 p-4 border-b border-[--border]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
          {/* Date Navigation Buttons */}
          <button
            onClick={() => {
              if (currentView === 'dayGridMonth') {
                navigateMonth('prev');
              } else if (currentView === 'timeGridWeek') {
                navigateWeek('prev');
              } else {
                navigateDay('prev');
              }
            }}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
            title={currentView === 'dayGridMonth' ? "Previous month" : currentView === 'timeGridWeek' ? "Previous week" : "Previous day"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => {
              const today = getCurrentLocalTime(timezoneArtifacts);
              changeDate(today);
            }}
            className="px-3 py-2 text-sm font-medium text-[--foreground] bg-[--accent] rounded-lg hover:bg-[--accent]/80 transition-colors"
            title="Go to today"
          >
            Today
          </button>
          <button
            onClick={() => {
              if (currentView === 'dayGridMonth') {
                navigateMonth('next');
              } else if (currentView === 'timeGridWeek') {
                navigateWeek('next');
              } else {
                navigateDay('next');
              }
            }}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
            title={currentView === 'dayGridMonth' ? "Next month" : currentView === 'timeGridWeek' ? "Next week" : "Next day"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => {
                setPickerDate(currentDate);
                setShowDatePicker(!showDatePicker);
              }}
              className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
              title="Select date"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4 w-[280px]">
                {/* Header with month navigation */}
                <div className="grid grid-cols-[2rem,1fr,2rem,2rem] items-center mb-4 gap-2">
                  <button
                    onClick={() => {
                      const newDate = new Date(pickerDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setPickerDate(newDate);
                    }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
                    aria-label="Previous month"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 text-center">
                    {pickerDate.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => {
                      const newDate = new Date(pickerDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setPickerDate(newDate);
                    }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
                    aria-label="Next month"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                    <div key={`day-${index}`} className="w-8 h-6 text-xs font-medium text-gray-500 flex items-center justify-center">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = pickerDate.getFullYear();
                    const month = pickerDate.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const startDate = new Date(firstDay);
                    startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));

                    const days = [];
                    for (let i = 0; i < 42; i++) {
                      const date = new Date(startDate);
                      date.setDate(startDate.getDate() + i);
                      const isCurrentMonth = date.getMonth() === month;
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = date.toDateString() === currentDate.toDateString();

                      days.push(
                        <button
                          key={i}
                          onClick={() => {
                            changeDate(date);
                            setShowDatePicker(false);
                          }}
                          className={`w-8 h-8 text-sm rounded transition-all duration-200 font-medium ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : isToday
                              ? 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold'
                              : isCurrentMonth
                              ? 'text-gray-900 hover:bg-gray-100'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    }
                    return days;
                  })()}
                </div>

                {/* Footer buttons */}
                <div className="flex justify-between mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const today = getCurrentLocalTime(timezoneArtifacts);
                      setPickerDate(today);
                      changeDate(today);
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>

          <div className="flex items-center justify-center flex-1 min-w-0">
          {/* Month display for month view - centered */}
          {currentView === 'dayGridMonth' && (
            <div className="text-lg font-semibold text-[--foreground]">
              {currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: timezoneArtifacts.resolution.timezone })}
            </div>
          )}
          {/* Week display for week view - centered */}
          {currentView === 'timeGridWeek' && (
            <div className="text-lg font-semibold text-[--foreground]">
              {(() => {
                const startOfWeek = new Date(currentDate);
                const day = startOfWeek.getDay();
                const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
                startOfWeek.setDate(diff);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                const startMonth = startOfWeek.toLocaleDateString('en', { month: 'short', timeZone: timezoneArtifacts.resolution.timezone });
                const endMonth = endOfWeek.toLocaleDateString('en', { month: 'short', timeZone: timezoneArtifacts.resolution.timezone });
                const year = startOfWeek.getFullYear();

                if (startMonth === endMonth) {
                  return `${startMonth} ${year}`;
                } else {
                  return `${startMonth} - ${endMonth} ${year}`;
                }
              })()}
            </div>
          )}
          {/* Day display for day view - centered */}
          {currentView === 'timeGridDay' && (
            <div className="flex items-center space-x-4">
              <div className="text-lg font-semibold text-[--foreground]">
                {currentDate.toLocaleDateString('en', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'Asia/Dubai'
                })}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isCurrentDateToday
                  ? 'bg-[#ff5c00] text-white'
                  : 'bg-[--accent] text-[--accent-foreground]'
              }`}>
                {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          {/* Map view display - centered */}
          {currentView === 'map' && (
            <div className="flex items-center space-x-4">
              <div className="text-lg font-semibold text-[--foreground]">
                {currentDate.toLocaleDateString('en', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'Asia/Dubai'
                })}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isCurrentDateToday
                  ? 'bg-[#ff5c00] text-white'
                  : 'bg-[--accent] text-[--accent-foreground]'
              }`}>
                {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-[--border] bg-[--card]/90 text-[11px] font-medium shadow-sm">
              <button onClick={() => changeView('dayGridMonth')} className={iconButtonClass(currentView === 'dayGridMonth')} title="Month View">
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => changeView('timeGridWeek')} className={iconButtonClass(currentView === 'timeGridWeek')} title="Week View">
                <CalendarRange className="w-4 h-4" />
              </button>
              <button onClick={() => changeView('timeGridDay')} className={iconButtonClass(currentView === 'timeGridDay')} title="Day View">
                <Clock className="w-4 h-4" />
              </button>
              <button onClick={() => changeView('listDay')} className={iconButtonClass(currentView === 'listDay' || currentView === 'listWeek')} title="List View">
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => changeView('map')} className={iconButtonClass(currentView === 'map')} title="Map View">
                <Map className="w-4 h-4" />
              </button>
            </div>

            {onSwitchToTable && (
              <button
                onClick={onSwitchToTable}
                className="inline-flex items-center gap-2 rounded-full border border-[--border] px-3 py-1 text-sm font-medium text-[--muted-foreground] transition-colors hover:bg-[--accent] hover:text-[--foreground]"
                title="Open table view"
              >
                <Table className="h-4 w-4" />
                <span className="hidden sm:inline">Table View</span>
              </button>
            )}

            {onToggleFilters && (
              <button
                onClick={onToggleFilters}
                className={`inline-flex items-center gap-2 rounded-full border border-[--border] px-3 py-1 text-sm font-medium transition-colors ${
                  isFilterPanelOpen
                    ? 'bg-[--primary] text-[--primary-foreground]'
                    : 'bg-[--card]/90 text-[--muted-foreground] hover:text-[--foreground]'
                }`}
                title={isFilterPanelOpen ? 'Hide filters' : 'Show filters'}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {filtersActiveCount > 0 && (
                  <span className={`inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full text-[10px] font-semibold ${
                    isFilterPanelOpen ? 'bg-white/20 text-[--primary-foreground]' : 'bg-[--primary] text-[--primary-foreground]'
                  }`}>
                    {filtersActiveCount}
                  </span>
                )}
              </button>
            )}

            {onCreateAppointment && (
              <button
                onClick={onCreateAppointment}
                className="inline-flex items-center gap-2 rounded-full bg-[--primary] px-3 py-1.5 text-sm font-medium text-[--primary-foreground] shadow-sm transition-transform hover:scale-[1.02]"
                title="New appointment"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Appointment</span>
              </button>
            )}
          </div>
        </div>

        {filterSummaries && filterSummaries.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-[--foreground]">
            {filterSummaries.map(summary => (
              <span
                key={summary}
                className="inline-flex items-center gap-2 rounded-full border border-[--border]/70 bg-[--card]/90 px-3 py-1 shadow-sm"
              >
                {summary}
              </span>
            ))}
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="rounded-full border border-[--border]/70 px-3 py-1 text-[10px] font-semibold text-[--muted-foreground] transition-colors hover:bg-[--accent] hover:text-[--foreground]"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom day header for List view - always show */}
      {currentView === 'listDay' && (
        <div
          className={`border px-4 py-2 text-sm font-medium ${
            isCurrentDateToday
              ? 'bg-[#ff5c00] text-white border-[#ff5c00] rounded-md shadow-sm'
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          {currentDate.toLocaleDateString('en', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Dubai'
          })}
        </div>
      )}

      {/* Map View */}
      {currentView === 'map' ? (
        <div className="w-full h-full">

          {/* Debug: Log appointments being passed to map (commented out to reduce console noise) */}
          {/* {console.log('Appointments being passed to AppointmentMapView (with expanded recurring):', mapAppointments.map(apt => ({
            id: apt.id,
            patient_name: apt.patient?.name,
            appointment_date: apt.appointment_date,
            start_time: apt.start_time,
            has_patient: !!apt.patient,
            has_coordinates: !!(apt.patient?.latitude && apt.patient?.longitude),
            coordinates: apt.patient?.latitude ? `${apt.patient.latitude}, ${apt.patient.longitude}` : 'None',
            is_recurring_generated: apt.custom_fields?.is_recurring_generated || false,
            base_appointment_id: apt.custom_fields?.base_appointment_id || 'N/A'
          })))} */}

          <AppointmentMapView
            appointments={mapAppointments}
            isLoading={isMapLoading}
            error={mapError}
            refetch={refetchMap}
            onAppointmentClick={onEventClick}
            onAppointmentRightClick={onEventRightClick}
            height="calc(100vh - 140px)"
            searchFilters={{
              appointment_types: filters.appointmentType ? [filters.appointmentType as any] : undefined,
              statuses: filters.status ? [filters.status as any] : undefined,
              date_range: filters.dateFrom || filters.dateTo ? {
                start_date: filters.dateFrom || new Date().toISOString().split('T')[0],
                end_date: filters.dateTo || new Date().toISOString().split('T')[0]
              } : undefined,
              // transportation_type: filters.transportation_type ? [filters.transportation_type] : undefined,
              ...mapNavigation.state.searchFilters
            }}
            showClusters={true}
            enableClustering={true}
            className="rounded-lg"
          />
        </div>
      ) : (
        <div className={shouldEnableHorizontalScroll ? 'calendar-week-scroll overflow-x-auto lg:overflow-visible' : 'overflow-x-visible'}>
          <div className={shouldEnableHorizontalScroll ? 'min-w-[720px]' : ''}>
            <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={initialView}
        initialDate={currentDate}
        height={height}
        headerToolbar={false}
        timeZone={timezoneArtifacts.resolution.timezone}
        timeZoneParam={timezoneArtifacts.resolution.timezone}
        firstDay={1} // Start week on Monday (0=Sunday, 1=Monday)
        // Force timezone handling
        nowIndicator={true}
        buttonText={{
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          list: 'List',
          listDay: 'List',
        }}
        // Time and date settings
        slotDuration="00:15:00" // 15-minute slots
        slotLabelInterval="01:00:00" // Show hour labels
        slotMinTime="00:00:00" // Start at midnight (full day)
        slotMaxTime="24:00:00" // End at midnight (full day)
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        // views={calendarViews}
        dayHeaderClassNames={(args) => {
          if (args.view.type === 'timeGridDay') {
            // Hide day header for Day view since we have our own header
            return ['hidden'];
          }

          if (args.view.type !== 'dayGridMonth') {
            return [];
          }

          if (isSameMonth(currentDate, todayLocal) && args.date.getDay() === todayLocal.getDay()) {
            return ['fc-day-header-today'];
          }

          return [];
        }}
        fixedWeekCount={false}
        // Event settings
        events={events}
        editable={!!onEventDrop}
        selectable={!!onDateSelect}
        selectMirror={true}
        dayMaxEvents={true}
        moreLinkClick="popover"
        // Event handlers
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventMouseEnter={(info) => {
          // Add right-click support to events
          const eventElement = info.el;
          eventElement.addEventListener('contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            handleEventRightClick(info, e);
          });

          // Disable hover effects for list view
          if (currentView === 'listWeek') {
            eventElement.style.cursor = 'default';
            eventElement.style.transform = 'none';
            eventElement.style.transition = 'none';
          }
        }}
        // No automatic date handlers - we control everything manually
        // Styling
        eventClassNames="cursor-pointer"
        eventDisplay="block"
        // Loading state
        loading={(isLoading) => {
          // You can add a loading indicator here if needed
        }}
        // Custom event content
        eventContent={(eventInfo) => {
          const appointment = eventInfo.event.extendedProps.appointment as Appointment;
          const eventColor = (eventInfo.event as any).color || '#3b82f6'; // Default blue color
          return (
            <div
              data-testid="calendar-event"
              className="p-1 text-xs relative rounded"
              style={{ backgroundColor: eventColor }}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold truncate flex-1 text-white">
                  {appointment?.patient?.name || 'Unknown Patient'}
                </div>
              </div>
              {appointment && (
                <AppointmentStaffInfo appointment={appointment} />
              )}
            </div>
          );
        }}
        // Custom no events content for List view
        noEventsContent={(info) => {
          if (currentView === 'listDay') {
            return (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">No appointments scheduled for this day</div>
              </div>
            );
          }
          return 'No events to display';
        }}
      />
          </div>
        </div>
      )}
    </div>
  );
}
