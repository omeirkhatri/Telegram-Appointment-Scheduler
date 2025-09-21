'use client';

import { StaffForm } from './StaffForm';
import { DeleteConfirmationModal } from '@/components/shared/modals/DeleteConfirmationModal';
import { ErrorMessage } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import type { Staff } from '@/types';
import { X } from 'lucide-react';
import { useState } from 'react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-[--card] border border-[--border] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4" data-testid="staff-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[--border]">
          <div>
            <h2 className="text-2xl font-bold text-[--foreground]">
              {initialStaff?.id ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <p className="text-[--muted-foreground] mt-1">
              {initialStaff?.id ? 'Update staff member information' : 'Enter staff member details to add them to the system'}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Submit error */}
          {submitError && (
            <ErrorMessage
              error={submitError}
              variant="inline"
            />
          )}

          {/* Form */}
          <StaffForm
            staff={initialStaff as Staff}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDelete={handleDeleteClick}
            onFormChange={handleFormChange}
            onVerificationSuccess={onVerificationSuccess}
            isLoading={isSubmitting}
          />
        </div>
      </div>

      {/* Close Confirmation Popup */}
      {showCloseConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-[--card] border border-[--border] rounded-xl shadow-2xl p-6 mx-4 max-w-md w-full">
            <h3 className="text-lg font-semibold text-[--foreground] mb-2">
              Unsaved Changes
            </h3>
            <p className="text-[--muted-foreground] mb-6">
              You have unsaved changes. Would you like to save or discard them?
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCloseWithoutSave}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Discard
              </button>
              <button
                onClick={handleCloseWithSave}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
