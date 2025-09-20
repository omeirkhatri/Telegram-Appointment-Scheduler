'use client';

import { useMapNavigation } from '@/hooks/useMapNavigation';
import type { Appointment } from '@/types';
import { getAppointmentTypeDisplayName } from '@/types/appointment';
import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import { getCurrentDubaiTime } from '@/utils/timezone';
import type { DateSelectArg, EventClickArg, EventDropArg, EventResizeArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppointmentMapView } from './AppointmentMapView';
import { CalendarDatePicker } from './CalendarDatePicker';


// Global cache for staff information to avoid repeated API calls
const staffCache = new Map<string, { primaryStaff?: string; driver?: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  const [staffInfo, setStaffInfo] = useState<{
    primaryStaff?: string;
    driver?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (appointment?.id) {
      // Extract base appointment ID if this is a recurring occurrence
      let appointmentId = appointment.id;
      if (appointmentId.includes('_occurrence_')) {
        appointmentId = appointmentId.split('_occurrence_')[0];
      }

      // Check cache first
      const cached = staffCache.get(appointmentId);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        // Use cached data
        setStaffInfo({
          primaryStaff: cached.primaryStaff,
          driver: cached.driver,
        });
        setIsLoading(false);
        return;
      }

      // Fetch staff assignments for this appointment
      setIsLoading(true);
      fetch(`/api/appointments/${appointmentId}/staff`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data && data.data.staff_assignments && Array.isArray(data.data.staff_assignments)) {
            const staffAssignments = data.data.staff_assignments;
            const primaryStaff = staffAssignments.find((s: any) => s.is_primary);
            const driver = staffAssignments.find((s: any) => s.role === 'driver');

            const staffData = {
              primaryStaff: primaryStaff ? `${primaryStaff.staff?.first_name} ${primaryStaff.staff?.last_name}` : undefined,
              driver: driver ? `${driver.staff?.first_name} ${driver.staff?.last_name}` : undefined,
            };

            // Cache the result
            staffCache.set(appointmentId, {
              ...staffData,
              timestamp: now,
            });

            setStaffInfo(staffData);
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching staff assignments:', err);
          // Reset staff info on error
          setStaffInfo({});
          setIsLoading(false);
        });
    }
  }, [appointment?.id]);

  // Always show staff information, even if no staff assigned
  const serviceAbbr = getServiceAbbreviation(appointment.appointment_type);
  let staffText = '';

  // Show loading state instead of NAN
  if (isLoading) {
    staffText = `${serviceAbbr}, Loading...`;
  } else if (staffInfo.primaryStaff) {
    if (staffInfo.driver) {
      staffText = `${serviceAbbr}, ${staffInfo.primaryStaff}, ${staffInfo.driver}`;
    } else {
      staffText = `${serviceAbbr}, ${staffInfo.primaryStaff}, Self`;
    }
  } else if (staffInfo.driver) {
    staffText = `${serviceAbbr}, NAN, ${staffInfo.driver}`;
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
  // Initialize currentDate with a proper Date object for today in Dubai timezone
  const [currentDate, setCurrentDate] = useState(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      return getCurrentDubaiTime();
    }
    return new Date(); // Fallback for SSR
  });
  const isUserChangingDate = useRef(false);

  // Map navigation hook for map view
  const mapNavigation = useMapNavigation({
    initialDate: currentDate,
    initialView: 'day',
    enableDateRange: true,
    enableTimeRange: true,
    enableFilters: true,
    autoUpdateMarkers: true,
    onDateChange: (date) => {
      setCurrentDate(date);
    },
    onViewChange: (view) => {
      // Map view doesn't use the same view types as calendar
      // This is handled by the map component itself
    }
  });


  // Update currentView when initialView changes
  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  // Ensure currentDate is properly initialized on client side
  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      const now = getCurrentDubaiTime();
      // Only update if the current date is invalid or significantly different
      if (!currentDate || isNaN(currentDate.getTime()) || currentDate.getFullYear() < 2020) {
        setCurrentDate(now);
      }

      // Debug timezone information on mount
      debugTimezoneInfo();
    }
  }, []);



  // Force calendar refresh when appointments change
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const calendar = calendarRef.current;
    if (calendar) {
      try {
        // Force a re-render of the calendar events
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
        const now = getCurrentDubaiTime();

        // Always force to current Dubai time on initialization
        api.gotoDate(now);
        setCurrentDate(now);

      } catch (error) {
        console.error('Error initializing calendar:', error);
      }
    }
  }, []);

  // Get date range for current view
  const getDateRange = useCallback(() => {
    // Only run on client side
    if (typeof window === 'undefined') return { start: new Date(), end: new Date() };

    const calendar = calendarRef.current;
    if (!calendar || !calendar.view) return { start: new Date(), end: new Date() };

    const view = calendar.view;
    return {
      start: view.activeStart || new Date(),
      end: view.activeEnd || new Date(),
    };
  }, []);

  // Debug timezone information
  const debugTimezoneInfo = () => {
    const now = new Date();
    const dubaiTime = getCurrentDubaiTime();

    console.log('Timezone Debug Info:', {
      localTime: now,
      dubaiTime: dubaiTime,
      localTimezoneOffset: now.getTimezoneOffset(),
      dubaiTimezoneOffset: dubaiTime.getTimezoneOffset(),
      timezoneDifference: (dubaiTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    });
  };

  // Convert appointments to calendar events
  const events = appointments.map((appointment) => {
    // Convert start_time from HH:MM:SS to HH:MM format for proper date parsing
    const timeOnly = appointment.start_time.includes(':')
      ? appointment.start_time.split(':').slice(0, 2).join(':')
      : appointment.start_time;

    // Create date and add 4 hours to convert to Dubai time (UTC+4)
    // The appointment_date and start_time are stored in Dubai timezone
    const utcDateTime = new Date(`${appointment.appointment_date}T${timeOnly}:00`);
    const startDateTime = new Date(utcDateTime.getTime() + (4 * 60 * 60 * 1000)); // Add 4 hours
    const endDateTime = new Date(startDateTime.getTime() + appointment.duration_minutes * 60000);

    console.log('Event created:', {
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      utcDateTime: utcDateTime,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      startDateTimeUTC: startDateTime.toISOString(),
      startDateTimeLocal: startDateTime.toLocaleString(),
      currentDubaiTime: getCurrentDubaiTime()
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
      // Convert native MouseEvent to React MouseEvent
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
    const newStart = event.start!;
    const newEnd = event.end || new Date(newStart.getTime() + 60 * 60 * 1000); // Default 1 hour

    try {
      if (onEventDrop) {
        await onEventDrop(appointmentId, newStart, newEnd);
      }
      // Note: Parent component should handle refetching data
    } catch (error) {
      console.error('Failed to update appointment:', error);
      // Revert the event position
      dropInfo.revert();
    }
  }, [onEventDrop]);

  const handleEventResize = useCallback(async (resizeInfo: EventResizeArg) => {
    const event = resizeInfo.event;
    const appointmentId = event.id;
    const newStart = event.start!;
    const newEnd = event.end!;

    try {
      if (onEventResize) {
        await onEventResize(appointmentId, newStart, newEnd);
      }
      // Note: Parent component should handle refetching data
    } catch (error) {
      console.error('Failed to resize appointment:', error);
      // Revert the event size
      resizeInfo.revert();
    }
  }, [onEventResize]);

  const handleViewChange = useCallback(() => {
    try {
      const calendar = calendarRef.current;
      if (calendar) {
        const api = calendar.getApi();
        const newViewType = api.view.type;

        // Update view state - only for calendar views, not map view
        if (newViewType !== 'map') {
          setCurrentView(newViewType as CalendarViewType);
        }

        // Only update date if user is not currently changing it
        if (!isUserChangingDate.current) {
          const currentCalendarDate = api.getDate();
          if (currentCalendarDate && !isNaN(currentCalendarDate.getTime())) {
            // Only update if the date is actually different
            const currentDateValue = currentDate.getTime();
            const newDateValue = currentCalendarDate.getTime();

            if (Math.abs(currentDateValue - newDateValue) > 1000) { // More than 1 second difference
              setCurrentDate(currentCalendarDate);
            }
          } else {
            // Fallback to today's date if calendar date is invalid
            const today = getCurrentDubaiTime();
            setCurrentDate(today);
          }
        }
      }
    } catch (error) {
      console.error('Error in view change handler:', error);
    }
  }, [currentDate]);

  const handleDatesSet = useCallback(() => {
    try {
      // Don't update if user is currently changing the date
      if (isUserChangingDate.current) {
        return;
      }

      const calendar = calendarRef.current;
      if (calendar) {
        const api = calendar.getApi();
        const activeStart = api.view.activeStart;
        const viewType = api.view.type;

        console.log('handleDatesSet called:', {
          viewType,
          activeStart,
          activeStartDateString: activeStart ? activeStart.toISOString().split('T')[0] : 'null',
          currentDate: currentDate,
          currentDateString: currentDate.toISOString().split('T')[0],
          isUserChangingDate: isUserChangingDate.current,
          dubaiTime: getCurrentDubaiTime().toISOString().split('T')[0]
        });

        // Only update currentDate if we have a valid activeStart
        if (activeStart && !isNaN(activeStart.getTime())) {
          // Check if the year is reasonable (not 1970 or other invalid years)
          if (activeStart.getFullYear() >= 2020 && activeStart.getFullYear() <= 2030) {
            let dateToSet = activeStart;

            // For month view, activeStart is the first day of the calendar grid
            // which might be from the previous month. We need to get the actual month being displayed.
            if (viewType === 'dayGridMonth') {
              // Get the current date that the calendar is showing
              const currentCalendarDate = api.getDate();
              dateToSet = currentCalendarDate;
            }

            // Only update if the date is actually different to avoid unnecessary re-renders
            const currentDateValue = currentDate.getTime();
            const newDateValue = dateToSet.getTime();

            if (Math.abs(currentDateValue - newDateValue) > 1000) { // More than 1 second difference
              console.log('Updating currentDate from', currentDate, 'to', dateToSet);
              setCurrentDate(dateToSet);
            }
          } else {
            console.warn('Invalid year in activeStart:', activeStart.getFullYear(), 'forcing correct date');
            // Force the calendar to use the correct current date
            const correctDate = getCurrentDubaiTime();
            api.gotoDate(correctDate);
            setCurrentDate(correctDate);
          }
        } else {
          console.warn('handleDatesSet - activeStart is invalid:', activeStart);
          // If activeStart is invalid, try to get the current date from the calendar
          const currentCalendarDate = api.getDate();
          if (currentCalendarDate && !isNaN(currentCalendarDate.getTime())) {
            setCurrentDate(currentCalendarDate);
          }
        }
      }
    } catch (error) {
      console.error('Error in dates set handler:', error);
    }
  }, [currentDate]);

  const handleDateChange = useCallback((date: Date) => {
    const calendar = calendarRef.current;
    if (calendar) {
      const api = calendar.getApi();

      // Set flag to prevent handleDatesSet from overriding this change
      isUserChangingDate.current = true;

      // Use the date directly - FullCalendar will handle timezone conversion
      console.log('Date change:', {
        originalDate: date,
        dateString: date.toISOString().split('T')[0]
      });

      api.gotoDate(date);
      setCurrentDate(date);

      // Reset flag after a short delay
      setTimeout(() => {
        isUserChangingDate.current = false;
      }, 100);
    }
  }, []);

  // Handle switching from map view back to calendar views
  const handleCalendarViewSwitch = useCallback((viewType: CalendarViewType) => {
    if (viewType === 'map') {
      setCurrentView('map');
      mapNavigation.goToDate(currentDate);
      return;
    }

    // Switch to calendar view
    setCurrentView(viewType);

    const calendar = calendarRef.current;
    if (calendar) {
      const api = calendar.getApi();
      const today = getCurrentDubaiTime();

      // Set flag to prevent handleDatesSet from overriding this change
      isUserChangingDate.current = true;

      // Convert view type to FullCalendar view
      const fullCalendarView = viewType === 'dayGridMonth' ? 'dayGridMonth' :
                              viewType === 'timeGridWeek' ? 'timeGridWeek' :
                              viewType === 'timeGridDay' ? 'timeGridDay' :
                              viewType === 'listWeek' ? 'listWeek' : 'listDay';

      api.changeView(fullCalendarView, currentDate);
      setCurrentDate(currentDate);

      // Force view change handler to update the view state
      setTimeout(() => {
        handleViewChange();
        isUserChangingDate.current = false;
      }, 50);
    }
  }, [currentDate, mapNavigation, handleViewChange]);

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
    <div className="bg-[--card] rounded-lg shadow-sm border border-[--border] calendar-container">
      {/* Custom Header Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-[--border]">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const calendar = calendarRef.current;
              if (calendar) {
                const api = calendar.getApi();
                api.prev();
              }
            }}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => {
              const calendar = calendarRef.current;
              if (calendar) {
                const api = calendar.getApi();
                api.next();
              }
            }}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => {
              const calendar = calendarRef.current;
              if (calendar) {
                const api = calendar.getApi();
                const today = getCurrentDubaiTime();

                console.log('Today button clicked:', {
                  currentDubaiTime: today,
                  currentCalendarDate: api.getDate(),
                  currentView: api.view.type,
                  dubaiDateString: today.toISOString().split('T')[0]
                });

                // Set flag to prevent handleDatesSet from overriding this change
                isUserChangingDate.current = true;

                // Go to today's date - FullCalendar will handle timezone conversion
                console.log('Today button clicked:', {
                  dubaiTime: today,
                  dubaiDateString: today.toISOString().split('T')[0]
                });

                api.gotoDate(today);
                setCurrentDate(today);

                // Force a render to ensure the calendar updates
                api.render();

                // Force view change handler to update the view state
                setTimeout(() => {
                  handleViewChange();
                  isUserChangingDate.current = false;
                  console.log('Today button - after change:', {
                    calendarDate: api.getDate(),
                    currentDate: currentDate,
                    viewType: api.view.type
                  });
                }, 100);
              }
            }}
            className="px-3 py-2 text-sm font-medium text-[--foreground] bg-[--card] border border-[--border] rounded-lg hover:bg-[--accent] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <CalendarDatePicker
            currentDate={currentDate}
            currentView={currentView}
            onDateChange={handleDateChange}
          />
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleCalendarViewSwitch('dayGridMonth')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'dayGridMonth'
                ? 'bg-[--primary] text-[--primary-foreground]'
                : 'text-[--foreground] hover:bg-[--accent]'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => handleCalendarViewSwitch('timeGridWeek')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'timeGridWeek'
                ? 'bg-[--primary] text-[--primary-foreground]'
                : 'text-[--foreground] hover:bg-[--accent]'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => handleCalendarViewSwitch('timeGridDay')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'timeGridDay'
                ? 'bg-[--primary] text-[--primary-foreground]'
                : 'text-[--foreground] hover:bg-[--accent]'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => handleCalendarViewSwitch('listDay')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'listDay' || currentView === 'listWeek'
                ? 'bg-[--primary] text-[--primary-foreground]'
                : 'text-[--foreground] hover:bg-[--accent]'
            }`}
          >
            List
          </button>
          <button
            onClick={() => handleCalendarViewSwitch('map')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'map'
                ? 'bg-[--primary] text-[--primary-foreground]'
                : 'text-[--foreground] hover:bg-[--accent]'
            }`}
          >
            Map
          </button>
        </div>
      </div>

      {/* Custom day header for List view - always show */}
      {currentView === 'listDay' && (
        <div className="fc-list-day-cushion bg-white border-b border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
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
        <AppointmentMapView
          appointments={appointments}
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          onAppointmentClick={onEventClick}
          onAppointmentRightClick={onEventRightClick}
          height={height}
          searchFilters={mapNavigation.state.searchFilters}
          showClusters={true}
          enableClustering={true}
          className="rounded-lg"
        />
      ) : (
        <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={initialView}
        initialDate={currentDate}
        height={height}
        headerToolbar={false}
        timeZone="Asia/Dubai"
        timeZoneParam="Asia/Dubai"
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
        views={{
          dayGridMonth: {
            dayHeaderFormat: { weekday: 'long' }
          },
          timeGridWeek: {
            dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' }
          },
          timeGridDay: {
            dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' }
          },
          listWeek: {
            dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' },
            listDayFormat: { weekday: 'long', month: 'short', day: 'numeric' }
          },
          listDay: {
            dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' },
            listDayFormat: { weekday: 'long', month: 'short', day: 'numeric' }
          }
        }}
        fixedWeekCount={false}
        // Event settings
        events={events}
        editable={!!onEventDrop}
        eventResizable={!!onEventResize}
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
        viewDidMount={handleViewChange}
        viewDidUpdate={handleViewChange}
        datesSet={handleDatesSet}
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
          return (
            <div
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
      )}
    </div>
  );
}
