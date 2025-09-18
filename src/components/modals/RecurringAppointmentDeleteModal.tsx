'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToastContext } from '@/components/ui/ToastContainer';
import type { Appointment } from '@/types';
import { Calendar, Clock, Trash2, User } from 'lucide-react';
import { useState } from 'react';

interface RecurringAppointmentDeleteModalProps {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (deleteType: 'this_occurrence' | 'all_future') => Promise<void>;
  isLoading?: boolean;
}

export function RecurringAppointmentDeleteModal({
  appointment,
  isOpen,
  onClose,
  onDelete,
  isLoading = false,
}: RecurringAppointmentDeleteModalProps) {
  const [selectedOption, setSelectedOption] = useState<'this_occurrence' | 'all_future' | null>(null);
  const { showToast } = useToastContext();

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!selectedOption) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Please select a deletion option',
      });
      return;
    }

    try {
      await onDelete(selectedOption);
      onClose();
    } catch (error) {
      console.error('Error deleting recurring appointment:', error);
    }
  };

  const handleClose = () => {
    setSelectedOption(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Delete Recurring Appointment</h2>
              <p className="text-sm text-gray-600">Choose how to delete this appointment</p>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">
                {appointment.patient?.name || 'Unknown Patient'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {appointment.appointment_date} at {appointment.start_time}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {appointment.appointment_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>

          {/* Delete Options */}
          <div className="space-y-4 mb-6">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">How would you like to delete this appointment?</h3>

              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteType"
                  value="this_occurrence"
                  checked={selectedOption === 'this_occurrence'}
                  onChange={() => setSelectedOption('this_occurrence')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">This occurrence only</div>
                  <div className="text-sm text-gray-600">
                    Delete only this specific appointment. Future occurrences will remain unchanged.
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteType"
                  value="all_future"
                  checked={selectedOption === 'all_future'}
                  onChange={() => setSelectedOption('all_future')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">This and all future occurrences</div>
                  <div className="text-sm text-gray-600">
                    Delete this appointment and all future occurrences in the series.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Warning</h4>
                <p className="text-sm text-red-700 mt-1">
                  This action cannot be undone. The appointment{selectedOption === 'all_future' ? 's' : ''} will be permanently deleted.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!selectedOption || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Deleting...' : 'Delete Appointment'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
