'use client';

import { PatientForm } from '@/components/forms';
import { ErrorMessage } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import type { Patient } from '@/types';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPatient?: Partial<Patient>;
}

export function PatientModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatient,
}: PatientModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToastContext();

  // Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const url = initialPatient?.id ? `/api/patients/${initialPatient.id}` : '/api/patients';
      const method = initialPatient?.id ? 'PUT' : 'POST';

      // Send JSON data
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${initialPatient?.id ? 'update' : 'create'} patient`);
      }

      // Close modal and trigger success callback
      onClose();
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${initialPatient?.id ? 'update' : 'create'} patient`;
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
      <div className="relative bg-[--card] border border-[--border] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[--border]">
          <div>
            <h2 className="text-2xl font-bold text-[--foreground]">
              {initialPatient?.id ? 'Edit Patient' : 'Add New Patient'}
            </h2>
            <p className="text-[--muted-foreground] mt-1">
              {initialPatient?.id ? 'Update patient information' : 'Enter patient details to add them to the system'}
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
          <PatientForm
            patient={initialPatient as Patient}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
