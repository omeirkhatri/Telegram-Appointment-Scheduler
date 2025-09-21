'use client';

import { AppointmentCalendar } from '@/components/features/appointments/calendar';
import { AppointmentFilters, type AppointmentFilterState } from '@/components/features/appointments/filters';
import Header from '@/components/layout/Header';
import { AppointmentContextMenu, AppointmentDetailsDrawer, AppointmentModal, CopyAppointmentModal, RecurringAppointmentDeleteModal, RecurringAppointmentEditModal } from '@/components/features/appointments';
import { ErrorMessage, VirtualizedTable, type VirtualizedTableColumn } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import { useAppointmentsForDateRange, useUpdateAppointment } from '@/hooks/useAppointments';
import { useAppointmentStaffForDateRange } from '@/hooks/useAppointmentStaff';
import { createAppointmentShortcuts, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePatients } from '@/hooks/usePatients';
import { useStaff } from '@/hooks/useStaff';
import type { Appointment } from '@/types';
import { formatTimeToHHMM, getCurrentDubaiTime } from '@/utils/timezone';
import {
    Grid3X3,
    List,
    MoreHorizontal,
    Plus,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';


export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const { showToast } = useToastContext();
  const [filters, setFilters] = useState<AppointmentFilterState>({});
  const [contextMenu, setContextMenu] = useState<{
    appointment: Appointment;
    position: { x: number; y: number };
  } | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceAppointment, setCopySourceAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<{ start: Date; end: Date } | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isRecurringEditModalOpen, setIsRecurringEditModalOpen] = useState(false);
  const [recurringEditAppointment, setRecurringEditAppointment] = useState<Appointment | null>(null);
  const [pendingRecurringUpdate, setPendingRecurringUpdate] = useState<{
    appointment: Appointment;
    updateData: any;
  } | null>(null);
  const [isRecurringDeleteModalOpen, setIsRecurringDeleteModalOpen] = useState(false);
  const [recurringDeleteAppointment, setRecurringDeleteAppointment] = useState<Appointment | null>(null);

  // Debounced refetch to avoid excessive API calls
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { updateAppointmentTime } = useUpdateAppointment();

  // Page-specific keyboard shortcuts
  const appointmentShortcuts = createAppointmentShortcuts(setViewMode, () => {});

  useKeyboardShortcuts({
    shortcuts: appointmentShortcuts,
    enabled: true,
    ignoreInputs: true,
  });

  // Calculate date range on client side to avoid hydration mismatches
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    // Only calculate dates on client side
    if (typeof window !== 'undefined') {
      const now = getCurrentDubaiTime();
      setDateRange({
        start: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
        end: new Date(now.getFullYear(), now.getMonth() + 2, now.getDate())
      });
    }
  }, []);

  // Create stable default dates to prevent infinite loops
  const defaultStartDate = useMemo(() => {
    const now = getCurrentDubaiTime();
    return new Date(now.getFullYear(), 0, 1);
  }, []);
  const defaultEndDate = useMemo(() => {
    const now = getCurrentDubaiTime();
    return new Date(now.getFullYear(), 11, 31);
  }, []);

  // Fetch real appointment data for the calendar - only when dateRange is available
  const {
    appointments: allAppointments,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useAppointmentsForDateRange(
    dateRange?.start || defaultStartDate,
    dateRange?.end || defaultEndDate
  );

  // Fetch staff assignments for the same date range
  const {
    staffAssignments,
    isLoading: isLoadingStaffAssignments,
    error: staffAssignmentsError,
    refetch: refetchStaffAssignments,
  } = useAppointmentStaffForDateRange(
    dateRange?.start || defaultStartDate,
    dateRange?.end || defaultEndDate
  );

  // Apply multiselect filters on the client side
  const realAppointments = useMemo(() => {
    let filtered = allAppointments;

    console.log('Filtering appointments:', {
      totalAppointments: allAppointments.length,
      filters,
      appointmentTypes: allAppointments.map(a => a.appointment_type)
    });

    // Filter by staff (if any staff selected)
    if (filters.staffIds && filters.staffIds.length > 0) {
      console.log('Filtering by staff IDs:', filters.staffIds);
      const beforeCount = filtered.length;

      // Get appointment IDs that have any of the selected staff assigned
      const appointmentIdsWithSelectedStaff = new Set(
        staffAssignments
          .filter(assignment => filters.staffIds!.includes(assignment.staff_id))
          .map(assignment => assignment.appointment_id)
      );

      filtered = filtered.filter(appointment =>
        appointmentIdsWithSelectedStaff.has(appointment.id)
      );

      console.log(`Staff filter: ${beforeCount} -> ${filtered.length}`);
    }

    // Filter by appointment types (if any types selected)
    if (filters.appointmentTypes && filters.appointmentTypes.length > 0) {
      console.log('Filtering by appointment types:', filters.appointmentTypes);
      const beforeCount = filtered.length;
      filtered = filtered.filter(appointment =>
        filters.appointmentTypes!.includes(appointment.appointment_type)
      );
      console.log(`Appointment type filter: ${beforeCount} -> ${filtered.length}`);
    }

    // Filter by statuses (if any statuses selected)
    if (filters.statuses && filters.statuses.length > 0) {
      console.log('Filtering by statuses:', filters.statuses);
      const beforeCount = filtered.length;
      filtered = filtered.filter(appointment =>
        filters.statuses!.includes(appointment.status)
      );
      console.log(`Status filter: ${beforeCount} -> ${filtered.length}`);
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(appointment => appointment.appointment_date >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(appointment => appointment.appointment_date <= filters.dateTo!);
    }

    console.log('Final filtered appointments:', filtered.length);
    return filtered;
  }, [allAppointments, filters, staffAssignments]);


  // Fetch patients and staff data for the modal
  const {
    patients,
    isLoading: isLoadingPatients,
    error: patientsError,
  } = usePatients({ autoFetch: true });

  const {
    staff,
    isLoading: isLoadingStaff,
    error: staffError,
  } = useStaff({ autoFetch: true });

  // Notification handlers
  const showNotification = (type: 'success' | 'error', message: string) => {
    showToast({
      type,
      title: type === 'success' ? 'Success' : 'Error',
      message,
    });
  };

  // Debounced refetch function to avoid excessive API calls
  const debouncedRefetch = useCallback(async () => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }

    refetchTimeoutRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          refetchAppointments(),
          refetchStaffAssignments()
        ]);
      } catch (error) {
        console.error('Failed to refresh appointments:', error);
      }
    }, 300); // 300ms debounce
  }, [refetchAppointments, refetchStaffAssignments]);

  // Drag-and-drop handlers
  const handleEventDrop = async (appointmentId: string, newStart: Date, newEnd: Date) => {
    try {
      // Get appointment type and original duration from the event data for validation
      const appointmentType = getAppointmentTypeFromEvent(appointmentId);
      const originalAppointment = allAppointments.find((apt: Appointment) => apt.id === appointmentId);
      const originalDuration = originalAppointment?.duration_minutes;

      await updateAppointmentTime(appointmentId, newStart, newEnd, appointmentType, originalDuration);
      showNotification('success', 'Appointment rescheduled successfully');
      // Refresh calendar data with debounce
      await debouncedRefetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reschedule appointment';
      showNotification('error', errorMessage);
      throw error; // Re-throw to trigger revert in calendar
    }
  };

  const handleEventResize = async (appointmentId: string, newStart: Date, newEnd: Date) => {
    try {
      // Get appointment type from the event data for validation
      const appointmentType = getAppointmentTypeFromEvent(appointmentId);
      // For resize operations, we want to use the new duration calculated from the resize
      await updateAppointmentTime(appointmentId, newStart, newEnd, appointmentType);
      showNotification('success', 'Appointment duration updated successfully');
      // Refresh calendar data with debounce
      await debouncedRefetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update appointment duration';
      showNotification('error', errorMessage);
      throw error; // Re-throw to trigger revert in calendar
    }
  };

  // Helper function to get appointment type from event
  const getAppointmentTypeFromEvent = (appointmentId: string): string | undefined => {
    // Find the appointment in the current appointments list
    const appointment = allAppointments.find((apt: Appointment) => apt.id === appointmentId);
    return appointment?.appointment_type;
  };

  // Filter handlers
  const handleFiltersChange = (newFilters: AppointmentFilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  // Context menu handlers
  const handleEventRightClick = (appointment: Appointment, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      appointment,
      position: { x: event.clientX, y: event.clientY },
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleEditAppointment = async (appointment: Appointment) => {
    console.log('Edit appointment clicked:', appointment);

    // Always open the regular AppointmentModal for editing
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const handleCopyAppointment = async (appointment: Appointment) => {
    setCopySourceAppointment(appointment);
    setIsCopyModalOpen(true);
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    // TODO: Implement cancel logic
    showNotification('success', `Cancel appointment: ${appointment.id}`);
    // Refresh calendar data after cancel
    await debouncedRefetch();
  };

  // Handle recurring appointment update
  const handleRecurringAppointmentUpdate = async (
    updateType: 'this_occurrence' | 'all_future' | 'until_date',
    _updateData: any,
    untilDate?: string
  ) => {
    if (!pendingRecurringUpdate) return;

    try {
      // Extract base appointment ID and occurrence number
      let appointmentId = pendingRecurringUpdate.appointment.id;
      let occurrenceNumber: number | undefined;

      if (appointmentId.includes('_occurrence_')) {
        // This is a virtual appointment - extract base ID and occurrence number
        const parts = appointmentId.split('_occurrence_');
        appointmentId = parts[0];
        occurrenceNumber = parseInt(parts[1], 10);
      } else {
        // This is a real appointment - get occurrence number from custom_fields
        occurrenceNumber = (pendingRecurringUpdate.appointment.custom_fields as any)?.occurrence_number;
      }

      const requestBody: any = {
        updateType,
        occurrenceNumber,
        updateData: pendingRecurringUpdate.updateData,
      };

      // Add until date if specified
      if (updateType === 'until_date' && untilDate) {
        requestBody.untilDate = untilDate;
      }

      const response = await fetch(`/api/appointments/${appointmentId}/recurring`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update recurring appointment');
      }

      showNotification('success', 'Recurring appointment updated successfully');
      await refetchAppointments();

      // Close both modals
      setIsRecurringEditModalOpen(false);
      setRecurringEditAppointment(null);
      setPendingRecurringUpdate(null);
      setIsAppointmentModalOpen(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Error updating recurring appointment:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to update recurring appointment');
    }
  };

  // Handle recurring appointment deletion
  const handleRecurringAppointmentDelete = async (
    deleteType: 'this_occurrence' | 'all_future'
  ) => {
    if (!recurringDeleteAppointment) return;

    console.log('Frontend: handleRecurringAppointmentDelete called with:', {
      appointment: recurringDeleteAppointment,
      deleteType
    });

    try {
      // Extract base appointment ID and occurrence number
      let appointmentId = recurringDeleteAppointment.id;
      let occurrenceNumber: number | undefined;

      if (appointmentId.includes('_occurrence_')) {
        // This is a virtual appointment - extract base ID and occurrence number
        const parts = appointmentId.split('_occurrence_');
        if (parts.length !== 2) {
          throw new Error('Invalid virtual appointment ID format');
        }
        appointmentId = parts[0];
        occurrenceNumber = parseInt(parts[1], 10);
        
        // Validate that the occurrence number was parsed correctly
        if (isNaN(occurrenceNumber)) {
          throw new Error('Invalid occurrence number in virtual appointment ID');
        }
      } else {
        // This is a real appointment - get occurrence number from custom_fields
        occurrenceNumber = (recurringDeleteAppointment.custom_fields as any)?.occurrence_number;
        
      }

      // For "this_occurrence" deletion in multi-row system, we don't need occurrence numbers
      // Just delete the specific appointment directly
      if (deleteType === 'this_occurrence') {
        console.log('This occurrence deletion - setting occurrenceNumber to undefined for multi-row system');
        occurrenceNumber = undefined; // Always allow deletion without occurrence number
      }

      const requestBody = {
        deleteType,
        occurrenceNumber,
      };

      console.log('Frontend: Making API request to:', `/api/appointments/${appointmentId}/recurring`);
      console.log('Frontend: Request body:', requestBody);

      const response = await fetch(`/api/appointments/${appointmentId}/recurring`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete recurring appointment');
      }

      const message = deleteType === 'this_occurrence'
        ? 'Appointment occurrence deleted successfully'
        : 'Recurring appointment series deleted successfully';

      showNotification('success', message);
      await refetchAppointments();
    } catch (error) {
      console.error('Error deleting recurring appointment:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to delete recurring appointment');
    }
  };


  // Drawer handlers
  const handleOpenDetailsDrawer = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsDrawerOpen(true);
  };

  const handleCloseDetailsDrawer = () => {
    setIsDetailsDrawerOpen(false);
    setSelectedAppointment(null);
  };

  const handleEditFromDrawer = (appointment: Appointment) => {
    handleCloseDetailsDrawer();
    handleEditAppointment(appointment);
  };

  const handleCopyFromDrawer = (appointment: Appointment) => {
    handleCloseDetailsDrawer();
    handleCopyAppointment(appointment);
  };

  const handleDeleteFromDrawer = (appointment: Appointment) => {
    handleCloseDetailsDrawer();
    handleDeleteAppointment(appointment);
  };


  const handleDeleteAppointment = async (appointment: Appointment) => {
    console.log('Frontend: handleDeleteAppointment called with:', {
      appointment: {
        id: appointment.id,
        recurring_rule: appointment.recurring_rule,
        custom_fields: appointment.custom_fields
      }
    });

    // Check if this is a recurring appointment
    const isRecurring = appointment.recurring_rule ||
                       (appointment.custom_fields as any)?.is_recurring_generated ||
                       (appointment.custom_fields as any)?.is_recurring_occurrence ||
                       appointment.id.includes('_occurrence_');

    console.log('Frontend: Recurring detection result:', {
      isRecurring,
      hasRecurringRule: !!appointment.recurring_rule,
      isRecurringGenerated: !!(appointment.custom_fields as any)?.is_recurring_generated,
      isRecurringOccurrence: !!(appointment.custom_fields as any)?.is_recurring_occurrence,
      hasOccurrenceInId: appointment.id.includes('_occurrence_')
    });

    if (isRecurring) {
      console.log('Frontend: Setting recurring delete appointment');
      setRecurringDeleteAppointment(appointment);
      setIsRecurringDeleteModalOpen(true);
    } else {
      // Handle regular appointment deletion
      try {
        const response = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          let errorMessage = 'Failed to delete appointment';

          try {
            // Try to parse as JSON first
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            // If JSON parsing fails, get the text response
            try {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            } catch (textError) {
              // If both fail, use the status text
              errorMessage = response.statusText || errorMessage;
            }
          }

          throw new Error(errorMessage);
        }

        showNotification('success', 'Appointment deleted successfully');
        // Refresh calendar data immediately after delete
        await refetchAppointments();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        showNotification('error', error instanceof Error ? error.message : 'Failed to delete appointment');
      }
    }
  };

  // Modal handlers
  const handleOpenAppointmentModal = () => {
    console.log('New appointment button clicked');
    setSelectedDate(null);
    setIsAppointmentModalOpen(true);
  };

  const handleCloseAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setSelectedDate(null);
    setEditingAppointment(null);
  };

  const handleAppointmentModalSuccess = async (updateData?: any) => {
    if (editingAppointment) {
      // Check if this is a recurring appointment
      const isRecurring = editingAppointment.recurring_rule ||
                         (editingAppointment.custom_fields as any)?.is_recurring_generated ||
                         (editingAppointment.custom_fields as any)?.is_recurring_occurrence;

      if (isRecurring) {
        // Store the update data and show scope selection modal
        setPendingRecurringUpdate({
          appointment: editingAppointment,
          updateData: updateData || {}
        });
        setRecurringEditAppointment(editingAppointment);
        setIsRecurringEditModalOpen(true);
        return; // Don't close the modal yet
      }
    }

    const message = editingAppointment ? 'Appointment updated successfully' : 'Appointment created successfully';
    showNotification('success', message);
    // Refresh calendar data with debounce
    await debouncedRefetch();
  };

  // Copy modal handlers
  const handleCloseCopyModal = () => {
    setIsCopyModalOpen(false);
    setCopySourceAppointment(null);
  };

  const handleCopyModalSuccess = async () => {
    showNotification('success', 'Appointment copied successfully');
    // Refresh calendar data with debounce
    await debouncedRefetch();
  };

  const handleCalendarDateSelect = (start: Date, end: Date) => {
    // ⚠️  CRITICAL: DO NOT CHANGE THIS TIMEZONE HANDLING - IT'S WORKING CORRECTLY NOW ⚠️
    // ⚠️  This code handles the 4-hour timezone offset for new appointments ⚠️
    // ⚠️  It ensures times before 4 AM stay on the same day ⚠️
    // ⚠️  CHANGING THIS WILL BREAK APPOINTMENT CREATION - DO NOT TOUCH! ⚠️

    // FullCalendar with timeZone="Asia/Dubai" provides dates in Dubai timezone
    // Need to subtract 4 hours but keep the same day
    const adjustedStart = new Date(start.getTime() - (4 * 60 * 60 * 1000)); // Subtract 4 hours
    const adjustedEnd = new Date(end.getTime() - (4 * 60 * 60 * 1000)); // Subtract 4 hours

    // If the adjusted time is before 4 AM, it means we went to previous day
    // Add 24 hours to keep it on the same day as the original selection
    if (adjustedStart.getHours() < 4) {
      adjustedStart.setTime(adjustedStart.getTime() + (24 * 60 * 60 * 1000));
      adjustedEnd.setTime(adjustedEnd.getTime() + (24 * 60 * 60 * 1000));
    }

    console.log('Calendar date selection:', {
      startUTC: start.toISOString(),
      endUTC: end.toISOString(),
      startLocal: start.toString(),
      endLocal: end.toString(),
      timezoneOffset: start.getTimezoneOffset(),
      // Use adjusted time to fix 4-hour gap
      appointmentDate: adjustedStart.toISOString().split('T')[0],
      startTime: adjustedStart.toTimeString().slice(0, 5),
    });

    setSelectedDate({ start: adjustedStart, end: adjustedEnd });
    setIsAppointmentModalOpen(true);
  };

  // Use real staff data for filters
  const staffOptions = staff.map(s => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    staff_type: s.staff_type,
  }));

  // Define columns for virtualized appointments table
  const appointmentColumns: VirtualizedTableColumn<Appointment>[] = [
    {
      key: 'time',
      header: 'Time',
      width: 150,
      render: (appointment) => {
        // Calculate end time
        const formattedStartTime = formatTimeToHHMM(appointment.start_time);
        const [startHours, startMinutes] = formattedStartTime.split(':').map(Number);
        const endMinutes = startMinutes + appointment.duration_minutes;
        const endHours = startHours + Math.floor(endMinutes / 60);
        const finalEndMinutes = endMinutes % 60;
        const endTimeString = `${endHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}`;

        return (
          <div>
            <p className="text-sm text-[--foreground] font-medium">{formattedStartTime} - {endTimeString}</p>
            <p className="text-xs text-[--muted-foreground]">{appointment.appointment_date}</p>
          </div>
        );
      },
    },
    {
      key: 'patient',
      header: 'Patient',
      width: 200,
      render: (appointment) => {
        const patient = patients.find(p => p.id === appointment.patient_id);
        const patientName = patient ? `${patient.name}` : 'Unknown Patient';
        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[--muted] rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-[--muted-foreground]">
                {patientName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <span className="text-sm text-[--foreground]">{patientName}</span>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      width: 150,
      render: (appointment) => (
        <span className="text-sm text-[--foreground]">
          {appointment.appointment_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      width: 100,
      render: (appointment) => (
        <span className="text-sm text-[--foreground]">
          {appointment.duration_minutes} min
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (appointment) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          appointment.status === 'confirmed' ? 'bg-[--success]/10 text-[--success]' :
          appointment.status === 'scheduled' ? 'bg-[--warning]/10 text-[--warning]' :
          appointment.status === 'cancelled' ? 'bg-[--error]/10 text-[--error]' :
          appointment.status === 'completed' ? 'bg-[--primary]/10 text-[--primary]' :
          'bg-[--muted] text-[--muted-foreground]'
        }`}>
          {appointment.status}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      width: 200,
      render: (appointment) => (
        <span className="text-sm text-[--foreground]">
          {appointment.notes || 'No notes'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 100,
      render: () => (
        <button className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* Header with Navigation */}
      <Header currentPage="appointments" />


      {/* Main Content - Full Width */}
      <main className="px-8 py-8 space-y-4">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-6">
          {/* Left side - Filters */}
          <div className="flex-1" style={{ maxWidth: '108rem' }}>
            <AppointmentFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              staffOptions={staffOptions}
            />
          </div>
          
          {/* Right side - View Toggle and New Appointment */}
          <div className="flex flex-col items-end space-y-3 flex-shrink-0">
            {/* View Toggle */}
            <div className="flex items-center bg-[--muted] rounded-lg p-1 w-full">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 ${
                  viewMode === 'calendar'
                    ? 'bg-[--primary] text-[--primary-foreground]'
                    : 'text-[--muted-foreground] hover:text-[--foreground]'
                }`}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 ${
                  viewMode === 'table'
                    ? 'bg-[--primary] text-[--primary-foreground]'
                    : 'text-[--muted-foreground] hover:text-[--foreground]'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </button>
            </div>
            
            {/* New Appointment Button */}
            <button
              onClick={handleOpenAppointmentModal}
              className="inline-flex items-center justify-center px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </button>
          </div>
        </div>



        {/* Appointments Error */}
        {appointmentsError && (
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <ErrorMessage
              error={`Failed to load appointments: ${appointmentsError}`}
              variant="inline"
            />
          </div>
        )}



        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <AppointmentCalendar
              key={`calendar-${viewMode}`}
              initialView="timeGridWeek"
              height="calc(100vh - 300px)"
              appointments={realAppointments}
              isLoading={isLoadingAppointments}
              error={appointmentsError}
              refetch={refetchAppointments}
              onEventClick={handleOpenDetailsDrawer}
              onEventRightClick={handleEventRightClick}
              onDateSelect={handleCalendarDateSelect}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              filters={{
                appointmentType: filters.appointmentTypes?.[0],
                status: filters.statuses?.[0],
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                staffId: filters.staffIds?.[0]
              }}
            />
          </div>
        )}

        {/* Virtualized Appointments Table */}
        {viewMode === 'table' && (
          <VirtualizedTable
            key={`table-${viewMode}`}
            data={realAppointments}
            columns={appointmentColumns}
            height={600}
            itemHeight={80}
            loading={isLoadingAppointments}
            loadingMessage="Loading appointments..."
            emptyMessage="No appointments found"
            onRowClick={handleOpenDetailsDrawer}
            getRowKey={(appointment) => appointment.id}
            enableKeyboardNavigation={true}
          />
        )}

        {/* Context Menu */}
        {contextMenu && (
          <AppointmentContextMenu
            appointment={contextMenu.appointment}
            position={contextMenu.position}
            onClose={handleCloseContextMenu}
            onEdit={handleEditAppointment}
            onCopy={handleCopyAppointment}
            onCancel={handleCancelAppointment}
            onDelete={handleDeleteAppointment}
          />
        )}

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={handleCloseAppointmentModal}
          onSuccess={handleAppointmentModalSuccess}
          initialAppointment={editingAppointment || (selectedDate ? {
            appointment_date: selectedDate.start.toISOString().split('T')[0],
            start_time: selectedDate.start.toTimeString().slice(0, 5),
            duration_minutes: Math.round((selectedDate.end.getTime() - selectedDate.start.getTime()) / (1000 * 60)),
          } : undefined)}
          patients={patients}
          staff={staff}
          isLoadingPatients={isLoadingPatients}
          isLoadingStaff={isLoadingStaff}
          patientsError={patientsError}
          staffError={staffError}
        />

        {/* Copy Appointment Modal */}
        {copySourceAppointment && (
          <CopyAppointmentModal
            isOpen={isCopyModalOpen}
            onClose={handleCloseCopyModal}
            onSuccess={handleCopyModalSuccess}
            sourceAppointment={copySourceAppointment}
            patients={patients}
            staff={staff}
            isLoadingPatients={isLoadingPatients}
            isLoadingStaff={isLoadingStaff}
            patientsError={patientsError}
            staffError={staffError}
          />
        )}

        {/* Appointment Details Drawer */}
        <AppointmentDetailsDrawer
          isOpen={isDetailsDrawerOpen}
          onClose={handleCloseDetailsDrawer}
          appointment={selectedAppointment}
          patient={selectedAppointment ? patients.find(p => p.id === selectedAppointment.patient_id) : null}
          staff={staff}
          onEdit={handleEditFromDrawer}
          onCopy={handleCopyFromDrawer}
          onDelete={handleDeleteFromDrawer}
        />

        {/* Recurring Appointment Edit Modal */}
        {recurringEditAppointment && (
          <RecurringAppointmentEditModal
            appointment={recurringEditAppointment}
            isOpen={isRecurringEditModalOpen}
            onClose={() => {
              setIsRecurringEditModalOpen(false);
              setRecurringEditAppointment(null);
            }}
            onUpdate={handleRecurringAppointmentUpdate}
          />
        )}

        {/* Recurring Appointment Delete Modal */}
        {recurringDeleteAppointment && (
          <RecurringAppointmentDeleteModal
            appointment={recurringDeleteAppointment}
            isOpen={isRecurringDeleteModalOpen}
            onClose={() => {
              setIsRecurringDeleteModalOpen(false);
              setRecurringDeleteAppointment(null);
            }}
            onDelete={handleRecurringAppointmentDelete}
          />
        )}

      </main>
    </div>
  );
}
