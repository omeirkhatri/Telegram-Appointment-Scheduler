'use client';

import type { Appointment, Patient, Staff } from '@/types';
import { getAppointmentStatusDisplayName, getAppointmentTypeDisplayName } from '@/types/appointment';
import { formatTimeToHHMM } from '@/utils/timezone';
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
    Printer,
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
}: AppointmentDetailsDrawerProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [appointmentStaff, setAppointmentStaff] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

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

  // Fetch staff assignments when appointment changes
  useEffect(() => {
    if (appointment?.id) {
      setIsLoadingStaff(true);

      // Extract base appointment ID if this is a recurring occurrence
      let appointmentId = appointment.id;
      if (appointmentId.includes('_occurrence_')) {
        appointmentId = appointmentId.split('_occurrence_')[0];
      }

      // Fetch staff assignments with roles
      fetch(`/api/appointments/${appointmentId}/staff`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
            // The API returns { staff_assignments: [...], summary: {...} }
            const staffData = Array.isArray(data.data.staff_assignments) ? data.data.staff_assignments : [];
            setAppointmentStaff(staffData);
          } else {
            setAppointmentStaff([]);
          }
        })
        .catch(err => {
          console.error('Error fetching staff assignments:', err);
          setAppointmentStaff([]);
        })
        .finally(() => setIsLoadingStaff(false));
    }
  }, [appointment?.id]);

  // Fetch driver information if driver_id is present but not in staff assignments
  useEffect(() => {
    if (appointment?.driver_id && !appointmentStaff.find(s => s.role === 'driver')) {
      fetch(`/api/staff/${appointment.driver_id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
            // Add driver to staff assignments
            const driverStaff = {
              id: `driver-${appointment.driver_id}`,
              appointment_id: appointment.id,
              staff_id: appointment.driver_id,
              role: 'driver',
              is_primary: false,
              staff: data.data
            };
            setAppointmentStaff(prev => [...prev, driverStaff]);
          }
        })
        .catch(err => {
          console.error('Error fetching driver information:', err);
        });
    }
  }, [appointment?.driver_id, appointment?.id, appointmentStaff]);

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

  // Get primary staff and driver from appointment staff assignments
  const staffArray = Array.isArray(appointmentStaff) ? appointmentStaff : [];
  const primaryStaff = staffArray.find(s => s.is_primary);
  const driverFromStaff = staffArray.find(s => s.role === 'driver');
  const otherStaff = staffArray.filter(s => !s.is_primary && s.role !== 'driver');

  // Check for driver in both appointment_staff table and appointments.driver_id field
  const driver = driverFromStaff || (appointment.driver_id ? {
    staff: {
      id: appointment.driver_id,
      first_name: 'Loading...',
      last_name: '',
      phone: '',
      email: ''
    }
  } : null);

  // Get appointment end time
  const formattedStartTime = formatTimeToHHMM(appointment.start_time);
  const [startHours, startMinutes] = formattedStartTime.split(':').map(Number);
  const endMinutes = startMinutes + appointment.duration_minutes;
  const endHours = startHours + Math.floor(endMinutes / 60);
  const finalEndMinutes = endMinutes % 60;
  const endTimeString = `${endHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}`;

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
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-200 ease-in-out flex flex-col ${
          isClosing ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">

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
                  <span>{formatTimeToHHMM(appointment.start_time)} - {endTimeString}</span>
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
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Stethoscope className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Staff Details</h3>
            </div>
            {isLoadingStaff ? (
              <div className="text-sm text-gray-500">Loading staff assignments...</div>
            ) : (primaryStaff || driver || otherStaff.length > 0) ? (
              <div className="space-y-3">
                {/* Primary Staff */}
                {primaryStaff && (
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="w-4 h-4 text-blue-600" />
                          <p className="font-medium text-gray-900">
                            {primaryStaff.staff?.first_name} {primaryStaff.staff?.last_name}
                          </p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 capitalize mb-2">
                          {primaryStaff.staff?.staff_type?.replace('_', ' ')}
                          {primaryStaff.staff?.specialization && ` - ${primaryStaff.staff?.specialization}`}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{primaryStaff.staff?.phone}</span>
                          </div>
                          {primaryStaff.staff?.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className="w-3 h-3 text-center text-xs">@</span>
                              <span>{primaryStaff.staff?.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Driver */}
                {driver && (
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Car className="w-4 h-4 text-green-600" />
                          <p className="font-medium text-gray-900">
                            {driver.staff?.first_name} {driver.staff?.last_name}
                          </p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Driver
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{driver.staff?.phone}</span>
                          </div>
                          {driver.staff?.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className="w-3 h-3 text-center text-xs">@</span>
                              <span>{driver.staff?.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Staff */}
                {otherStaff.map((staffMember) => (
                  <div key={staffMember.id} className="p-3 bg-white rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="w-4 h-4 text-gray-600" />
                          <p className="font-medium text-gray-900">
                            {staffMember.staff?.first_name} {staffMember.staff?.last_name}
                          </p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {staffMember.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 capitalize mb-2">
                          {staffMember.staff?.staff_type?.replace('_', ' ')}
                          {staffMember.staff?.specialization && ` - ${staffMember.staff?.specialization}`}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{staffMember.staff?.phone}</span>
                          </div>
                          {staffMember.staff?.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className="w-3 h-3 text-center text-xs">@</span>
                              <span>{staffMember.staff?.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex items-center space-x-2 text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  <span>No staff assigned to this appointment</span>
                </div>
              </div>
            )}
          </div>

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
                {Object.entries(appointment.custom_fields)
                  .filter(([key]) => key !== 'base_appointment_id' && key !== 'is_recurring_generated') // Hide Base Appointment Id and Is Recurring Generated
                  .map(([key, value]) => {
                    // Special handling for cancelled_occurrences and occurrence_number to display in one row
                    if (key === 'cancelled_occurrences' || key === 'occurrence_number') {
                      return null; // We'll handle these separately
                    }
                    return (
                      <div key={key} className="p-3 bg-white rounded-lg border">
                        <label className="text-sm font-medium text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        <p className="text-gray-900 mt-1">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </p>
                      </div>
                    );
                  })}

                {/* Special row for cancelled_occurrences and occurrence_number */}
                {(appointment.custom_fields.cancelled_occurrences !== undefined || appointment.custom_fields.occurrence_number !== undefined) && (
                  <div className="grid grid-cols-2 gap-3">
                    {appointment.custom_fields.cancelled_occurrences !== undefined && (
                      <div className="p-3 bg-white rounded-lg border">
                        <label className="text-sm font-medium text-gray-600 capitalize">
                          Cancelled Occurrences
                        </label>
                        <p className="text-gray-900 mt-1">
                          {appointment.custom_fields.cancelled_occurrences}
                        </p>
                      </div>
                    )}
                    {appointment.custom_fields.occurrence_number !== undefined && (
                      <div className="p-3 bg-white rounded-lg border">
                        <label className="text-sm font-medium text-gray-600 capitalize">
                          Occurrence Number
                        </label>
                        <p className="text-gray-900 mt-1">
                          {appointment.custom_fields.occurrence_number}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes and Instructions */}
          {(appointment.notes || appointment.mini_notes || appointment.full_notes || appointment.pickup_instructions) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Notes and Instructions</h3>
              </div>
              <div className="space-y-4">
                {/* Mini Notes */}
                {appointment.mini_notes && (
                  <div className="p-3 bg-white rounded-lg border">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Brief Notes</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{appointment.mini_notes}</p>
                  </div>
                )}

                {/* Full Notes */}
                {appointment.full_notes && (
                  <div className="p-3 bg-white rounded-lg border">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Detailed Notes</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{appointment.full_notes}</p>
                  </div>
                )}

                {/* Pickup Instructions */}
                {appointment.pickup_instructions && (
                  <div className="p-3 bg-white rounded-lg border border-orange-200">
                    <h4 className="text-sm font-medium text-orange-700 mb-2">Pickup Instructions</h4>
                    <p className="text-orange-900 whitespace-pre-wrap">{appointment.pickup_instructions}</p>
                  </div>
                )}

                {/* Legacy Notes */}
                {appointment.notes && (
                  <div className="p-3 bg-white rounded-lg border">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">General Notes</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{appointment.notes}</p>
                  </div>
                )}
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
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.open(`/print/appointment/${appointment.id}`, '_blank')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
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
