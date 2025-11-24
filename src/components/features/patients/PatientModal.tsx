'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, ErrorMessage } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import type { Patient } from '@/types';
import { useEffect, useState } from 'react';
import { PatientForm } from './PatientForm';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {initialPatient?.id ? 'Edit Patient' : 'Add New Patient'}
          </DialogTitle>
          <DialogDescription>
            {initialPatient?.id ? 'Update patient information' : 'Enter patient details to add them to the system'}
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

          {/* Form */}
          <PatientForm
            patient={initialPatient as Patient}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
