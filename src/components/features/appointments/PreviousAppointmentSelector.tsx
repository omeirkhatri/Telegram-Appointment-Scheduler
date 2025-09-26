'use client';

import type { Appointment, TransportationSegmentLocation } from '@/types';
import { formatTimeToHHMM } from '@/utils/timezone';
import { Calendar, MapPin, User } from 'lucide-react';
import { useState } from 'react';

interface PreviousAppointmentSelectorProps {
  appointments: Appointment[];
  onAppointmentSelect: (appointment: Appointment, location: TransportationSegmentLocation) => void;
  disabled?: boolean;
  className?: string;
  currentAppointmentId?: string; // Exclude current appointment from list
}

export function PreviousAppointmentSelector({
  appointments,
  onAppointmentSelect,
  disabled = false,
  className = '',
  currentAppointmentId,
}: PreviousAppointmentSelectorProps) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out current appointment and sort by date (most recent first)
  const availableAppointments = appointments
    .filter(appointment => appointment.id !== currentAppointmentId)
    .filter(appointment => appointment.status === 'completed' || appointment.status === 'scheduled')
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
    .slice(0, 20); // Limit to 20 most recent appointments

  const selectedAppointment = availableAppointments.find(
    appointment => appointment.id === selectedAppointmentId
  );

  const handleAppointmentChange = async (appointmentId: string) => {
    if (!appointmentId) {
      setSelectedAppointmentId('');
      return;
    }

    setSelectedAppointmentId(appointmentId);
    setIsLoading(true);
    setError(null);

    try {
      const appointment = availableAppointments.find(apt => apt.id === appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Create location from appointment data
      // For now, we'll use the patient's address or a default location
      // In a real implementation, this would fetch the actual appointment location
      const location: TransportationSegmentLocation = {
        lat: 25.2048, // Default coordinates - in real implementation, this would come from appointment data
        lng: 55.2708,
        address: appointment.pickup_instructions || `Previous appointment location for ${appointment.patient_id}`,
        formatted_address: appointment.pickup_instructions || `Previous appointment location`,
        city: 'Dubai',
        area: 'Previous Appointment',
        building_name: `Appointment ${appointment.id}`,
        place_id: `appointment_${appointment.id}`,
      };

      onAppointmentSelect(appointment, location);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointment location');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAppointmentDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatAppointmentTime = (timeString: string) => {
    try {
      return formatTimeToHHMM(timeString);
    } catch {
      return timeString;
    }
  };

  if (availableAppointments.length === 0) {
    return (
      <div className={`p-4 border border-yellow-200 rounded-lg bg-yellow-50 ${className}`}>
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-yellow-600" />
          <div>
            <div className="text-sm font-medium text-yellow-900">No previous appointments found</div>
            <div className="text-xs text-yellow-700">
              Complete some appointments first to use this option
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Previous Appointment
        </label>
        <select
          value={selectedAppointmentId}
          onChange={(e) => handleAppointmentChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${error ? 'border-red-300' : 'border-gray-300'}
          `}
        >
          <option value="">Choose a previous appointment...</option>
          {availableAppointments.map((appointment) => (
            <option key={appointment.id} value={appointment.id}>
              {formatAppointmentDate(appointment.appointment_date)} at {formatAppointmentTime(appointment.start_time)} - {appointment.appointment_type.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">Loading appointment location...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {selectedAppointment && !isLoading && !error && (
        <div className="p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-sm font-medium text-green-900">
                  Previous Appointment Selected
                </h4>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {selectedAppointment.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-green-900 font-medium">Date & Time</div>
                    <div className="text-sm text-green-800">
                      {formatAppointmentDate(selectedAppointment.appointment_date)} at {formatAppointmentTime(selectedAppointment.start_time)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-green-900 font-medium">Type</div>
                    <div className="text-sm text-green-800 capitalize">
                      {selectedAppointment.appointment_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {selectedAppointment.pickup_instructions && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-green-900 font-medium">Location Notes</div>
                      <div className="text-sm text-green-800">{selectedAppointment.pickup_instructions}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 p-2 bg-green-100 rounded border border-green-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs font-medium text-green-800">
                    Pickup location will be set from this appointment
                  </span>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  Reference: {selectedAppointment.id}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
