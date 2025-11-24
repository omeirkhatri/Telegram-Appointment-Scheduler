// @ts-nocheck
'use client';

import { useAppointmentsForMapDateRange } from '@/hooks/useAppointmentsForMap';
import { useMapNavigation } from '@/hooks/useMapNavigation';
import { buildTimezoneArtifacts, getCurrentLocalTime } from '@/lib/timezoneArtifacts';
import type { Appointment } from '@/types';
import { getAppointmentTypeDisplayName } from '@/types/appointment';
import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import type { DateSelectArg, EventClickArg, EventDropArg, EventResizeArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { isSameMonth } from 'date-fns';
import { Calendar, CalendarDays, List, Map } from 'lucide-react';
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

  // Build staff components based on available data
  const staffComponents = [];

  // Add service abbreviation if available
  if (serviceAbbr && serviceAbbr !== appointment.appointment_type.substring(0, 3).toUpperCase()) {
    staffComponents.push(
      <span key="service" className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-white bg-opacity-20 text-white">
        {serviceAbbr}
      </span>
    );
  }

  // Add primary staff
  if (primaryStaffName && primaryStaffName !== 'Staff not assigned' && primaryStaffName !== 'NAN') {
    staffComponents.push(
      <span key="staff" className="text-xs opacity-90">
        {primaryStaffName}
      </span>
    );
  }

  // Add driver info
  if (driverName) {
    staffComponents.push(
      <span key="driver" className="inline-flex items-center text-xs opacity-80">
        🚗 {driverName}
      </span>
    );
  } else if (hasDriverId) {
    staffComponents.push(
      <span key="driver-id" className="inline-flex items-center text-xs opacity-80">
        🚗 Driver
      </span>
    );
  } else {
    staffComponents.push(
      <span key="self" className="text-xs opacity-70">
        Self
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {staffComponents}
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
}: AppointmentCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<CalendarViewType>(initialView);
  const timezoneArtifacts = buildTimezoneArtifacts();
  const [currentDate, setCurrentDate] = useState(() => getCurrentLocalTime(timezoneArtifacts));
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => getCurrentLocalTime(timezoneArtifacts));
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    firstDayOfWeek: 1, // Monday
    locale: 'en',
    calendarHeight: 'auto',
    maxEventsPerDay: 3,
    enableStickyHeader: true,
    useCustomEventRenderer: true,
    useCustomCalendarHeader: true,
    useEventLifecycleCallbacks: true,
    useCustomOnCellClick: true,
    useCustomOnEventClick: true,
    disableCellClicks: false,
    disableEventClicks: false,
    disableDragDrop: false,
  });
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
      transportationType: filters.transportation_type,
    }
  );

  // Update currentView when initialView changes
  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  // Force calendar refresh when appointments change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const calendar = calendarRef.current;
    if (calendar) {
      try {
        calendar.render();
      } catch (error) {
        console.error('Error refreshing calendar:', error);
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
          nowIndicator.style.setProperty('border-color', '#ef4444', 'important');
          nowIndicator.style.setProperty('border-width', thickness, 'important');
          nowIndicator.style.setProperty('z-index', '10', 'important');
        }

        if (nowIndicatorLine) {
          nowIndicatorLine.style.setProperty('border-color', '#ef4444', 'important');
          nowIndicatorLine.style.setProperty('border-width', thickness, 'important');
          nowIndicatorLine.style.setProperty('height', thickness, 'important');
        }

        if (nowIndicatorArrow) {
          nowIndicatorArrow.style.setProperty('display', 'block', 'important');
          nowIndicatorArrow.style.setProperty('width', '8px', 'important');
          nowIndicatorArrow.style.setProperty('height', '8px', 'important');
          nowIndicatorArrow.style.setProperty('border-radius', '50%', 'important');
          nowIndicatorArrow.style.setProperty('background-color', '#ef4444', 'important');
          nowIndicatorArrow.style.setProperty('border', 'none', 'important');
          nowIndicatorArrow.style.setProperty('position', 'absolute', 'important');
          nowIndicatorArrow.style.setProperty('left', '-4px', 'important');
          nowIndicatorArrow.style.setProperty('top', '-3px', 'important');
          nowIndicatorArrow.style.setProperty('z-index', '11', 'important');
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
    if (typeof window === 'undefined') return;

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
  }, []);

  // Filter appointments by current date for map view
  const getAppointmentsForCurrentDate = useCallback(() => {
    if (currentView !== 'map') return appointments;
    const currentDateString = currentDate.toISOString().split('T')[0];
    return appointments.filter(appointment => appointment.appointment_date === currentDateString);
  }, [appointments, currentDate, currentView]);

  const filteredAppointments = getAppointmentsForCurrentDate();

  // Convert appointments to calendar events
  const events = appointments.map((appointment) => {
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

    console.log('Event created:', {
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      startDateTimeUTC: startDateTime.toISOString(),
      startDateTimeLocal: startDateTime.toLocaleString(),
      currentLocalTime: getCurrentLocalTime(timezoneArtifacts),
      timezone: timezoneArtifacts.resolution.timezone,
      timezoneSource: timezoneArtifacts.resolution.source
    });

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
      color = getAppointmentTypeColor(appointment.appointment_type, 'secondary');
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
      } as React.MouseEvent;
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

  const handleEventResize = useCallback(async (resizeInfo: EventResizeArg) => {
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
      dayHeaderFormat: isCompactLayout ? { weekday: 'short' } : { weekday: 'long' }
    },
    timeGridWeek: {
      dayHeaderFormat: isCompactLayout
        ? { weekday: 'short', day: 'numeric' }
        : { weekday: 'long', month: 'short', day: 'numeric' }
    },
    timeGridDay: {
      dayHeaderFormat: isCompactLayout
        ? { weekday: 'short', month: 'short', day: 'numeric' }
        : { weekday: 'long', month: 'short', day: 'numeric' }
    },
    listWeek: {
      dayHeaderFormat: isCompactLayout
        ? { weekday: 'short', month: 'short', day: 'numeric' }
        : { weekday: 'long', month: 'short', day: 'numeric' },
      listDayFormat: isCompactLayout
        ? { weekday: 'short', month: 'short', day: 'numeric' }
        : { weekday: 'long', month: 'short', day: 'numeric' }
    },
    listDay: {
      dayHeaderFormat: isCompactLayout
        ? { weekday: 'short', month: 'short', day: 'numeric' }
        : { weekday: 'long', month: 'short', day: 'numeric' },
      listDayFormat: isCompactLayout
        ? { weekday: 'short', month: 'short', day: 'numeric' }
        : { weekday: 'long', month: 'short', day: 'numeric' }
    }
  }), [isCompactLayout]);

  const getCompactWeekdayLabel = (date: Date) => {
    const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const day = date.getDay();
    const index = (day + 6) % 7; // shift so Monday is first
    return labels[index] || labels[0];
  };

  const viewButtonClass = (isActive: boolean) =>
    `px-1.5 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-[--primary] text-[--primary-foreground] shadow-sm'
        : 'text-[--foreground] hover:bg-[--accent]'
    }`;

  const iconButtonClass = (isActive: boolean) =>
    `p-2 rounded-md transition-colors ${
      isActive
        ? 'bg-[--primary] text-[--primary-foreground]'
        : 'text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent]'
    }`;

  const shouldEnableHorizontalScroll = isCompactLayout && currentView === 'timeGridWeek';

  // Theme CSS Variables
  const themeStyles = useMemo(() => {
    if (isDarkTheme) {
      return `
        :root {
          --background: #1a1f36;
          --foreground: #ffffff;
          --card: #2d3748;
          --card-foreground: #ffffff;
          --popover: #2d3748;
          --popover-foreground: #ffffff;
          --primary: #3b82f6;
          --primary-foreground: #ffffff;
          --secondary: #4a5568;
          --secondary-foreground: #ffffff;
          --muted: #4a5568;
          --muted-foreground: #a0aec0;
          --accent: #4a5568;
          --accent-foreground: #ffffff;
          --destructive: #e53e3e;
          --destructive-foreground: #ffffff;
          --border: #4a5568;
          --input: #4a5568;
          --ring: #3b82f6;
          --radius: 0.5rem;
        }
        .calendar-container {
          background-color: var(--card) !important;
          border-color: var(--border) !important;
        }
        .fc {
          background-color: var(--card) !important;
          color: var(--foreground) !important;
        }
        .fc-header-toolbar {
          background-color: var(--card) !important;
          border-color: var(--border) !important;
        }
        .fc-button {
          background-color: var(--secondary) !important;
          color: var(--foreground) !important;
          border-color: var(--border) !important;
        }
        .fc-button:hover {
          background-color: var(--accent) !important;
        }
        .fc-button-active {
          background-color: var(--primary) !important;
          color: var(--primary-foreground) !important;
        }
        .fc-daygrid-day {
          background-color: var(--card) !important;
          border-color: var(--border) !important;
        }
        .fc-daygrid-day-number {
          color: var(--foreground) !important;
        }
        .fc-timegrid-slot {
          background-color: var(--card) !important;
          border-color: var(--border) !important;
        }
        .fc-timegrid-slot-label {
          color: var(--muted-foreground) !important;
        }
        .fc-col-header {
          background-color: var(--secondary) !important;
          border-color: var(--border) !important;
        }
        .fc-col-header-cell {
          color: var(--foreground) !important;
          border-color: var(--border) !important;
        }
        .fc-event {
          border-color: var(--border) !important;
        }
        .fc-list-event-dot {
          background-color: var(--primary) !important;
        }
        .fc-list-event-title {
          color: var(--foreground) !important;
        }
        .fc-list-event-time {
          color: var(--muted-foreground) !important;
        }
      `;
    } else {
      return `
        :root {
          --background: #ffffff;
          --foreground: #000000;
          --card: #ffffff;
          --card-foreground: #000000;
          --popover: #ffffff;
          --popover-foreground: #000000;
          --primary: #3b82f6;
          --primary-foreground: #ffffff;
          --secondary: #f7fafc;
          --secondary-foreground: #000000;
          --muted: #f7fafc;
          --muted-foreground: #718096;
          --accent: #f7fafc;
          --accent-foreground: #000000;
          --destructive: #e53e3e;
          --destructive-foreground: #ffffff;
          --border: #e2e8f0;
          --input: #e2e8f0;
          --ring: #3b82f6;
          --radius: 0.5rem;
        }
      `;
    }
  }, [isDarkTheme]);

  // Apply theme styles
  useEffect(() => {
    const styleId = 'calendar-theme-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = themeStyles;
  }, [themeStyles]);

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
    <div data-testid="calendar-container" className="bg-[--card] rounded-lg shadow-sm border border-[--border] calendar-container relative">
      {/* Custom Header Toolbar */}
      <div className={`flex flex-col gap-2 p-2 sm:p-4 border-b border-[--border] lg:flex-row lg:items-center lg:justify-between ${
        settings.enableStickyHeader ? 'sticky top-0 z-40 bg-[--card] shadow-sm' : ''
      }`}>
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-2">
          {/* Settings Toggle Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 sm:p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-md transition-colors"
            title="Calendar Settings"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="p-1 sm:p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-md transition-colors"
            title={`Switch to ${isDarkTheme ? 'light' : 'dark'} theme`}
          >
            {isDarkTheme ? (
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
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
            className="p-1 sm:p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-md transition-colors"
            title={currentView === 'dayGridMonth' ? "Previous month" : currentView === 'timeGridWeek' ? "Previous week" : "Previous day"}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => {
              const today = getCurrentLocalTime(timezoneArtifacts);
              changeDate(today);
            }}
            className="px-1.5 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-[--foreground] bg-[--accent] rounded-md hover:bg-[--accent]/80 transition-colors"
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
            className="p-1 sm:p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-md transition-colors"
            title={currentView === 'dayGridMonth' ? "Next month" : currentView === 'timeGridWeek' ? "Next week" : "Next day"}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => {
                setPickerDate(currentDate);
                setShowDatePicker(!showDatePicker);
              }}
              className="p-1 sm:p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-md transition-colors"
              title="Select date"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-3 sm:p-4 w-[280px] sm:w-[320px]">
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
            <div className="text-base sm:text-lg font-semibold text-[--foreground] text-center">
              {currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: timezoneArtifacts.resolution.timezone })}
            </div>
          )}
          {/* Week display for week view - centered */}
          {currentView === 'timeGridWeek' && (
            <div className="text-base sm:text-lg font-semibold text-[--foreground] text-center">
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
            <div className="text-base sm:text-lg font-semibold text-[--foreground] text-center">
              {currentDate.toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'Asia/Dubai'
              })}
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
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

        </div>

        <div className="inline-flex items-center gap-1 mr-20">
          <button onClick={() => changeView('dayGridMonth')} className={iconButtonClass(currentView === 'dayGridMonth')} title="Month View">
            <Calendar className="w-4 h-4" />
          </button>
          <button onClick={() => changeView('timeGridWeek')} className={iconButtonClass(currentView === 'timeGridWeek')} title="Week View">
            <CalendarDays className="w-4 h-4" />
          </button>
          <button onClick={() => changeView('timeGridDay')} className={iconButtonClass(currentView === 'timeGridDay')} title="Day View">
            <Calendar className="w-4 h-4" />
          </button>
          <button onClick={() => changeView('listDay')} className={iconButtonClass(currentView === 'listDay' || currentView === 'listWeek')} title="List View">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => changeView('map')} className={iconButtonClass(currentView === 'map')} title="Map View">
            <Map className="w-4 h-4" />
          </button>
          {currentView === 'map' && (
            <button
              onClick={() => {
                const mapView = document.querySelector('[data-testid="map-container"]');
                if (mapView) {
                  const event = new CustomEvent('fitToMarkers');
                  mapView.dispatchEvent(event);
                }
              }}
              className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-[--foreground] hover:bg-[--accent] border border-[--border]"
              title="Fit to map view"
            >
              <Map className="w-4 h-4 mr-2" />
              Fit to Map
            </button>
          )}




        </div>
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
        <div>

          {/* Debug: Log appointments being passed to map */}
          {console.log('Appointments being passed to AppointmentMapView (with expanded recurring):', mapAppointments.map(apt => ({
            id: apt.id,
            patient_name: apt.patient?.name,
            appointment_date: apt.appointment_date,
            start_time: apt.start_time,
            has_patient: !!apt.patient,
            has_coordinates: !!(apt.patient?.latitude && apt.patient?.longitude),
            coordinates: apt.patient?.latitude ? `${apt.patient.latitude}, ${apt.patient.longitude}` : 'None',
            is_recurring_generated: apt.custom_fields?.is_recurring_generated || false,
            base_appointment_id: apt.custom_fields?.base_appointment_id || 'N/A'
          })))}

          <AppointmentMapView
            appointments={mapAppointments}
            isLoading={isMapLoading}
            error={mapError}
            refetch={refetchMap}
            onAppointmentClick={onEventClick}
            onAppointmentRightClick={onEventRightClick}
            height="625px"
            searchFilters={{
              appointment_types: filters.appointmentType ? [filters.appointmentType] : undefined,
              statuses: filters.status ? [filters.status] : undefined,
              date_range: filters.dateFrom || filters.dateTo ? {
                start_date: filters.dateFrom || new Date().toISOString().split('T')[0],
                end_date: filters.dateTo || new Date().toISOString().split('T')[0]
              } : undefined,
              transportation_type: filters.transportation_type ? [filters.transportation_type] : undefined,
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
        height={settings.calendarHeight !== 'auto' ? settings.calendarHeight : height}
        headerToolbar={false}
        timeZone={timezoneArtifacts.resolution.timezone}
        timeZoneParam={timezoneArtifacts.resolution.timezone}
        firstDay={settings.firstDayOfWeek}
        locale={settings.locale}
        stickyHeaderDates={settings.enableStickyHeader}
        // Force timezone handling
        nowIndicator={true}
        nowIndicatorClassNames="custom-now-indicator"
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
        nowIndicator={true} // Show current time indicator
        nowIndicatorClassNames="custom-now-indicator"
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
        views={calendarViews}
        dayHeaderClassNames={(args) => {
          if (args.view.type === 'timeGridDay') {
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
        dayHeaderContent={(args) => {
          if (!isCompactLayout) {
            return undefined;
          }

          if (args.view.type === 'dayGridMonth') {
            return { html: `<span>${getCompactWeekdayLabel(args.date)}</span>` };
          }

          if (args.view.type === 'timeGridWeek') {
            const dayLabel = getCompactWeekdayLabel(args.date);
            const dayNumber = args.date.getDate();
            return { html: `<span>${dayLabel}</span> <span>${dayNumber}</span>` };
          }

          return undefined;
        }}
        fixedWeekCount={false}
        // Event settings
        events={events}
        editable={!settings.disableDragDrop && !!onEventDrop}
        eventResizable={!settings.disableDragDrop && !!onEventResize}
        selectable={!!onDateSelect}
        selectMirror={true}
        dayMaxEvents={settings.maxEventsPerDay}
        moreLinkClick="popover"
        selectable={!settings.disableCellClicks && !!onDateSelect}
        // Event handlers
        select={settings.useCustomOnCellClick ? handleDateSelect : undefined}
        eventClick={!settings.disableEventClicks ? handleEventClick : undefined}
        eventDrop={!settings.disableDragDrop ? handleEventDrop : undefined}
        eventResize={!settings.disableDragDrop ? handleEventResize : undefined}
        eventMouseEnter={(info) => {
          const eventElement = info.el;

          // Add right-click support to events
          eventElement.addEventListener('contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            handleEventRightClick(info, e);
          });

          // Enhanced hover effects for non-list views
          if (currentView !== 'listWeek' && currentView !== 'listDay') {
            eventElement.style.cursor = 'pointer';
            eventElement.style.transform = 'scale(1.02)';
            eventElement.style.transition = 'all 0.2s ease-in-out';
            eventElement.style.zIndex = '10';
            eventElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }
        }}
        eventMouseLeave={(info) => {
          const eventElement = info.el;

          // Reset hover effects for non-list views
          if (currentView !== 'listWeek' && currentView !== 'listDay') {
            eventElement.style.transform = 'scale(1)';
            eventElement.style.zIndex = 'auto';
            eventElement.style.boxShadow = 'none';
          }
        }}
        eventClick={(info) => {
          const eventElement = info.el;

          // Add click animation
          eventElement.style.transform = 'scale(0.98)';
          setTimeout(() => {
            eventElement.style.transform = 'scale(1)';
          }, 150);

          // Call the original handler
          handleEventClick(info);
        }}
        select={(info) => {
          // Add visual feedback for cell selection
          const selectedElements = document.querySelectorAll('.fc-highlight');
          selectedElements.forEach(el => {
            el.classList.add('animate-pulse');
            setTimeout(() => {
              el.classList.remove('animate-pulse');
            }, 1000);
          });

          // Call the original handler
          handleDateSelect(info);
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
          const eventColor = eventInfo.event.color || '#3b82f6'; // Default blue color
          const isDark = isDarkTheme;

          return (
            <div
              data-testid="calendar-event"
              className={`p-2 text-xs relative rounded-md shadow-sm border transition-all duration-200 hover:shadow-md ${
                isDark ? 'border-opacity-20' : 'border-opacity-10'
              }`}
              style={{
                backgroundColor: eventColor,
                borderColor: eventColor,
                color: 'white'
              }}
            >
              {/* Header with patient name and service type */}
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold truncate flex-1 leading-tight">
                  {appointment?.patient?.name || 'Unknown Patient'}
                </div>
                <div className="ml-2 text-xs opacity-90 font-mono font-bold bg-black bg-opacity-20 px-1.5 py-0.5 rounded">
                  {getServiceAbbreviation(appointment?.appointment_type || '')}
                </div>
              </div>

              {/* Staff and time information */}
              {appointment && (
                <div className="space-y-1">
                  <AppointmentStaffInfo appointment={appointment} />

                  {/* Time display */}
                  <div className="text-xs opacity-80 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {appointment.start_time} - {appointment.end_time || 'TBD'}
                  </div>

                  {/* Status indicator */}
                  {appointment.status && (
                    <div className={`text-xs px-2 py-0.5 rounded-full text-center font-medium ${
                      appointment.status === 'confirmed' ? 'bg-green-500 bg-opacity-80' :
                      appointment.status === 'pending' ? 'bg-yellow-500 bg-opacity-80' :
                      appointment.status === 'cancelled' ? 'bg-red-500 bg-opacity-80' :
                      'bg-gray-500 bg-opacity-80'
                    }`}>
                      {appointment.status}
                    </div>
                  )}
                </div>
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[--popover] border border-[--border] rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[--border]">
              <h3 className="text-lg font-semibold text-[--popover-foreground]">Calendar Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-6">
              {/* Basic Settings */}
              <div>
                <h4 className="text-sm font-medium text-[--popover-foreground] mb-3">Display Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-[--muted-foreground] mb-1">First Day of Week</label>
                    <select
                      value={settings.firstDayOfWeek}
                      onChange={(e) => setSettings(prev => ({ ...prev, firstDayOfWeek: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-[--input] border border-[--border] rounded-md text-[--foreground] text-sm"
                    >
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[--muted-foreground] mb-1">Locale</label>
                    <select
                      value={settings.locale}
                      onChange={(e) => setSettings(prev => ({ ...prev, locale: e.target.value }))}
                      className="w-full px-3 py-2 bg-[--input] border border-[--border] rounded-md text-[--foreground] text-sm"
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[--muted-foreground] mb-1">Calendar Height</label>
                    <select
                      value={settings.calendarHeight}
                      onChange={(e) => setSettings(prev => ({ ...prev, calendarHeight: e.target.value }))}
                      className="w-full px-3 py-2 bg-[--input] border border-[--border] rounded-md text-[--foreground] text-sm"
                    >
                      <option value="auto">Auto</option>
                      <option value="600px">600px</option>
                      <option value="800px">800px</option>
                      <option value="1000px">1000px</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[--muted-foreground] mb-1">Max Events Per Day</label>
                    <select
                      value={settings.maxEventsPerDay}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxEventsPerDay: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-[--input] border border-[--border] rounded-md text-[--foreground] text-sm"
                    >
                      <option value={2}>2 events</option>
                      <option value={3}>3 events</option>
                      <option value={5}>5 events</option>
                      <option value={10}>10 events</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <h4 className="text-sm font-medium text-[--popover-foreground] mb-3">Features</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.enableStickyHeader}
                      onChange={(e) => setSettings(prev => ({ ...prev, enableStickyHeader: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Enable sticky header</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.useCustomEventRenderer}
                      onChange={(e) => setSettings(prev => ({ ...prev, useCustomEventRenderer: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Use custom event renderer</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.useCustomCalendarHeader}
                      onChange={(e) => setSettings(prev => ({ ...prev, useCustomCalendarHeader: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Use custom calendar header</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.useEventLifecycleCallbacks}
                      onChange={(e) => setSettings(prev => ({ ...prev, useEventLifecycleCallbacks: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Use event lifecycle callbacks</span>
                  </label>
                </div>
              </div>

              {/* Interaction Settings */}
              <div>
                <h4 className="text-sm font-medium text-[--popover-foreground] mb-3">Interactions</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.useCustomOnCellClick}
                      onChange={(e) => setSettings(prev => ({ ...prev, useCustomOnCellClick: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Use custom onCellClick handler</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.useCustomOnEventClick}
                      onChange={(e) => setSettings(prev => ({ ...prev, useCustomOnEventClick: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Use custom onEventClick handler</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.disableCellClicks}
                      onChange={(e) => setSettings(prev => ({ ...prev, disableCellClicks: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Disable cell clicks</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.disableEventClicks}
                      onChange={(e) => setSettings(prev => ({ ...prev, disableEventClicks: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Disable event clicks</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.disableDragDrop}
                      onChange={(e) => setSettings(prev => ({ ...prev, disableDragDrop: e.target.checked }))}
                      className="rounded border-[--border] bg-[--input] text-[--primary]"
                    />
                    <span className="text-sm text-[--popover-foreground]">Disable drag & drop</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-[--border]">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-md transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Apply settings to calendar
                  setShowSettings(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-[--primary] text-[--primary-foreground] hover:bg-[--primary]/90 rounded-md transition-colors"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
