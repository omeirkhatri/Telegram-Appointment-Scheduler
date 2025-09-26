/**
 * Unit Tests for CalendarVerificationService
 *
 * Tests verification process, RSVP tracking, status management,
 * and error handling for calendar verification.
 */

import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import { CalendarVerificationService, resetCalendarVerificationService } from '@/services/calendarVerificationService';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/featureFlags');
jest.mock('@/lib/supabase');
jest.mock('@/services/googleCalendarService');

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            maybeSingle: jest.fn(),
          })),
        })),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => ({
          maybeSingle: jest.fn(),
        })),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

(supabase as any) = mockSupabase;

// Mock Google Calendar Service
const mockGoogleCalendarService = {
  createEvent: jest.fn(),
  deleteEvent: jest.fn(),
};

(getGoogleCalendarService as any) = jest.fn(() => mockGoogleCalendarService);

// Mock feature flags
(isFeatureEnabled as any) = jest.fn();

describe('CalendarVerificationService', () => {
  let service: CalendarVerificationService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    resetCalendarVerificationService();

    // Setup default mock implementations
    (isFeatureEnabled as any).mockReturnValue(true);
    mockGoogleCalendarService.createEvent.mockResolvedValue({
      success: true,
      eventId: 'test-event-id',
      eventUrl: 'https://calendar.google.com/event?eid=test-event-id',
    });
    mockGoogleCalendarService.deleteEvent.mockResolvedValue({
      success: true,
    });

    // Setup Supabase mocks
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'verification-event-123',
              staff_id: 'staff-123',
              google_calendar_id: 'test-calendar-id@group.calendar.google.com',
              google_event_id: 'test-event-id',
              attendee_email: 'john.smith@example.com',
              verification_status: 'created',
              verification_attempts: 1,
              max_verification_attempts: 3,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      })),
    });

    // Create service instance
    service = new CalendarVerificationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Verification Process', () => {
    it('should start verification successfully', async () => {
      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.startVerification(request);

      expect(result.success).toBe(true);
      expect(result.verificationStatus).toBe('pending');
      expect(result.verificationEventId).toBe('verification-event-123');
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledWith({
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        event_title: 'BestDOC Calendar Verification Test',
        event_description: expect.stringContaining('test event to verify your calendar access'),
        start_time: expect.any(String),
        end_time: expect.any(String),
        attendees: ['john.smith@example.com'],
      });
    });

    it('should return existing verification if already verified', async () => {
      // Mock existing verified verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'existing-verification-123',
                    verification_status: 'verified',
                    google_event_id: 'existing-event-id',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.startVerification(request);

      expect(result.success).toBe(true);
      expect(result.verificationStatus).toBe('verified');
      expect(result.verificationEventId).toBe('existing-verification-123');
      expect(mockGoogleCalendarService.createEvent).not.toHaveBeenCalled();
    });

    it('should return existing pending verification if not expired', async () => {
      // Mock existing pending verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'existing-verification-123',
                    verification_status: 'pending',
                    google_event_id: 'existing-event-id',
                    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.startVerification(request);

      expect(result.success).toBe(true);
      expect(result.verificationStatus).toBe('pending');
      expect(result.verificationEventId).toBe('existing-verification-123');
      expect(mockGoogleCalendarService.createEvent).not.toHaveBeenCalled();
    });

    it('should handle expired verification', async () => {
      // Mock expired verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'expired-verification-123',
                    verification_status: 'pending',
                    google_event_id: 'expired-event-id',
                    expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.startVerification(request);

      expect(result.success).toBe(false);
      expect(result.verificationStatus).toBe('failed');
      expect(result.errorCode).toBe('VERIFICATION_TIMEOUT');
    });

    it('should handle verification when feature is disabled', async () => {
      (isFeatureEnabled as any).mockReturnValue(false);

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.startVerification(request);

      expect(result.success).toBe(false);
      expect(result.verificationStatus).toBe('failed');
      expect(result.errorCode).toBe('VERIFICATION_EVENT_CREATION_FAILED');
    });

    it('should handle event creation failure', async () => {
      mockGoogleCalendarService.createEvent.mockResolvedValue({
        success: false,
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: 'Failed to create event',
      });

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.startVerification(request);

      expect(result.success).toBe(false);
      expect(result.verificationStatus).toBe('failed');
      expect(result.errorCode).toBe('CALENDAR_CREATION_FAILED');
    });
  });

  describe('Verification Status Checking', () => {
    it('should check verification status successfully', async () => {
      // Mock verification status
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'verification-123',
                    staff_id: 'staff-123',
                    google_calendar_id: 'test-calendar-id@group.calendar.google.com',
                    verification_status: 'pending',
                    verification_attempts: 1,
                    max_verification_attempts: 3,
                    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                    verified_at: null,
                    error_code: null,
                    error_message: null,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      const result = await service.checkVerificationStatus('staff-123');

      expect(result.staffId).toBe('staff-123');
      expect(result.googleCalendarId).toBe('test-calendar-id@group.calendar.google.com');
      expect(result.verificationStatus).toBe('pending');
      expect(result.attemptsRemaining).toBe(2);
    });

    it('should return not_required when no verification exists', async () => {
      // Mock no verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      const result = await service.checkVerificationStatus('staff-123');

      expect(result.staffId).toBe('staff-123');
      expect(result.googleCalendarId).toBe('');
      expect(result.verificationStatus).toBe('not_required');
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should handle expired verification in status check', async () => {
      // Mock expired verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'expired-verification-123',
                    staff_id: 'staff-123',
                    google_calendar_id: 'test-calendar-id@group.calendar.google.com',
                    verification_status: 'pending',
                    expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      const result = await service.checkVerificationStatus('staff-123');

      expect(result.staffId).toBe('staff-123');
      expect(result.verificationStatus).toBe('failed');
      expect(result.errorCode).toBe('VERIFICATION_TIMEOUT');
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should handle RSVP check failure', async () => {
      // Mock verification with RSVP check failure
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'verification-123',
                    staff_id: 'staff-123',
                    google_calendar_id: 'test-calendar-id@group.calendar.google.com',
                    verification_status: 'pending',
                    google_event_id: 'test-event-id',
                    verification_attempts: 1,
                    max_verification_attempts: 3,
                    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      const result = await service.checkVerificationStatus('staff-123');

      expect(result.staffId).toBe('staff-123');
      expect(result.verificationStatus).toBe('pending');
    });
  });

  describe('Verification Retry', () => {
    it('should retry verification successfully', async () => {
      // Mock existing verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'verification-123',
                    staff_id: 'staff-123',
                    google_calendar_id: 'test-calendar-id@group.calendar.google.com',
                    attendee_email: 'john.smith@example.com',
                    verification_status: 'failed',
                    verification_attempts: 1,
                    max_verification_attempts: 3,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      const result = await service.retryVerification('staff-123');

      expect(result.success).toBe(true);
      expect(result.verificationStatus).toBe('pending');
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalled();
    });

    it('should not retry if already verified', async () => {
      // Mock verified verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'verification-123',
                    verification_status: 'verified',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      const result = await service.retryVerification('staff-123');

      expect(result.success).toBe(true);
      expect(result.verificationStatus).toBe('verified');
      expect(mockGoogleCalendarService.createEvent).not.toHaveBeenCalled();
    });

    it('should not retry if max attempts exceeded', async () => {
      // Mock verification with max attempts exceeded
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'verification-123',
                    verification_status: 'failed',
                    verification_attempts: 3,
                    max_verification_attempts: 3,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      const result = await service.retryVerification('staff-123');

      expect(result.success).toBe(false);
      expect(result.verificationStatus).toBe('failed');
      expect(result.errorCode).toBe('VERIFICATION_TIMEOUT');
    });

    it('should handle retry when no verification exists', async () => {
      // Mock no verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      await expect(service.retryVerification('staff-123')).rejects.toThrow(
        'No verification found for staff member'
      );
    });
  });

  describe('Verification Cancellation', () => {
    it('should cancel verification successfully', async () => {
      // Mock existing verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'verification-123',
                    google_event_id: 'test-event-id',
                    google_calendar_id: 'test-calendar-id@group.calendar.google.com',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      const result = await service.cancelVerification('staff-123');

      expect(result.success).toBe(true);
      expect(mockGoogleCalendarService.deleteEvent).toHaveBeenCalledWith(
        'test-calendar-id@group.calendar.google.com',
        'test-event-id'
      );
    });

    it('should handle cancellation when no verification exists', async () => {
      // Mock no verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      });

      const result = await service.cancelVerification('staff-123');

      expect(result.success).toBe(true);
      expect(mockGoogleCalendarService.deleteEvent).not.toHaveBeenCalled();
    });

    it('should handle event deletion failure gracefully', async () => {
      // Mock existing verification
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'verification-123',
                    google_event_id: 'test-event-id',
                    google_calendar_id: 'test-calendar-id@group.calendar.google.com',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      mockGoogleCalendarService.deleteEvent.mockRejectedValue(new Error('Event not found'));

      const result = await service.cancelVerification('staff-123');

      expect(result.success).toBe(true);
      // Should still succeed even if event deletion fails
    });
  });

  describe('Verification Events Management', () => {
    it('should get verification events with filters', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          staff_id: 'staff-123',
          verification_status: 'pending',
          attendee_email: 'john.smith@example.com',
        },
        {
          id: 'event-2',
          staff_id: 'staff-456',
          verification_status: 'verified',
          attendee_email: 'jane.doe@example.com',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockEvents,
              error: null,
            })),
          })),
          order: jest.fn(() => ({
            data: mockEvents,
            error: null,
          })),
        })),
      });

      const filters = {
        staff_id: 'staff-123',
        verification_status: 'pending',
      };

      const result = await service.getVerificationEvents(filters);

      expect(result).toEqual(mockEvents);
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_verification_events');
    });

    it('should handle database error when getting verification events', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' },
          })),
        })),
      });

      await expect(service.getVerificationEvents()).rejects.toThrow(
        'Failed to fetch verification events: Database error'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failed' },
                }),
              })),
            })),
          })),
        })),
      });

      const result = await service.checkVerificationStatus('staff-123');

      expect(result.staffId).toBe('staff-123');
      expect(result.verificationStatus).toBe('not_required');
    });

    it('should handle service initialization errors', async () => {
      // Mock service that throws during initialization
      const mockFailingService = {
        createEvent: jest.fn().mockRejectedValue(new Error('Service not initialized')),
      };
      (getGoogleCalendarService as any).mockReturnValue(mockFailingService);

      const service = new CalendarVerificationService();
      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.startVerification(request);

      expect(result.success).toBe(false);
      expect(result.verificationStatus).toBe('failed');
      expect(result.errorCode).toBe('VERIFICATION_EVENT_CREATION_FAILED');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const service1 = new CalendarVerificationService();
      const service2 = new CalendarVerificationService();

      expect(service1).toBe(service2);
    });

    it('should reset singleton instance', () => {
      const service1 = new CalendarVerificationService();
      resetCalendarVerificationService();
      const service2 = new CalendarVerificationService();

      expect(service1).not.toBe(service2);
    });
  });
});
