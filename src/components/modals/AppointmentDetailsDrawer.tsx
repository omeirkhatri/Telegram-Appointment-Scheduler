'use client';

import type { Appointment, Patient, Staff } from '@/types';
import { getAppointmentStatusDisplayName, getAppointmentTypeDisplayName } from '@/types/appointment';
import {
    AlertCircle,
    Calendar,
    Car,
    Clock,
    Copy,
    Edit,
    ExternalLink,
    FileText,
    MapPin,
    Phone,
    Stethoscope,
    Trash2,
    User,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface AppointmentDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  patient?: Patient | null;
  staff?: Staff[];
  onEdit?: (appointment: Appointment) => void;
  onCopy?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  onOpenInGoogleCalendar?: (appointment: Appointment) => void;
}

export function AppointmentDetailsDrawer({
  isOpen,
  onClose,
  appointment,
  patient,
  staff = [],
  onEdit,
  onCopy,
  onDelete,
  onOpenInGoogleCalendar,
}: AppointmentDetailsDrawerProps) {
  const [isClosing, setIsClosing] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // Match animation duration
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !appointment) return null;

  // Get assigned staff members
  const assignedStaff = staff.filter(s =>
    appointment.google_event_ids &&
    Object.keys(appointment.google_event_ids).includes(s.id),
  );

  // Get driver if assigned
  const driver = staff.find(s => s.id === appointment.driver_id);

  // Get appointment end time
  const startTime = new Date(`2000-01-01T${appointment.start_time}:00`);
  const endTime = new Date(startTime.getTime() + appointment.duration_minutes * 60000);
  const endTimeString = endTime.toTimeString().slice(0, 5);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get appointment type color
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      doctor_on_call: 'bg-blue-100 text-blue-800 border-blue-200',
      lab_test: 'bg-purple-100 text-purple-800 border-purple-200',
      teleconsultation: 'bg-green-100 text-green-800 border-green-200',
      physiotherapy: 'bg-orange-100 text-orange-800 border-orange-200',
      caregiver: 'bg-pink-100 text-pink-800 border-pink-200',
      iv_therapy: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-200 ease-in-out ${
          isClosing ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
            <p className="text-gray-600 mt-1">
              {getAppointmentTypeDisplayName(appointment.appointment_type)}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
            </div>
            {patient ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{patient.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{patient.phone}</span>
                </div>
                {patient.flat_villa_no && patient.building_street && (
                  <div className="flex items-start space-x-2 text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <div>
                      <div>{patient.flat_villa_no}, {patient.building_street}</div>
                      {patient.area && <div>{patient.area}, {patient.city}</div>}
                    </div>
                  </div>
                )}
                {patient.google_maps_link && (
                  <a
                    href={patient.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in Google Maps</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span>Patient information not available</span>
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Date</label>
                <p className="text-gray-900">{appointment.appointment_date}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Time</label>
                <div className="flex items-center space-x-1 text-gray-900">
                  <Clock className="w-4 h-4" />
                  <span>{appointment.start_time} - {endTimeString}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Duration</label>
                <p className="text-gray-900">{appointment.duration_minutes} minutes</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                  {getAppointmentStatusDisplayName(appointment.status)}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeColor(appointment.appointment_type)}`}>
                  {getAppointmentTypeDisplayName(appointment.appointment_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Staff Assignments */}
          {assignedStaff.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Stethoscope className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Assigned Staff</h3>
              </div>
              <div className="space-y-2">
                {assignedStaff.map((staffMember) => (
                  <div key={staffMember.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <p className="font-medium text-gray-900">
                        {staffMember.first_name} {staffMember.last_name}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">
                        {staffMember.staff_type.replace('_', ' ')}
                        {staffMember.specialization && ` - ${staffMember.specialization}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{staffMember.phone}</p>
                      {staffMember.email && (
                        <p className="text-sm text-gray-600">{staffMember.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transportation */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Car className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Transportation</h3>
            </div>
            {appointment.transportation_type === 'driver' && driver ? (
              <div className="p-3 bg-white rounded-lg border">
                <p className="font-medium text-gray-900">
                  {driver.first_name} {driver.last_name}
                </p>
                <p className="text-sm text-gray-600">{driver.phone}</p>
              </div>
            ) : appointment.transportation_type === 'self_transport' ? (
              <div className="p-3 bg-white rounded-lg border">
                <p className="font-medium text-gray-900">Self Transport</p>
                <p className="text-sm text-gray-600">{appointment.transportation_method}</p>
              </div>
            ) : (
              <p className="text-gray-500">No transportation assigned</p>
            )}
          </div>

          {/* Custom Fields */}
          {appointment.custom_fields && Object.keys(appointment.custom_fields).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(appointment.custom_fields).map(([key, value]) => (
                  <div key={key} className="p-3 bg-white rounded-lg border">
                    <label className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <p className="text-gray-900 mt-1">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-gray-900 whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            </div>
          )}

          {/* Recurring Information */}
          {appointment.recurring_rule && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-3 mb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Recurring Appointment</h3>
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-blue-900">
                  Repeats every {appointment.recurring_rule.interval} {appointment.recurring_rule.frequency}
                  {appointment.recurring_rule.end_date && (
                    <span> until {appointment.recurring_rule.end_date}</span>
                  )}
                  {appointment.recurring_rule.end_occurrences && (
                    <span> ({appointment.recurring_rule.end_occurrences} occurrences)</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {appointment.google_event_ids && Object.keys(appointment.google_event_ids).length > 0 && (
                <button
                  onClick={() => onOpenInGoogleCalendar?.(appointment)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Google Calendar
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onCopy?.(appointment)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </button>
              <button
                onClick={() => onEdit?.(appointment)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => onDelete?.(appointment)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
