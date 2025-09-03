'use client';

import { AppointmentCalendar } from '@/components/calendar';
import { AppointmentFilters, type AppointmentFilterState } from '@/components/filters';
import Header from '@/components/layout/Header';
import { AppointmentContextMenu, AppointmentDetailsDrawer, AppointmentModal, CopyAppointmentModal } from '@/components/modals';
import { ErrorMessage, VirtualizedTable, type VirtualizedTableColumn } from '@/components/ui';
import { ExternalEditBanner } from '@/components/ui/ExternalEditNotification';
import { ExternalEditNotificationContainer } from '@/components/ui/ExternalEditNotificationContainer';
import { useToastContext } from '@/components/ui/ToastContainer';
import { useAppointmentsForDateRange, useUpdateAppointment } from '@/hooks/useAppointments';
import { createAppointmentShortcuts, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePatients } from '@/hooks/usePatients';
import { useStaff } from '@/hooks/useStaff';
import type { Appointment } from '@/types';
import { utcToDateString, utcToTimeString } from '@/utils/timezone';
import {
    Calendar,
    CheckCircle,
    Clock,
    Grid3X3,
    List,
    MoreHorizontal,
    Plus,
    Search,
    XCircle,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

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

  // Debounced refetch to avoid excessive API calls
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { updateAppointmentTime } = useUpdateAppointment();

  // Focus search input function
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  // Page-specific keyboard shortcuts
  const appointmentShortcuts = createAppointmentShortcuts(setViewMode, focusSearch);

  useKeyboardShortcuts({
    shortcuts: appointmentShortcuts,
    enabled: true,
    ignoreInputs: true,
  });

  // Fetch real appointment data for the calendar
  const {
    appointments: realAppointments,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useAppointmentsForDateRange(
    new Date(new Date().setMonth(new Date().getMonth() - 1)), // 1 month ago
    new Date(new Date().setMonth(new Date().getMonth() + 2)),   // 2 months ahead
  );

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
        await refetchAppointments();
      } catch (error) {
        console.error('Failed to refresh appointments:', error);
      }
    }, 300); // 300ms debounce
  }, [refetchAppointments]);

  // Drag-and-drop handlers
  const handleEventDrop = async (appointmentId: string, newStart: Date, newEnd: Date) => {
    try {
      // Get appointment type from the event data for validation
      const appointmentType = getAppointmentTypeFromEvent(appointmentId);
      await updateAppointmentTime(appointmentId, newStart, newEnd, appointmentType);
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

  // Helper function to get appointment type from event (this would need to be implemented based on your data structure)
  const getAppointmentTypeFromEvent = (_appointmentId: string): string | undefined => {
    // For now, we'll return undefined to skip validation
    // In a real implementation, you'd look up the appointment type from the event data
    // This could be stored in the event's extendedProps or fetched from the appointment data
    return undefined;
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
    // TODO: Open edit modal
    showNotification('success', `Edit appointment: ${appointment.id}`);
    // Refresh calendar data after edit
    await debouncedRefetch();
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

  const handleOpenInGoogleCalendar = (appointment: Appointment) => {
    // TODO: Open Google Calendar URL
    showNotification('success', `Open in Google Calendar: ${appointment.id}`);
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

  const handleOpenInGoogleCalendarFromDrawer = (appointment: Appointment) => {
    handleCloseDetailsDrawer();
    handleOpenInGoogleCalendar(appointment);
  };

  const handleDeleteAppointment = async (appointment: Appointment) => {
    // TODO: Implement delete logic
    showNotification('success', `Delete appointment: ${appointment.id}`);
    // Refresh calendar data after delete
    await debouncedRefetch();
  };

  // Modal handlers
  const handleOpenAppointmentModal = () => {
    setSelectedDate(null);
    setIsAppointmentModalOpen(true);
  };

  const handleCloseAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setSelectedDate(null);
  };

  const handleAppointmentModalSuccess = async () => {
    showNotification('success', 'Appointment created successfully');
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
    // Debug logging to understand the time conversion
    console.log('Calendar date selection:', {
      startUTC: start.toISOString(),
      endUTC: end.toISOString(),
      startLocal: start.toString(),
      endLocal: end.toString(),
      appointmentDate: utcToDateString(start),
      startTime: utcToTimeString(start),
      // Also try direct formatting for comparison
      directDate: start.toISOString().split('T')[0],
      directTime: start.toTimeString().slice(0, 5),
    });

    setSelectedDate({ start, end });
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
      render: (appointment) => (
        <div>
          <p className="text-sm text-[--foreground] font-medium">{appointment.start_time}</p>
          <p className="text-xs text-[--muted-foreground]">{appointment.appointment_date}</p>
        </div>
      ),
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
      <main className="px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[--foreground]">Appointments</h1>
            <p className="text-[--muted-foreground] text-lg mt-1">Schedule and manage patient appointments</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex items-center bg-[--muted] rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[--primary] text-[--primary-foreground]'
                    : 'text-[--muted-foreground] hover:text-[--foreground]'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </button>
            </div>
            <button
              onClick={handleOpenAppointmentModal}
              className="inline-flex items-center px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Total Appointments</p>
                <p className="text-3xl font-bold text-[--foreground]">
                  {isLoadingAppointments ? '...' : realAppointments.length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-[--medical-blue]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Scheduled</p>
                <p className="text-3xl font-bold text-[--foreground]">
                  {isLoadingAppointments ? '...' : realAppointments.filter(a => a.status === 'scheduled').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-[--warning]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Completed</p>
                <p className="text-3xl font-bold text-[--foreground]">
                  {isLoadingAppointments ? '...' : realAppointments.filter(a => a.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-[--success]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Cancelled</p>
                <p className="text-3xl font-bold text-[--foreground]">
                  {isLoadingAppointments ? '...' : realAppointments.filter(a => a.status === 'cancelled').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-[--error]" />
            </div>
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

        {/* External Edit Banner */}
        <ExternalEditBanner
          appointments={realAppointments}
        />

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <AppointmentCalendar
              initialView="timeGridWeek"
              height={600}
              onEventClick={handleOpenDetailsDrawer}
              onEventRightClick={handleEventRightClick}
              onDateSelect={handleCalendarDateSelect}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              filters={filters}
            />
          </div>
        )}

        {/* Search and filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search appointments..."
                  className="w-full pl-10 pr-4 py-3 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] placeholder-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <AppointmentFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            staffOptions={staffOptions}
          />
        </div>

        {/* Virtualized Appointments Table */}
        {viewMode === 'table' && (
          <VirtualizedTable
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
            onOpenInGoogleCalendar={handleOpenInGoogleCalendar}
            onDelete={handleDeleteAppointment}
          />
        )}

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={handleCloseAppointmentModal}
          onSuccess={handleAppointmentModalSuccess}
          initialAppointment={selectedDate ? {
            appointment_date: utcToDateString(selectedDate.start),
            start_time: utcToTimeString(selectedDate.start),
            duration_minutes: Math.round((selectedDate.end.getTime() - selectedDate.start.getTime()) / (1000 * 60)),
          } : undefined}
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
          onOpenInGoogleCalendar={handleOpenInGoogleCalendarFromDrawer}
        />

        {/* External Edit Notifications */}
        <ExternalEditNotificationContainer appointments={realAppointments} />
      </main>
    </div>
  );
}
