'use client';

import { DeleteConfirmationModal } from '@/components/shared/modals/DeleteConfirmationModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, ErrorMessage } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import type { Staff } from '@/types';
import { useState } from 'react';
import { CalendarStatusDisplay } from './CalendarStatusDisplay';
import { StaffForm } from './StaffForm';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onVerificationSuccess?: () => void;
  initialStaff?: Partial<Staff>;
}

export function StaffModal({
  isOpen,
  onClose,
  onSuccess,
  onVerificationSuccess,
  initialStaff,
}: StaffModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isRetryingCalendar, setIsRetryingCalendar] = useState(false);
  const [isVerifyingCalendar, setIsVerifyingCalendar] = useState(false);
  const { showToast } = useToastContext();

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const url = initialStaff?.id ? `/api/staff/${initialStaff.id}` : '/api/staff';
      const method = initialStaff?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${initialStaff?.id ? 'update' : 'create'} staff member`);
      }

      // Mark changes as saved
      setHasUnsavedChanges(false);

      // Update the initialStaff with the new data so calendar verification can work
      const updatedStaff = { ...initialStaff, ...data, id: result.data?.id || initialStaff?.id };

      // If this is a new staff member with email, automatically start calendar verification
      if (!initialStaff?.id && data.email && data.email.trim() !== '') {
        try {
          await handleCalendarVerify(updatedStaff.id);
        } catch (verifyError) {
          console.warn('Calendar verification failed after staff creation:', verifyError);
          // Don't fail the entire operation if verification fails
        }
      }

      // Close modal and trigger success callback
      onClose();
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${initialStaff?.id ? 'update' : 'create'} staff member`;
      setSubmitError(errorMessage);
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirmation(true);
    } else {
      setSubmitError(null);
      onClose();
    }
  };

  const handleCloseWithSave = async () => {
    setShowCloseConfirmation(false);
    // Trigger form submission
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  const handleCloseWithoutSave = () => {
    setShowCloseConfirmation(false);
    setHasUnsavedChanges(false);
    setSubmitError(null);
    onClose();
  };

  const handleFormChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!initialStaff?.id) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setShowDeleteConfirmation(false);

    try {
      const response = await fetch(`/api/staff/${initialStaff.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete staff member');
      }

      // Close modal and trigger success callback
      onClose();
      onSuccess();

      showToast({
        type: 'success',
        title: 'Success',
        message: 'Staff member deleted successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete staff member';
      setSubmitError(errorMessage);
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
  };

  const handleCalendarRetry = async (staffId: string) => {
    setIsRetryingCalendar(true);
    try {
      const response = await fetch('/api/calendar/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staff_id: staffId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to retry calendar operation');
      }

      showToast({
        type: 'success',
        title: 'Success',
        message: 'Calendar operation retry initiated successfully',
      });

      // Refresh the staff data to show updated status
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry calendar operation';
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsRetryingCalendar(false);
    }
  };

  const handleCalendarVerify = async (staffId: string) => {
    setIsVerifyingCalendar(true);
    try {
      // Get staff data to send required fields
      const staffData = initialStaff;
      if (!staffData?.email) {
        throw new Error('Staff email is required for verification');
      }

      const response = await fetch('/api/calendar/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: staffId,
          google_calendar_id: staffData.google_calendar_id || 'pending-calendar-creation',
          staff_email: staffData.email
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to start calendar verification');
      }

      showToast({
        type: 'success',
        title: 'Success',
        message: 'Calendar verification process started successfully',
      });

      // Refresh the staff data to show updated status
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start calendar verification';
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsVerifyingCalendar(false);
    }
  };

  const handleManualVerify = async (staffId: string, action: 'send_email_again' | 'mark_verified' | 'change_email', newEmail?: string) => {
    try {
      const response = await fetch('/api/calendar/manual-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: staffId,
          action,
          new_email: newEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to perform manual verification action');
      }

      // Show success message based on action
      let title = '';
      let message = '';

      switch (action) {
        case 'send_email_again':
          title = 'Email Sent';
          message = 'Verification email has been sent again.';
          break;
        case 'mark_verified':
          title = 'Marked as Verified';
          message = 'Staff member has been manually marked as verified.';
          break;
        case 'change_email':
          title = 'Email Updated';
          message = 'Email address has been updated. Calendar verification will need to be restarted.';
          break;
      }

      showToast({
        type: 'success',
        title,
        message,
      });

      // Update the staff data to reflect the changes
      if (initialStaff) {
        if (action === 'mark_verified') {
          initialStaff.calendar_verification_status = 'verified';
          initialStaff.calendar_verification_date = new Date().toISOString();
        } else if (action === 'change_email' && newEmail) {
          initialStaff.email = newEmail;
          initialStaff.calendar_verification_status = 'not_required';
          initialStaff.calendar_verification_date = null;
          initialStaff.calendar_error_code = null;
        }
      }

      // Refresh the staff data to show updated status
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to perform manual verification action';
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: errorMessage,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="staff-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {initialStaff?.id ? 'Edit Staff Member' : 'Add New Staff Member'}
          </DialogTitle>
          <DialogDescription>
            {initialStaff?.id ? 'Update staff member information' : 'Enter staff member details to add them to the system'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Submit error */}
          {submitError && (
            <ErrorMessage
              error={submitError}
              variant="inline"
            />
          )}

          {/* Calendar Status - Only show for existing staff with email */}
          {initialStaff?.id && initialStaff?.email && (
            <div className="mb-6">
              <CalendarStatusDisplay
                staff={initialStaff}
                onRetry={handleCalendarRetry}
                onVerify={handleCalendarVerify}
                onManualVerify={handleManualVerify}
                isRetrying={isRetryingCalendar}
                isVerifying={isVerifyingCalendar}
              />
            </div>
          )}

          {/* Form */}
          <StaffForm
            staff={initialStaff as Staff}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDelete={handleDeleteClick}
            onFormChange={handleFormChange}
            onVerificationSuccess={onVerificationSuccess}
            onCalendarRetry={handleCalendarRetry}
            onCalendarVerify={handleCalendarVerify}
            isLoading={isSubmitting}
            isRetryingCalendar={isRetryingCalendar}
            isVerifyingCalendar={isVerifyingCalendar}
          />
        </div>
      </DialogContent>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save or discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseWithoutSave}>
              Discard
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseWithSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save & Close'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Staff Member"
        message="Are you sure you want to delete this staff member? This action cannot be undone and will remove all associated data."
        itemName={initialStaff ? `${initialStaff.first_name} ${initialStaff.last_name}` : undefined}
        isLoading={isSubmitting}
      />
    </Dialog>
  );
}
