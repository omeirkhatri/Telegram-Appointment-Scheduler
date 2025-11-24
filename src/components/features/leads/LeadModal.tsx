'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import type { Lead, LeadFormData } from '@/types/lead';
import { useState } from 'react';
import { LeadForm } from './LeadForm';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
  initialData?: Partial<LeadFormData>;
}

export function LeadModal({ isOpen, onClose, onSuccess, initialData }: LeadModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: LeadFormData) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create lead');
      }

      const result = await response.json();
      onSuccess(result.data);
    } catch (error) {
      console.error('Error creating lead:', error);
      // TODO: Show error message to user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Lead' : 'Add New Lead'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <LeadForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={isLoading}
            initialData={initialData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
