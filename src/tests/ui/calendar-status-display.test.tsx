/**
 * UI Tests for Calendar Status Display Component
 *
 * Tests the CalendarStatusDisplay component with various calendar states,
 * error conditions, and user interactions.
 */

import { CalendarStatusDisplay } from '@/components/features/staff/CalendarStatusDisplay';
import type { Staff } from '@/types';
import type { CalendarErrorCode } from '@/types/calendar';
import { jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Mock the calendar utility functions
jest.mock('@/types/calendar', () => ({
  getCalendarErrorDescription: jest.fn((errorCode: string) => {
    const descriptions: Record<string, string> = {
      'CALENDAR_CREATION_FAILED': 'Failed to create calendar in Google Calendar',
      'EMAIL_INVALID': 'Staff email address is invalid or malformed',
      'GOOGLE_API_UNAVAILABLE': 'Google Calendar API is temporarily unavailable',
      'PERMISSION_DENIED': 'Insufficient permissions to create/manage calendar',
      'QUOTA_EXCEEDED': 'Google Calendar API quota exceeded',
    };
    return descriptions[errorCode] || 'Unknown error';
  }),
  isRetryableError: jest.fn((errorCode: string) => {
    const retryableErrors = ['GOOGLE_API_UNAVAILABLE', 'QUOTA_EXCEEDED'];
    return retryableErrors.includes(errorCode);
  }),
  requiresAdminIntervention: jest.fn((errorCode: string) => {
    const adminInterventionErrors = ['PERMISSION_DENIED', 'QUOTA_EXCEEDED'];
    return adminInterventionErrors.includes(errorCode);
  }),
}));

describe('CalendarStatusDisplay', () => {
  const mockOnRetry = jest.fn();
  const mockOnVerify = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockStaff = (overrides: Partial<Staff> = {}): Staff => ({
    id: 'staff-123',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    phone: '+971501234567',
    staff_type: 'Doctor',
    status: 'active',
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    available_days: [1, 2, 3, 4, 5],
    telegram_user_id: '123456789',
    telegram_verified: false,
    google_calendar_id: null,
    calendar_verification_status: null,
    calendar_verification_date: null,
    calendar_error_code: null,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    ...overrides,
  });

  describe('Verified Status', () => {
    it('should display verified status correctly', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-15T10:00:00Z',
        google_calendar_id: 'test-calendar@group.calendar.google.com',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar Status')).toBeInTheDocument();
      expect(screen.getByText('Calendar Verified')).toBeInTheDocument();
      expect(screen.getByText(/Staff member has access to their calendar/)).toBeInTheDocument();
      expect(screen.getByText('Verified 1/15/2024')).toBeInTheDocument();
      expect(screen.getByText('View Calendar')).toBeInTheDocument();
    });

    it('should not show action buttons for verified status', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'verified',
        google_calendar_id: 'test-calendar@group.calendar.google.com',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.queryByText('Retry Setup')).not.toBeInTheDocument();
      expect(screen.queryByText('Start Verification')).not.toBeInTheDocument();
    });

    it('should display calendar information for verified staff', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'verified',
        google_calendar_id: 'test-calendar@group.calendar.google.com',
        email: 'john.smith@example.com',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar ID: test-calendar@group.calendar.google.com')).toBeInTheDocument();
      expect(screen.getByText('Shared with: john.smith@example.com')).toBeInTheDocument();
    });
  });

  describe('Failed Status', () => {
    it('should display failed status correctly', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'CALENDAR_CREATION_FAILED',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar Setup Failed')).toBeInTheDocument();
      expect(screen.getByText(/Calendar setup failed: Failed to create calendar/)).toBeInTheDocument();
      expect(screen.getByText('Show error details')).toBeInTheDocument();
    });

    it('should show retry button for retryable errors', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'GOOGLE_API_UNAVAILABLE',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Retry Setup')).toBeInTheDocument();
      expect(screen.getByText('Start Verification')).toBeInTheDocument();
    });

    it('should not show retry button for non-retryable errors', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'PERMISSION_DENIED',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.queryByText('Retry Setup')).not.toBeInTheDocument();
      expect(screen.getByText('Start Verification')).toBeInTheDocument();
    });

    it('should toggle error details visibility', async () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'CALENDAR_CREATION_FAILED',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      // Initially error details should be hidden
      expect(screen.queryByText('Error Code: CALENDAR_CREATION_FAILED')).not.toBeInTheDocument();

      // Click to show error details
      fireEvent.click(screen.getByText('Show error details'));

      await waitFor(() => {
        expect(screen.getByText('Error Code: CALENDAR_CREATION_FAILED')).toBeInTheDocument();
        expect(screen.getByText('Failed to create calendar in Google Calendar')).toBeInTheDocument();
      });

      // Click to hide error details
      fireEvent.click(screen.getByText('Hide error details'));

      await waitFor(() => {
        expect(screen.queryByText('Error Code: CALENDAR_CREATION_FAILED')).not.toBeInTheDocument();
      });
    });

    it('should show admin intervention warning for critical errors', async () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'PERMISSION_DENIED',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      fireEvent.click(screen.getByText('Show error details'));

      await waitFor(() => {
        expect(screen.getByText('⚠️ This error requires admin intervention to resolve.')).toBeInTheDocument();
      });
    });
  });

  describe('Pending Status', () => {
    it('should display pending status correctly', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'pending',
        google_calendar_id: 'test-calendar@group.calendar.google.com',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar Pending Verification')).toBeInTheDocument();
      expect(screen.getByText(/Calendar has been created and shared/)).toBeInTheDocument();
      expect(screen.getByText('Start Verification')).toBeInTheDocument();
    });

    it('should not show retry button for pending status', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'pending',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.queryByText('Retry Setup')).not.toBeInTheDocument();
    });
  });

  describe('Not Required Status', () => {
    it('should display not required status correctly', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'not_required',
        email: 'no-email@bestdoc.com',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar Not Required')).toBeInTheDocument();
      expect(screen.getByText(/No email address provided/)).toBeInTheDocument();
    });

    it('should not show action buttons for not required status', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'not_required',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.queryByText('Retry Setup')).not.toBeInTheDocument();
      expect(screen.queryByText('Start Verification')).not.toBeInTheDocument();
    });
  });

  describe('Unknown Status', () => {
    it('should display unknown status correctly', () => {
      const staff = createMockStaff({
        calendar_verification_status: undefined,
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar Status Unknown')).toBeInTheDocument();
      expect(screen.getByText(/Calendar status is unknown/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onRetry when retry button is clicked', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'GOOGLE_API_UNAVAILABLE',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      fireEvent.click(screen.getByText('Retry Setup'));

      expect(mockOnRetry).toHaveBeenCalledWith('staff-123');
    });

    it('should call onVerify when verify button is clicked', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'pending',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      fireEvent.click(screen.getByText('Start Verification'));

      expect(mockOnVerify).toHaveBeenCalledWith('staff-123');
    });

    it('should disable retry button when isRetrying is true', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'GOOGLE_API_UNAVAILABLE',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
          isRetrying={true}
        />
      );

      const retryButton = screen.getByText('Retrying...');
      expect(retryButton).toBeDisabled();
    });

    it('should disable verify button when isVerifying is true', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'pending',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
          isVerifying={true}
        />
      );

      const verifyButton = screen.getByText('Verifying...');
      expect(verifyButton).toBeDisabled();
    });
  });

  describe('External Calendar Link', () => {
    it('should show calendar link when calendar ID exists', () => {
      const staff = createMockStaff({
        google_calendar_id: 'test-calendar@group.calendar.google.com',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      const calendarLink = screen.getByText('View Calendar');
      expect(calendarLink).toBeInTheDocument();
      expect(calendarLink.closest('a')).toHaveAttribute(
        'href',
        'https://calendar.google.com/calendar/u/0/r?cid=test-calendar%40group.calendar.google.com'
      );
      expect(calendarLink.closest('a')).toHaveAttribute('target', '_blank');
      expect(calendarLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not show calendar link when calendar ID does not exist', () => {
      const staff = createMockStaff({
        google_calendar_id: null,
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.queryByText('View Calendar')).not.toBeInTheDocument();
    });
  });

  describe('Calendar Information Display', () => {
    it('should show calendar information when calendar ID exists', () => {
      const staff = createMockStaff({
        google_calendar_id: 'test-calendar@group.calendar.google.com',
        email: 'john.smith@example.com',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar ID: test-calendar@group.calendar.google.com')).toBeInTheDocument();
      expect(screen.getByText('Shared with: john.smith@example.com')).toBeInTheDocument();
    });

    it('should not show calendar information when calendar ID does not exist', () => {
      const staff = createMockStaff({
        google_calendar_id: null,
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.queryByText(/Calendar ID:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Shared with:/)).not.toBeInTheDocument();
    });

    it('should not show shared email when email is not provided', () => {
      const staff = createMockStaff({
        google_calendar_id: 'test-calendar@group.calendar.google.com',
        email: null,
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar ID: test-calendar@group.calendar.google.com')).toBeInTheDocument();
      expect(screen.queryByText(/Shared with:/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'CALENDAR_CREATION_FAILED',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 3, name: 'Calendar Status' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: 'Calendar Setup Failed' })).toBeInTheDocument();

      // Check for button accessibility
      const retryButton = screen.getByRole('button', { name: /Retry Setup/ });
      expect(retryButton).toBeInTheDocument();

      const verifyButton = screen.getByRole('button', { name: /Start Verification/ });
      expect(verifyButton).toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'CALENDAR_CREATION_FAILED',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      const retryButton = screen.getByRole('button', { name: /Retry Setup/ });
      const verifyButton = screen.getByRole('button', { name: /Start Verification/ });

      // Buttons should be focusable
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);

      verifyButton.focus();
      expect(document.activeElement).toBe(verifyButton);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing error code gracefully', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: null,
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar Setup Failed')).toBeInTheDocument();
      expect(screen.queryByText('Show error details')).not.toBeInTheDocument();
    });

    it('should handle unknown error codes gracefully', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'UNKNOWN_ERROR' as CalendarErrorCode,
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
        />
      );

      expect(screen.getByText('Calendar Setup Failed')).toBeInTheDocument();
      expect(screen.getByText('Show error details')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state for retry button', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'failed',
        calendar_error_code: 'GOOGLE_API_UNAVAILABLE',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
          isRetrying={true}
        />
      );

      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retrying/ })).toBeDisabled();
    });

    it('should show loading state for verify button', () => {
      const staff = createMockStaff({
        calendar_verification_status: 'pending',
      });

      render(
        <CalendarStatusDisplay
          staff={staff}
          onRetry={mockOnRetry}
          onVerify={mockOnVerify}
          isVerifying={true}
        />
      );

      expect(screen.getByText('Verifying...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Verifying/ })).toBeDisabled();
    });
  });
});
