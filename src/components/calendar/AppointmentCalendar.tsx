'use client';

import { useAppointmentsForDateRange } from '@/hooks/useAppointments';
import type { Appointment } from '@/types';
import type { DateSelectArg, EventClickArg, EventDropArg, EventResizeArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useRef, useState } from 'react';

interface AppointmentCalendarProps {
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  height?: string | number;
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
  onEventClick,
  onEventRightClick,
  onDateSelect,
  onEventDrop,
  onEventResize,
  filters = {},
}: AppointmentCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get date range for current view
  const getDateRange = useCallback(() => {
    const calendar = calendarRef.current;
    if (!calendar) return { start: new Date(), end: new Date() };

    const view = calendar.view;
    return {
      start: view.activeStart,
      end: view.activeEnd,
    };
  }, []);

  const { start, end } = getDateRange();
  const { events, isLoading, error, refetch } = useAppointmentsForDateRange(start, end, filters);

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    if (onDateSelect) {
      onDateSelect(selectInfo.start, selectInfo.end);
    }
  }, [onDateSelect]);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const appointment = event.extendedProps.appointment as Appointment;

    if (onEventClick && appointment) {
      onEventClick(appointment);
    }
  }, [onEventClick]);

  const handleEventRightClick = useCallback((clickInfo: EventClickArg, nativeEvent: MouseEvent) => {
    const event = clickInfo.event;
    const appointment = event.extendedProps.appointment as Appointment;

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
      // Refetch events to ensure UI is in sync
      await refetch();
    } catch (error) {
      console.error('Failed to update appointment:', error);
      // Revert the event position
      dropInfo.revert();
    }
  }, [onEventDrop, refetch]);

  const handleEventResize = useCallback(async (resizeInfo: EventResizeArg) => {
    const event = resizeInfo.event;
    const appointmentId = event.id;
    const newStart = event.start!;
    const newEnd = event.end!;

    try {
      if (onEventResize) {
        await onEventResize(appointmentId, newStart, newEnd);
      }
      // Refetch events to ensure UI is in sync
      await refetch();
    } catch (error) {
      console.error('Failed to resize appointment:', error);
      // Revert the event size
      resizeInfo.revert();
    }
  }, [onEventResize, refetch]);

  const handleViewChange = useCallback(() => {
    const calendar = calendarRef.current;
    if (calendar) {
      setCurrentView(calendar.view.type);
      setCurrentDate(calendar.view.activeStart);
    }
  }, []);

  const handleDatesSet = useCallback(() => {
    // Refetch events when the visible date range changes
    refetch();
  }, [refetch]);

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
    <div className="bg-white rounded-lg shadow-sm border">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={initialView}
        height={height}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        buttonText={{
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          list: 'List'
        }}
        // Time and date settings
        slotDuration="00:15:00" // 15-minute slots
        slotLabelInterval="01:00:00" // Show hour labels
        slotMinTime="06:00:00" // Start at 6 AM
        slotMaxTime="22:00:00" // End at 10 PM
        timeZone="Asia/Dubai"
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
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
        }}
        viewDidMount={handleViewChange}
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
          return (
            <div className="p-1 text-xs">
              <div className="font-medium truncate">{eventInfo.event.title}</div>
              {appointment && (
                <div className="text-gray-600 truncate">
                  {appointment.patient_id} {/* You might want to show patient name instead */}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
