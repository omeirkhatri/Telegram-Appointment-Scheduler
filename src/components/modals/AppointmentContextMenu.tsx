'use client';

import type { Appointment } from '@/types';
import { Copy, Edit, Printer, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AppointmentContextMenuProps {
  appointment: Appointment;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit?: (appointment: Appointment) => void;
  onCopy?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
}

export function AppointmentContextMenu({
  appointment,
  position,
  onClose,
  onEdit,
  onCopy,
  onCancel,
  onDelete,
}: AppointmentContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position if menu would go off-screen
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const getAppointmentTypeDisplayName = (type: string) => {
    const typeMap: Record<string, string> = {
      doctor_on_call: 'Doctor on Call',
      lab_test: 'Lab Test',
      teleconsultation: 'Teleconsultation',
      physiotherapy: 'Physiotherapy',
      caregiver: 'Caregiver',
      iv_therapy: 'IV Therapy',
    };
    return typeMap[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'text-yellow-600',
      confirmed: 'text-blue-600',
      completed: 'text-green-600',
      cancelled: 'text-red-600',
    };
    return colors[status] || 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[--card] border border-[--border] rounded-lg shadow-lg py-2 min-w-[200px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Appointment Info Header */}
      <div className="px-3 py-2 border-b border-[--border] mb-2">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[--foreground] truncate">
              {getAppointmentTypeDisplayName(appointment.appointment_type)}
            </p>
            <p className="text-xs text-[--muted-foreground]">
              {formatDate(appointment.appointment_date)} at {formatTime(appointment.start_time)}
            </p>
            <p className={`text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 text-[--muted-foreground] hover:text-[--foreground] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Items */}
      <div className="py-1">
        {onEdit && (
          <button
            onClick={() => handleAction(() => onEdit(appointment))}
            className="w-full flex items-center px-3 py-2 text-sm text-[--foreground] hover:bg-[--accent] transition-colors"
          >
            <Edit className="w-4 h-4 mr-3 text-[--muted-foreground]" />
            Edit Appointment
          </button>
        )}

        <button
          onClick={() => handleAction(() => window.open(`/print/appointment/${appointment.id}`, '_blank'))}
          className="w-full flex items-center px-3 py-2 text-sm text-[--foreground] hover:bg-[--accent] transition-colors"
        >
          <Printer className="w-4 h-4 mr-3 text-[--muted-foreground]" />
          Print Appointment
        </button>

        {onCopy && (
          <button
            onClick={() => handleAction(() => onCopy(appointment))}
            className="w-full flex items-center px-3 py-2 text-sm text-[--foreground] hover:bg-[--accent] transition-colors"
          >
            <Copy className="w-4 h-4 mr-3 text-[--muted-foreground]" />
            Copy Appointment
          </button>
        )}

        {appointment.status !== 'cancelled' && onCancel && (
          <button
            onClick={() => handleAction(() => onCancel(appointment))}
            className="w-full flex items-center px-3 py-2 text-sm text-[--foreground] hover:bg-[--accent] transition-colors"
          >
            <X className="w-4 h-4 mr-3 text-[--muted-foreground]" />
            Cancel Appointment
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => handleAction(() => onDelete(appointment))}
            className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Delete Appointment
          </button>
        )}
      </div>
    </div>
  );
}
