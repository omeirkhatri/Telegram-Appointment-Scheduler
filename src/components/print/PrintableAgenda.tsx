'use client';

import { generateAgendaPrintData } from '@/lib/printUtils';
import type { Appointment, Patient, Staff } from '@/types';
import { useEffect, useState } from 'react';

interface PrintableAgendaProps {
  staff: Staff;
  appointments: Array<{
    appointment: Appointment;
    patient: Patient;
    staff: Staff[];
    driver?: Staff;
  }>;
  date: Date;
  className?: string;
}

export function PrintableAgenda({
  staff,
  appointments,
  date,
  className = '',
}: PrintableAgendaProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="print-agenda-loading">
        <div className="print-agenda-loading-content">
          <h2>Loading agenda...</h2>
        </div>
      </div>
    );
  }

  const printData = generateAgendaPrintData(staff, appointments, date);

  return (
    <div className={`print-agenda ${className}`}>
      {/* Print Header */}
      <div className="print-agenda-header">
        <div className="print-agenda-logo">
          <h1>MediCare Scheduler</h1>
          <p>Daily Appointment Agenda</p>
        </div>
        <div className="print-agenda-meta">
          <div className="print-agenda-date">
            <h2>Schedule for {printData.date}</h2>
          </div>
          <div className="print-agenda-staff">
            <h3>{printData.staff.name}</h3>
            <p>{printData.staff.type}</p>
            <p>Phone: {printData.staff.phone}</p>
            <p>Email: {printData.staff.email}</p>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div className="print-agenda-content">
        {printData.appointments.length > 0 ? (
          <>
            {/* Appointments List */}
            <div className="print-appointments-list">
              {printData.appointments.map((appointment, index) => (
                <div key={appointment.id} className="print-appointment-item">
                  {/* Appointment Header */}
                  <div className="print-appointment-header">
                    <div className="print-appointment-time">
                      <span className="print-time-start">{appointment.time}</span>
                      <span className="print-time-separator">–</span>
                      <span className="print-time-end">{appointment.endTime}</span>
                    </div>
                    <div className={`print-appointment-type ${appointment.typeClass}`}>
                      {appointment.type}
                    </div>
                    <div className="print-appointment-duration">
                      {appointment.duration}
                    </div>
                  </div>

                  {/* Appointment Body */}
                  <div className="print-appointment-body">
                    {/* Patient Information */}
                    <div className="print-appointment-section">
                      <h4 className="print-section-title">Patient Information</h4>
                      <div className="print-section-content">
                        <p><strong>Name:</strong> {appointment.patient.name}</p>
                        <p><strong>Phone:</strong> {appointment.patient.phone}</p>
                        <p><strong>Address:</strong> {appointment.patient.address}</p>
                      </div>
                    </div>

                    {/* Staff Information */}
                    {appointment.staff.length > 0 && (
                      <div className="print-appointment-section">
                        <h4 className="print-section-title">Assigned Staff</h4>
                        <div className="print-section-content">
                          {appointment.staff.map((staffMember, staffIndex) => (
                            <p key={staffIndex}>
                              <strong>{staffMember.type}:</strong> {staffMember.name} ({staffMember.phone})
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transportation */}
                    <div className="print-appointment-section">
                      <h4 className="print-section-title">Transportation</h4>
                      <div className="print-section-content">
                        <p>{appointment.transportation}</p>
                      </div>
                    </div>

                    {/* Custom Fields */}
                    {appointment.customFields.length > 0 && (
                      <div className="print-appointment-section">
                        <h4 className="print-section-title">Appointment Details</h4>
                        <div className="print-section-content">
                          {appointment.customFields.map((field, fieldIndex) => (
                            <p key={fieldIndex}>
                              <strong>{field.label}:</strong> {field.value}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="print-appointment-section">
                        <h4 className="print-section-title">Notes</h4>
                        <div className="print-section-content">
                          <p>{appointment.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Appointment ID */}
                    <div className="print-appointment-id">
                      <small>Appointment ID: {appointment.id}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="print-agenda-summary">
              <div className="print-summary-content">
                <h3>Total: {printData.totalAppointments} appointment{printData.totalAppointments !== 1 ? 's' : ''}</h3>
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
          </>
        ) : (
          <div className="print-no-appointments">
            <h3>No appointments scheduled</h3>
            <p>You have no appointments scheduled for {printData.date}.</p>
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="print-agenda-footer">
        <p>This agenda was automatically generated by MediCare Scheduler</p>
        <p>For support, contact your administrator</p>
      </div>
    </div>
  );
}

export default PrintableAgenda;
