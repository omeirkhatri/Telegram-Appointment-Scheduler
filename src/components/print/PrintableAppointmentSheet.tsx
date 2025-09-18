'use client';

import { generateAppointmentPrintSummary } from '@/lib/printUtils';
import type { Appointment, Patient, Staff } from '@/types';
import { useEffect, useState } from 'react';

interface PrintableAppointmentSheetProps {
  appointment: Appointment;
  patient: Patient;
  staff: Staff[];
  driver?: Staff;
  className?: string;
}

export function PrintableAppointmentSheet({
  appointment,
  patient,
  staff,
  driver,
  className = '',
}: PrintableAppointmentSheetProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="print-appointment-loading">
        <div className="print-appointment-loading-content">
          <h2>Loading appointment...</h2>
        </div>
      </div>
    );
  }

  const printData = generateAppointmentPrintSummary(appointment, patient, staff, driver);

  return (
    <div className={`print-appointment-sheet ${className}`}>
      {/* Print Header */}
      <div className="print-appointment-header">
        <div className="print-appointment-logo">
          <h1>MediCare Scheduler</h1>
          <p>Appointment Details</p>
        </div>
        <div className="print-appointment-meta">
          <div className="print-appointment-id">
            <h2>Appointment #{printData.id.slice(0, 8)}</h2>
          </div>
          <div className="print-appointment-date-time">
            <p><strong>Date:</strong> {printData.date}</p>
            <p><strong>Time:</strong> {printData.time} – {printData.endTime}</p>
            <p><strong>Duration:</strong> {printData.duration}</p>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div className="print-appointment-content">
        {/* Appointment Type Badge */}
        <div className="print-appointment-type-section">
          <div className={`print-appointment-type-badge ${printData.typeClass}`}>
            {printData.type}
          </div>
        </div>

        {/* Patient Information */}
        <div className="print-appointment-section">
          <h3 className="print-section-title">Patient Information</h3>
          <div className="print-section-content">
            <div className="print-info-grid">
              <div className="print-info-item">
                <label>Name:</label>
                <span>{printData.patient.name}</span>
              </div>
              <div className="print-info-item">
                <label>Phone:</label>
                <span>{printData.patient.phone}</span>
              </div>
              <div className="print-info-item print-info-full">
                <label>Address:</label>
                <span>{printData.patient.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Information */}
        {printData.staff.length > 0 && (
          <div className="print-appointment-section">
            <h3 className="print-section-title">Assigned Staff</h3>
            <div className="print-section-content">
              <div className="print-staff-list">
                {printData.staff.map((staffMember, index) => (
                  <div key={index} className="print-staff-item">
                    <div className="print-staff-info">
                      <div className="print-staff-name">{staffMember.name}</div>
                      <div className="print-staff-type">{staffMember.type}</div>
                      <div className="print-staff-phone">{staffMember.phone}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transportation */}
        <div className="print-appointment-section">
          <h3 className="print-section-title">Transportation</h3>
          <div className="print-section-content">
            <div className="print-transportation-info">
              <p>{printData.transportation}</p>
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        {printData.customFields.length > 0 && (
          <div className="print-appointment-section">
            <h3 className="print-section-title">Appointment Details</h3>
            <div className="print-section-content">
              <div className="print-custom-fields">
                {printData.customFields.map((field, index) => (
                  <div key={index} className="print-custom-field">
                    <label>{field.label}:</label>
                    <span>{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {printData.notes && (
          <div className="print-appointment-section">
            <h3 className="print-section-title">Notes</h3>
            <div className="print-section-content">
              <div className="print-notes">
                <p>{printData.notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="print-appointment-section">
          <h3 className="print-section-title">Additional Information</h3>
          <div className="print-section-content">
            <div className="print-additional-info">
              <div className="print-info-item">
                <label>Appointment ID:</label>
                <span>{printData.id}</span>
              </div>
              <div className="print-info-item">
                <label>Status:</label>
                <span className={`print-status print-status-${appointment.status}`}>
                  {appointment.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <div className="print-info-item">
                <label>Created:</label>
                <span>{new Date(appointment.created_at).toLocaleDateString('en-GB', {
                  timeZone: 'Asia/Dubai',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })} (Dubai time)</span>
              </div>
              {appointment.updated_at !== appointment.created_at && (
                <div className="print-info-item">
                  <label>Last Updated:</label>
                  <span>{new Date(appointment.updated_at).toLocaleDateString('en-GB', {
                    timeZone: 'Asia/Dubai',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} (Dubai time)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Footer */}
      <div className="print-appointment-footer">
        <p>This appointment sheet was generated by MediCare Scheduler</p>
        <p>For support, contact your administrator</p>
        <p>Generated on {new Date().toLocaleDateString('en-GB', {
          timeZone: 'Asia/Dubai',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })} (Dubai time)</p>
      </div>
    </div>
  );
}

export default PrintableAppointmentSheet;
