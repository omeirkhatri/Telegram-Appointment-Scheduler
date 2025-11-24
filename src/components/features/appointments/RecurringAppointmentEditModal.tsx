'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import type { Appointment } from '@/types';
import { Calendar, Clock, User } from 'lucide-react';
import { useState } from 'react';

interface RecurringAppointmentEditModalProps {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updateType: 'this_occurrence' | 'all_future' | 'until_date', updateData: any, untilDate?: string) => Promise<void>;
  isLoading?: boolean;
}

export function RecurringAppointmentEditModal({
  appointment,
  isOpen,
  onClose,
  onUpdate,
  isLoading = false,
}: RecurringAppointmentEditModalProps) {
  const [selectedOption, setSelectedOption] = useState<'this_occurrence' | 'all_future' | 'until_date' | null>(null);
  const [untilDate, setUntilDate] = useState('');
  const { showToast } = useToastContext();

  const handleUpdate = async () => {
    if (!selectedOption) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Please select an update option',
      });
      return;
    }

    if (selectedOption === 'until_date' && !untilDate) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Please select an end date',
      });
      return;
    }

    try {
      await onUpdate(selectedOption, {}, untilDate);
      onClose();
    } catch (error) {
      console.error('Error updating recurring appointment:', error);
    }
  };

  const handleClose = () => {
    setSelectedOption(null);
    setUntilDate('');
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <span>Edit Recurring Appointment</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Choose how to apply your changes
          </AlertDialogDescription>
        </AlertDialogHeader>

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
          </div>

          {/* Update Options */}
          <div className="space-y-4 mb-6">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">How would you like to update this appointment?</h3>

              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="updateType"
                  value="this_occurrence"
                  checked={selectedOption === 'this_occurrence'}
                  onChange={() => setSelectedOption('this_occurrence')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">This occurrence only</div>
                  <div className="text-sm text-gray-600">
                    Update only this specific appointment. Future occurrences will remain unchanged.
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="updateType"
                  value="all_future"
                  checked={selectedOption === 'all_future'}
                  onChange={() => setSelectedOption('all_future')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">This and all future occurrences</div>
                  <div className="text-sm text-gray-600">
                    Update this appointment and all future occurrences in the series.
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="updateType"
                  value="until_date"
                  checked={selectedOption === 'until_date'}
                  onChange={() => setSelectedOption('until_date')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Until specific date</div>
                  <div className="text-sm text-gray-600">
                    Update this appointment and future occurrences until a specific date.
                  </div>
                  {selectedOption === 'until_date' && (
                    <div className="mt-2">
                      <input
                        type="date"
                        value={untilDate}
                        onChange={(e) => setUntilDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={appointment.appointment_date}
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUpdate}
            disabled={!selectedOption || isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Appointment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
