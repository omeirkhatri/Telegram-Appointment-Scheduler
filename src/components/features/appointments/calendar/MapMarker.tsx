// @ts-nocheck
'use client';

import { getAppointmentTypeDisplayName } from '@/types/appointment';
import type { MapMarker as MapMarkerType } from '@/types/map';
import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import { formatTimeToHHMM } from '@/utils/timezone';
import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';
import { TimezoneBadge } from '@/components/ui/TimezoneBadge';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface MapMarkerProps {
  marker: MapMarkerType;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (marker: MapMarkerType) => void;
  onRightClick?: (marker: MapMarkerType, event: React.MouseEvent) => void;
  onHover?: (marker: MapMarkerType | null) => void;
  className?: string;
  style?: React.CSSProperties;
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
  showTime?: boolean;
  showType?: boolean;
  animated?: boolean;
  pulse?: boolean;
  showDetailedTooltip?: boolean;
}

export function MapMarker({
  marker,
  isSelected = false,
  isHovered = false,
  onClick,
  onRightClick,
  onHover,
  className = '',
  style = {},
  size = 'medium',
  showStatus = true,
  showTime = true,
  showType = true,
  animated = true,
  pulse = false,
  showDetailedTooltip = true
}: MapMarkerProps) {
  const markerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchMoved, setTouchMoved] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get appointment type display name and color
  const appointmentType = getAppointmentTypeDisplayName(marker.appointment_type);
  const primaryColor = getAppointmentTypeColor(marker.appointment_type, 'primary');
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

  // Size configuration with mobile optimization
  const getSizeConfig = useCallback((size: string, isMobileDevice: boolean) => {
    // Base configurations
    const configs = {
      small: {
        container: isMobileDevice ? 'w-10 h-10' : 'w-8 h-8',
        icon: isMobileDevice ? 'w-5 h-5' : 'w-4 h-4',
        text: 'text-xs',
        statusDot: isMobileDevice ? 'w-3 h-3' : 'w-2 h-2',
        padding: isMobileDevice ? 'p-1.5' : 'p-1',
        touchTarget: 'min-h-[44px] min-w-[44px]' // Apple's recommended minimum touch target
      },
      large: {
        container: isMobileDevice ? 'w-18 h-18' : 'w-16 h-16',
        icon: isMobileDevice ? 'w-9 h-9' : 'w-8 h-8',
        text: 'text-sm',
        statusDot: isMobileDevice ? 'w-5 h-5' : 'w-4 h-4',
        padding: isMobileDevice ? 'p-2.5' : 'p-2',
        touchTarget: 'min-h-[44px] min-w-[44px]'
      },
      medium: {
        container: isMobileDevice ? 'w-14 h-14' : 'w-12 h-12',
        icon: isMobileDevice ? 'w-7 h-7' : 'w-6 h-6',
        text: 'text-xs',
        statusDot: isMobileDevice ? 'w-4 h-4' : 'w-3 h-3',
        padding: isMobileDevice ? 'p-2' : 'p-1.5',
        touchTarget: 'min-h-[44px] min-w-[44px]'
      }
    };

    return configs[size as keyof typeof configs] || configs.medium;
  }, []);

  // Get appointment type specific styling
  const getAppointmentTypeStyle = useCallback((appointmentType: string) => {
    switch (appointmentType) {
      case 'doctor_on_call':
        return {
          gradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
          shadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          borderStyle: 'solid',
          borderWidth: '2px'
        };
      case 'lab_test':
        return {
          gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
          shadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
          borderStyle: 'solid',
          borderWidth: '2px'
        };
      case 'teleconsultation':
        return {
          gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
          shadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          borderStyle: 'solid',
          borderWidth: '2px'
        };
      case 'physiotherapy':
        return {
          gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          shadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
          borderStyle: 'solid',
          borderWidth: '2px'
        };
      case 'caregiver':
        return {
          gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          shadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          borderStyle: 'solid',
          borderWidth: '2px'
        };
      case 'iv_therapy':
        return {
          gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
          shadow: '0 4px 12px rgba(6, 182, 212, 0.4)',
          borderStyle: 'solid',
          borderWidth: '2px'
        };
      default:
        return {
          gradient: 'linear-gradient(135deg, #6B7280 0%, #374151 100%)',
          shadow: '0 4px 12px rgba(107, 114, 128, 0.4)',
          borderStyle: 'solid',
          borderWidth: '2px'
        };
    }
  }, []);

  const sizeConfig = getSizeConfig(size, isMobile);
  const statusColor = getStatusColor(marker.status);
  const appointmentTypeStyle = getAppointmentTypeStyle(marker.appointment_type);

  // Format time range for display (start time - end time)
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

  // Format address for display
  const formatAddress = useCallback((marker: MapMarkerType) => {
    // Use individual address components if available, otherwise fall back to the address field
    if (marker.flat_villa_no || marker.building_street || marker.area || marker.city) {
      const parts = [];
      if (marker.flat_villa_no) parts.push(marker.flat_villa_no);
      if (marker.building_street) parts.push(marker.building_street);
      if (marker.area) parts.push(marker.area);
      if (marker.city) parts.push(marker.city);
      return parts.join(', ');
    }
    return marker.address || 'Address not available';
  }, []);

  // Format staff information for display
  const formatStaffInfo = useCallback((marker: MapMarkerType) => {
    // Use all_staff_names if available, otherwise fall back to staff_name
    if (marker.all_staff_names && marker.all_staff_names !== 'Staff not assigned') {
      return marker.all_staff_names;
    }
    if (marker.staff_name) {
      return marker.staff_name;
    }
    return 'Staff not assigned';
  }, []);

  // Handle click events
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) {
      onClick(marker);
    }
  }, [onClick, marker]);

  // Handle right click events
  const handleRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onRightClick) {
      onRightClick(marker, event);
    }
  }, [onRightClick, marker]);

  // Handle hover events (desktop only)
  const handleMouseEnter = useCallback(() => {
    if (onHover && !isMobile) {
      onHover(marker);
    }
  }, [onHover, marker, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (onHover && !isMobile) {
      onHover(null);
    }
  }, [onHover, isMobile]);

  // Handle touch events for mobile
  const handleTouchStart = useCallback(() => {
    setTouchStartTime(Date.now());
    setTouchMoved(false);

    // Provide haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    setTouchMoved(true);
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime;

    // Only trigger click if it was a tap (not a drag) and duration was short
    if (!touchMoved && touchDuration < 500) {
      event.preventDefault();
      if (onClick) {
        onClick(marker);
      }
    }
  }, [touchStartTime, touchMoved, onClick, marker]);

  // Animation effects
  useEffect(() => {
    if (animated && markerRef.current) {
      const element = markerRef.current;

      // Add entrance animation
      element.style.transform = 'scale(0)';
      element.style.transition = 'transform 0.3s ease-out';

      requestAnimationFrame(() => {
        element.style.transform = 'scale(1)';
      });

      // Add pulse animation if enabled
      if (pulse) {
        const pulseInterval = setInterval(() => {
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 1000);
        }, 3000);

        return () => clearInterval(pulseInterval);
      }
    }
    return undefined;
  }, [animated, pulse]);

  // Get appointment type icon with enhanced styling
  const getAppointmentIcon = useCallback((appointmentType: string) => {
    const iconProps = {
      className: "w-full h-full",
      fill: "currentColor",
      viewBox: "0 0 24 24"
    };

    switch (appointmentType) {
      case 'doctor_on_call':
        return (
          <svg {...iconProps}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'lab_test':
        return (
          <svg {...iconProps}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        );
      case 'teleconsultation':
        return (
          <svg {...iconProps}>
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        );
      case 'physiotherapy':
        return (
          <svg {...iconProps}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      case 'caregiver':
        return (
          <svg {...iconProps}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        );
      case 'iv_therapy':
        return (
          <svg {...iconProps}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
    }
  }, []);

  return (
    <div
      data-testid="map-marker"
      ref={markerRef}
      className={`
        relative flex flex-col items-center justify-center
        ${sizeConfig.container}
        ${sizeConfig.touchTarget}
        ${className}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isHovered && !isMobile ? 'scale-105' : ''}
        ${animated ? 'transition-all duration-200 ease-in-out' : ''}
        ${pulse && isAnimating ? 'animate-pulse' : ''}
        ${isMobile ? 'touch-manipulation active:scale-95' : 'cursor-pointer'}
        select-none
      `}
      style={{
        ...style,
        filter: isSelected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none',
        // Improve touch responsiveness on mobile
        WebkitTapHighlightColor: isMobile ? 'transparent' : 'auto',
        touchAction: isMobile ? 'manipulation' : 'auto'
      }}
      onClick={isMobile ? undefined : handleClick}
      onContextMenu={isMobile ? undefined : handleRightClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      role="button"
      tabIndex={0}
      aria-label={`${marker.patient_name} - ${appointmentType} appointment at ${formatTimeRange(marker.start_time, marker.duration_minutes)}`}
      title={`${marker.patient_name} - ${appointmentType} (${marker.status})`}
    >
      {/* Main marker circle */}
      <div
        className={`
          relative rounded-full border-2 border-white shadow-lg
          ${sizeConfig.container}
          ${sizeConfig.padding}
          flex items-center justify-center
          ${isSelected ? 'ring-4 ring-blue-500 ring-opacity-30' : ''}
          ${isHovered && !isMobile ? 'ring-2 ring-white ring-opacity-50' : ''}
        `}
        style={{
          background: appointmentTypeStyle.gradient,
          boxShadow: isSelected
            ? `0 0 0 4px rgba(59, 130, 246, 0.3), ${appointmentTypeStyle.shadow}`
            : appointmentTypeStyle.shadow,
          borderColor: isSelected ? '#3B82F6' : 'white',
          borderStyle: appointmentTypeStyle.borderStyle,
          borderWidth: appointmentTypeStyle.borderWidth
        }}
      >
        {/* Appointment type icon */}
        <div
          className={`${sizeConfig.icon} text-white`}
          style={{ color: 'white' }}
        >
          {getAppointmentIcon(marker.appointment_type)}
        </div>

        {/* Status indicator */}
        {showStatus && (
          <div
            className={`
              absolute -top-1 -right-1 rounded-full border-2 border-white
              ${sizeConfig.statusDot}
              shadow-lg
            `}
            style={{
              backgroundColor: statusColor,
              boxShadow: `0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 1px ${statusColor}40`
            }}
            aria-label={`Status: ${marker.status}`}
          />
        )}

        {/* Inner glow effect */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle at center, white 0%, transparent 70%)`
          }}
        />
      </div>

      {/* Detailed hover tooltip - Show on hover or when selected */}
      {showDetailedTooltip && ((isHovered && !isMobile) || isSelected) && (
        <div
          data-testid="marker-tooltip"
          className={`
            absolute top-full mt-2 px-4 py-3 rounded-xl text-white
            ${isMobile ? 'max-w-80' : 'max-w-72'}
            z-20 border shadow-2xl
            transition-all duration-300 ease-out
            ${isHovered && !isMobile ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
            ${isSelected ? 'opacity-100 scale-100' : ''}
          `}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            borderColor: borderColor,
            borderWidth: '1px'
          }}
        >
          {/* Header with patient name and status */}
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm truncate flex-1">
              {marker.patient_name}
            </div>
            {showStatus && (
              <div
                className="text-xs font-medium flex items-center gap-1 ml-2"
                style={{ color: statusColor }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
                {marker.status.charAt(0).toUpperCase() + marker.status.slice(1)}
              </div>
            )}
          </div>

          {/* Appointment type */}
          {showType && (
            <div className="text-sm font-medium mb-2" style={{ color: primaryColor }}>
              {appointmentType}
            </div>
          )}

          {/* Time */}
          {showTime && (
            <div className="text-xs text-gray-300 mb-2">
              <span className="font-medium">Time:</span> {formatTimeRange(marker.start_time, marker.duration_minutes)}
            </div>
          )}


          {/* Address */}
          <div className="text-xs text-gray-300 mb-2">
            <span className="font-medium">Address:</span> {formatAddress(marker)}
          </div>

          {/* Staff */}
          <div className="text-xs text-gray-300 mb-2">
            <span className="font-medium">Staff:</span> {formatStaffInfo(marker)}
          </div>

          {/* Additional details if available */}
          {marker.notes && (
            <div className="text-xs text-gray-300">
              <span className="font-medium">Notes:</span> {marker.notes.length > 50 ? `${marker.notes.substring(0, 50)}...` : marker.notes}
            </div>
          )}
        </div>
      )}

      {/* Simple marker label - Fallback for when detailed tooltip is disabled */}
      {!showDetailedTooltip && (
        <div
          className={`
            absolute top-full mt-1 px-3 py-2 rounded-lg text-white
            ${sizeConfig.text} font-medium whitespace-nowrap
            ${(isHovered && !isMobile) || isSelected ? 'opacity-100' : 'opacity-0'}
            ${isMobile ? 'transition-opacity duration-300' : 'transition-opacity duration-200'}
            ${isMobile ? 'max-w-32' : 'max-w-24'}
            z-10 border
          `}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            boxShadow: isMobile ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
            borderColor: borderColor,
            borderWidth: '1px'
          }}
        >
          {/* Patient name */}
          <div className={`font-semibold truncate ${isMobile ? 'max-w-32' : 'max-w-24'}`}>
            {marker.patient_name}
          </div>

          {/* Appointment type */}
          {showType && (
            <div className={`text-xs opacity-90 truncate ${isMobile ? 'max-w-32' : 'max-w-24'}`}>
              {appointmentType}
            </div>
          )}

          {/* Time */}
          {showTime && (
            <div className="text-xs opacity-90">
              {formatTimeRange(marker.start_time, marker.duration_minutes)}
            </div>
          )}

          {/* Status */}
          {showStatus && (
            <div
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: statusColor }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              {marker.status.charAt(0).toUpperCase() + marker.status.slice(1)}
            </div>
          )}
        </div>
      )}

      {/* Ripple effect for click animation */}
      {isAnimating && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: appointmentTypeStyle.gradient,
            opacity: 0.4
          }}
        />
      )}

      {/* Hover effect overlay */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-full opacity-25"
          style={{
            background: `radial-gradient(circle at center, ${primaryColor} 0%, transparent 70%)`
          }}
        />
      )}
    </div>
  );
}

export default MapMarker;
