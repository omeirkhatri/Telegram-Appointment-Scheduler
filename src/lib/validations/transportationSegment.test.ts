import {
  transportationSegmentFormSchema,
  transportationSegmentLocationSchema,
  transportationSegmentUpdateFormSchema,
} from './transportationSegment';

describe('Transportation Segment Form Schemas', () => {
  const basePayload = {
    appointment_id: '123e4567-e89b-12d3-a456-426614174000',
    segment_type: 'pickup' as const,
    title: 'Clinic pickup',
    planned_start: '2025-02-15T08:00:00Z',
    planned_end: '2025-02-15T08:45:00Z',
    driver_id: '923e4567-e89b-12d3-a456-426614174000',
    travel_mode: 'vehicle',
    origin: {
      lat: 25.2048,
      lng: 55.2708,
    },
    destination: {
      lat: 25.1972,
      lng: 55.2744,
    },
    estimated_travel_minutes: 30,
    buffer_minutes: 5,
    instructions: 'Bring wheelchair',
    requires_follow_up: true,
    status: 'scheduled' as const,
  };

  it('validates a fully populated payload', () => {
    const result = transportationSegmentFormSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('scheduled');
    }
  });

  it('defaults status to draft when omitted', () => {
    const { status, ...minimal } = basePayload;
    const result = transportationSegmentFormSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft');
    }
  });

  it('rejects when planned_end precedes planned_start', () => {
    const invalid = {
      ...basePayload,
      planned_end: '2025-02-15T07:30:00Z',
    };

    const result = transportationSegmentFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('allows clearing relationship fields with empty strings', () => {
    const payload = {
      appointment_id: basePayload.appointment_id,
      segment_type: basePayload.segment_type,
      driver_id: '',
      travel_mode: '',
    };

    const result = transportationSegmentFormSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('validates segment locations independently', () => {
    const locationResult = transportationSegmentLocationSchema.safeParse({
      lat: 25.2,
      lng: 55.27,
      address: 'Test address',
    });

    expect(locationResult.success).toBe(true);
  });

  it('supports partial updates without appointment metadata', () => {
    const updatePayload = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      status: 'completed' as const,
      manual_override: true,
    };

    const result = transportationSegmentUpdateFormSchema.safeParse(updatePayload);
    expect(result.success).toBe(true);
  });
});
