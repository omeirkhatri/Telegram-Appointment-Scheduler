import { NextRequest } from 'next/server';
import type { TimezoneResolution } from '@/types/timezone';

jest.mock('@/services/appointmentService', () => ({
  appointmentService: {
    getAppointments: jest.fn(),
  },
}));

jest.mock('@/services/timezoneContextService', () => ({
  getOrganizationTimezone: jest.fn(),
  getLocationTimezone: jest.fn(),
}));

const { appointmentService } = require('@/services/appointmentService');
const timezoneContextService = require('@/services/timezoneContextService');

function buildRequest(headers: Record<string, string>, url: string = 'http://localhost:3000/api/appointments') {
  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
}

describe('Appointments API version contract', () => {
  const baseAppointment = {
    id: 'appointment-1',
    patient_id: 'patient-1',
    appointment_type: 'doctor_on_call',
    appointment_date: '2025-09-24',
    start_time: '09:00',
    duration_minutes: 60,
    status: 'scheduled',
    created_at: '2025-09-24T05:00:00.000Z',
    updated_at: '2025-09-24T05:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (appointmentService.getAppointments as jest.Mock).mockResolvedValue([baseAppointment]);
    (timezoneContextService.getLocationTimezone as jest.Mock).mockResolvedValue({
      id: 'clinic-london',
      slug: 'clinic-london',
      displayName: 'Best DOC London',
      timezone: 'Europe/London',
      timezoneSource: 'location',
      isActive: true,
    });
    (timezoneContextService.getOrganizationTimezone as jest.Mock).mockResolvedValue({
      id: 'primary',
      displayName: 'Best DOC',
      defaultTimezone: 'Europe/London',
      metadata: null,
    });
  });

  it('includes timezone metadata and local_time for v1.1 opt-in requests', async () => {
    const { GET } = await import('./appointments/route');

    const request = buildRequest({
      'x-api-version': '1.1',
      'x-include-timezone-metadata': 'true',
      'x-location-id': 'clinic-london',
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.metadata?.apiVersion).toBe('1.1');
    expect(payload.metadata?.timezone).toEqual(
      expect.objectContaining<Partial<TimezoneResolution>>({
        timezone: 'Europe/London',
        abbreviation: expect.any(String),
      })
    );
    expect(payload.data?.[0].local_time).toEqual(
      expect.objectContaining({
        timezone: 'Europe/London',
        timezone_abbreviation: expect.any(String),
        offset_minutes: expect.any(Number),
      })
    );

    expect(response.headers.get('X-API-Version')).toBe('1.1');
    expect(response.headers.get('X-Features')).toContain('timezone-metadata');
  });

  it('omits timezone metadata when clients stick to legacy v1.0', async () => {
    const { GET } = await import('./appointments/route');

    const request = buildRequest({
      'x-api-version': '1.0',
      'x-include-timezone-metadata': 'true',
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.metadata?.apiVersion).toBe('1.0');
    expect(payload.metadata?.timezone).toBeUndefined();
    expect(payload.data?.[0].local_time).toBeUndefined();
    expect(response.headers.get('X-API-Version')).toBe('1.0');
  });
});
