// @ts-nocheck
'use client';

import { getAppointmentTypeDisplayName } from '@/types/appointment';
import type { MapMarker } from '@/types/map';
import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import { formatTimeToHHMM } from '@/utils/timezone';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface MapInfoWindowProps {
  marker: MapMarker;
  isVisible: boolean;
  onClose: () => void;
  onEdit?: (marker: MapMarker) => void;
  onDelete?: (marker: MapMarker) => void;
  onNavigate?: (marker: MapMarker) => void;
  className?: string;
  style?: React.CSSProperties;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
  showActions?: boolean;
  showNavigation?: boolean;
  showDetails?: boolean;
  showCustomFields?: boolean;
  showNotes?: boolean;
  showAddress?: boolean;
  showTransportation?: boolean;
  showDriver?: boolean;
  showPickupInstructions?: boolean;
  compact?: boolean;
  mobile?: boolean;
}

export function MapInfoWindow({
  marker,
  isVisible,
  onClose,
  onEdit,
  onDelete,
  onNavigate,
  className = '',
  style = {},
  position = 'top',
  maxWidth = '320px',
  showActions = true,
  showNavigation = true,
  showDetails = true,
  showCustomFields = true,
  showNotes = true,
  showAddress = true,
  showTransportation = true,
  showDriver = true,
  showPickupInstructions = true,
  compact = false,
  mobile = false
}: MapInfoWindowProps) {
  const infoWindowRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Get appointment type display name and colors
  const appointmentType = getAppointmentTypeDisplayName(marker.appointment_type);
  const primaryColor = getAppointmentTypeColor(marker.appointment_type, 'primary');
  const lightColor = getAppointmentTypeColor(marker.appointment_type, 'light');
  const textColor = getAppointmentTypeColor(marker.appointment_type, 'text');
  const borderColor = getAppointmentTypeColor(marker.appointment_type, 'border');

  // Status color mapping
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      case 'confirmed':
        return '#3b82f6';
      case 'scheduled':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  }, []);

  // Format time for display
  const formatTime = useCallback((time: string) => {
    try {
      return formatTimeToHHMM(time);
    } catch {
      return time;
    }
  }, []);

  // Format time range for display
  const formatTimeRange = useCallback((startTime: string, durationMinutes: number) => {
    try {
      const formattedStartTime = formatTimeToHHMM(startTime);
      const [startHours, startMinutes] = formattedStartTime.split(':').map(Number);
      const endMinutes = startMinutes + durationMinutes;
      const endHours = startHours + Math.floor(endMinutes / 60);
      const finalEndMinutes = endMinutes % 60;
      const endTimeString = `${endHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}`;
      return `${formattedStartTime} - ${endTimeString}`;
    } catch {
      return startTime;
    }
  }, []);

  // Format date for display
  const formatDate = useCallback((date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-AE', {
        timeZone: 'Asia/Dubai',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return date;
    }
  }, []);

  // Format date and time for display
  const formatDateTime = useCallback((date: string, time: string) => {
    try {
      const appointmentDateTime = new Date(`${date}T${time}`);
      return appointmentDateTime.toLocaleString('en-AE', {
        timeZone: 'Asia/Dubai',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return `${date} ${time}`;
    }
  }, []);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose]);

  // Handle edit
  const handleEdit = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onEdit) {
      onEdit(marker);
    }
  }, [onEdit, marker]);

  // Handle delete
  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDelete) {
      onDelete(marker);
    }
  }, [onDelete, marker]);

  // Handle navigate
  const handleNavigate = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onNavigate) {
      onNavigate(marker);
    }
  }, [onNavigate, marker]);

  // Animation effects
  useEffect(() => {
    if (isVisible && infoWindowRef.current) {
      setIsAnimating(true);
      const element = infoWindowRef.current;

      // Add entrance animation
      element.style.transform = 'scale(0.8) translateY(-10px)';
      element.style.opacity = '0';
      element.style.transition = 'all 0.2s ease-out';

      requestAnimationFrame(() => {
        element.style.transform = 'scale(1) translateY(0)';
        element.style.opacity = '1';
      });

      // Remove animation class after animation completes
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 200);

      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible, handleClose]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const statusColor = getStatusColor(marker.status);
  const appointmentDateTime = formatDateTime(marker.appointment_date, marker.start_time);
  const timeRange = formatTimeRange(marker.start_time, marker.duration_minutes);

  return (
    <div
      ref={infoWindowRef}
      className={`
        fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200
        ${compact ? 'p-3' : 'p-4'}
        ${mobile ? 'mx-4' : ''}
        ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        ${isAnimating ? 'transition-all duration-200 ease-out' : ''}
        ${className}
      `}
      style={{
        ...style,
        maxWidth: mobile ? 'calc(100vw - 2rem)' : maxWidth,
        minWidth: mobile ? '280px' : '300px',
        // Position the info window based on the position prop
        ...(position === 'top' && { transform: 'translateY(-100%)' }),
        ...(position === 'bottom' && { transform: 'translateY(100%)' }),
        ...(position === 'left' && { transform: 'translateX(-100%)' }),
        ...(position === 'right' && { transform: 'translateX(100%)' })
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {marker.patient_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${primaryColor}20`,
                color: primaryColor,
                border: `1px solid ${primaryColor}40`
              }}
            >
              {appointmentType}
            </span>
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${statusColor}20`,
                color: statusColor,
                border: `1px solid ${statusColor}40`
              }}
            >
              {marker.status.charAt(0).toUpperCase() + marker.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close info window"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Date and Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">{appointmentDateTime}</span>
        </div>

        {/* Time Range */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{timeRange}</span>
        </div>

        {/* Patient Phone */}
        {marker.patient_phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a
              href={`tel:${marker.patient_phone}`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {marker.patient_phone}
            </a>
          </div>
        )}

        {/* Address */}
        {showAddress && marker.address && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="flex-1">{marker.address}</span>
          </div>
        )}

        {/* Transportation */}
        {showTransportation && marker.transportation_type && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>
              Transportation: <span className="font-medium capitalize">{marker.transportation_type.replace('_', ' ')}</span>
            </span>
          </div>
        )}

        {/* Driver */}
        {showDriver && marker.driver_id && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Driver ID: <span className="font-medium">{marker.driver_id}</span></span>
          </div>
        )}

        {/* Pickup Instructions */}
        {showPickupInstructions && marker.pickup_instructions && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1">
              <span className="font-medium">Pickup Instructions:</span>
              <p className="mt-1 text-gray-700">{marker.pickup_instructions}</p>
            </div>
          </div>
        )}

        {/* Notes */}
        {showNotes && marker.notes && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <div className="flex-1">
              <span className="font-medium">Notes:</span>
              <p className="mt-1 text-gray-700">{marker.notes}</p>
            </div>
          </div>
        )}

        {/* Custom Fields */}
        {showCustomFields && marker.custom_fields && Object.keys(marker.custom_fields).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Custom Fields:</span>
            </div>
            <div className="space-y-1">
              {Object.entries(marker.custom_fields).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
          {onEdit && (
            <button
              onClick={handleEdit}
              className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-md transition-colors"
              style={{ backgroundColor: primaryColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${primaryColor}dd`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = primaryColor;
              }}
            >
              Edit
            </button>
          )}

          {onDelete && (
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}

          {onNavigate && showNavigation && (
            <button
              onClick={handleNavigate}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
            >
              Navigate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MapInfoWindow;
