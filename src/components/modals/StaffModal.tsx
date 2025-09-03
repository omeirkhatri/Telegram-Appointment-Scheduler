'use client';

import { StaffForm } from '@/components/forms';
import { ErrorMessage } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import type { Staff } from '@/types';
import { X } from 'lucide-react';
import { useState } from 'react';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialStaff?: Partial<Staff>;
}

export function StaffModal({
  isOpen,
  onClose,
  onSuccess,
  initialStaff,
}: StaffModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    setSubmitError(null);
    onClose();
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
            isLoading={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
