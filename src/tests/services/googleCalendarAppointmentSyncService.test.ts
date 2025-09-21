import type { PostgrestError } from '@supabase/supabase-js';

jest.mock('@/services/googleCalendarReconnectService', () => ({
  googleCalendarReconnectService: {
    handleSyncFailure: jest.fn(),
    resetFailureCount: jest.fn(),
  },
}));

const createEventMock = jest.fn();
const updateEventMock = jest.fn();
const deleteEventMock = jest.fn();
const buildEventPayloadMock = jest.fn().mockImplementation(payload => payload);

jest.mock('@/services/googleCalendarSyncService', () => ({
  GoogleCalendarSyncService: jest.fn().mockImplementation(() => ({
    buildEventPayload: buildEventPayloadMock,
    createEvent: createEventMock,
    updateEvent: updateEventMock,
    deleteEvent: deleteEventMock,
  })),
}));

jest.mock('@/services/loggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const appointmentUpdates: any[] = [];
const staffUpdates: any[] = [];

let appointmentRow: any;
let mockClient: any;

jest.mock('@/lib/supabase', () => ({
  getServiceRoleClient: jest.fn(() => mockClient),
}));

mockClient = {
  from: jest.fn((table: string) => {
    if (table === 'appointments') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(async () => ({ data: appointmentRow, error: null as PostgrestError | null })),
          })),
        })),
        update: jest.fn((payload: any) => {
          appointmentUpdates.push(payload);
          return {
            eq: jest.fn(async () => ({ data: null, error: null as PostgrestError | null })),
          };
        }),
      };
    }

    if (table === 'appointment_staff') {
      return {
        update: jest.fn((payload: any) => {
          staffUpdates.push(payload);
          return {
            eq: jest.fn(async () => ({ data: null, error: null as PostgrestError | null })),
          };
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  }),
};

const { GoogleCalendarAppointmentSyncService } = require('@/services/googleCalendarAppointmentSyncService') as typeof import('@/services/googleCalendarAppointmentSyncService');

jest
  .spyOn(GoogleCalendarAppointmentSyncService.prototype as any, 'buildEventPayload')
  .mockReturnValue({
    summary: 'Mock summary',
    start: { dateTime: '2025-02-20T09:00:00+04:00', timeZone: 'Asia/Dubai' },
    end: { dateTime: '2025-02-20T10:00:00+04:00', timeZone: 'Asia/Dubai' },
  });

describe('GoogleCalendarAppointmentSyncService', () => {
  const service = new GoogleCalendarAppointmentSyncService();

  beforeEach(() => {
    appointmentUpdates.length = 0;
    staffUpdates.length = 0;
    appointmentRow = {
      id: 'appt-1',
      appointment_type: 'doctor_on_call',
      appointment_date: '2025-02-20',
      start_time: '09:00',
      duration_minutes: 60,
      status: 'scheduled',
      notes: 'Bring kit',
      patient: {
        id: 'patient-1',
        name: 'Jane Doe',
        phone: '+97112345678',
        area: 'Downtown',
        city: 'Dubai',
        building_street: 'Main St',
        flat_villa_no: '12A',
      },
      appointment_staff: [
        {
          id: 'assign-1',
          staff_id: 'staff-1',
          role: 'primary',
          is_primary: true,
          gc_event_id: null,
          staff: {
            id: 'staff-1',
            first_name: 'Alice',
            last_name: 'Smith',
            email: 'alice@example.com',
            gc_calendar_id: 'alice@example.com',
            gc_is_connected: true,
            gc_sync_enabled: true,
          },
        },
      ],
    };

    createEventMock.mockResolvedValue({ success: true, eventId: 'evt_created' });
    updateEventMock.mockResolvedValue({ success: true, eventId: 'evt_updated' });
    deleteEventMock.mockResolvedValue({ success: true });
    buildEventPayloadMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates Google Calendar events when staff assigned', async () => {
    await service.handleStaffAssigned('appt-1', 'staff-1');

    expect(createEventMock).toHaveBeenCalledTimes(1);
    expect(staffUpdates[0]).toMatchObject({
      gc_event_id: 'evt_created',
      gc_sync_status: 'synced',
    });
    expect(appointmentUpdates).toContainEqual(expect.objectContaining({ gc_event_id: 'evt_created' }));
  });

  it('deletes Google Calendar events on cancellation', async () => {
    appointmentRow.appointment_staff[0].gc_event_id = 'evt_existing';

    await service.handleAppointmentCancelled('appt-1');

    expect(deleteEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 'appt-1', staffId: 'staff-1' }),
      'evt_existing',
    );
    expect(staffUpdates[0]).toMatchObject({ gc_event_id: null });
  });
});
