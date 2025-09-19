'use client';

import { getAppointmentTypeDisplayName } from '@/types/appointment';
import type { MapMarker as MapMarkerType } from '@/types/map';
import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
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
  pulse = false
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
  const secondaryColor = getAppointmentTypeColor(marker.appointment_type, 'secondary');

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

  const sizeConfig = getSizeConfig(size, isMobile);
  const statusColor = getStatusColor(marker.status);

  // Format time for display
  const formatTime = useCallback((time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return time;
    }
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
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
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
  }, [animated, pulse]);

  // Get appointment type icon
  const getAppointmentIcon = useCallback((appointmentType: string) => {
    switch (appointmentType) {
      case 'doctor_on_call':
        return (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'lab_test':
        return (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        );
      case 'teleconsultation':
        return (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        );
      case 'physiotherapy':
        return (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      case 'caregiver':
        return (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        );
      case 'iv_therapy':
        return (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
    }
  }, []);

  return (
    <div
      ref={markerRef}
      className={`
        relative flex flex-col items-center justify-center
        ${sizeConfig.container}
        ${sizeConfig.touchTarget}
        ${className}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isHovered && !isMobile ? 'scale-110' : ''}
        ${animated ? 'transition-all duration-200 ease-in-out' : ''}
        ${pulse && isAnimating ? 'animate-pulse' : ''}
        ${isMobile ? 'touch-manipulation active:scale-95' : 'cursor-pointer hover:scale-105'}
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
      aria-label={`${marker.patient_name} - ${appointmentType} appointment at ${formatTime(marker.start_time)}`}
      title={`${marker.patient_name} - ${appointmentType} (${marker.status})`}
    >
      {/* Main marker circle */}
      <div
        className={`
          relative rounded-full border-2 border-white shadow-lg
          ${sizeConfig.container}
          ${sizeConfig.padding}
          flex items-center justify-center
        `}
        style={{
          backgroundColor: primaryColor,
          boxShadow: isSelected
            ? '0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)'
            : '0 2px 4px rgba(0, 0, 0, 0.2)'
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
            `}
            style={{ backgroundColor: statusColor }}
            aria-label={`Status: ${marker.status}`}
          />
        )}
      </div>

      {/* Marker label - Always visible on mobile when selected */}
      <div
        className={`
          absolute top-full mt-1 px-2 py-1 rounded-md text-white
          ${sizeConfig.text} font-medium whitespace-nowrap
          ${(isHovered && !isMobile) || isSelected ? 'opacity-100' : 'opacity-0'}
          ${isMobile ? 'transition-opacity duration-300' : 'transition-opacity duration-200'}
          ${isMobile ? 'max-w-32' : 'max-w-24'}
          z-10
        `}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(4px)',
          boxShadow: isMobile ? '0 4px 8px rgba(0, 0, 0, 0.3)' : 'none'
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
            {formatTime(marker.start_time)}
          </div>
        )}

        {/* Status */}
        {showStatus && (
          <div
            className="text-xs font-medium"
            style={{ color: statusColor }}
          >
            {marker.status.charAt(0).toUpperCase() + marker.status.slice(1)}
          </div>
        )}
      </div>

      {/* Ripple effect for click animation */}
      {isAnimating && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: primaryColor,
            opacity: 0.3
          }}
        />
      )}

      {/* Hover effect overlay */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{ backgroundColor: primaryColor }}
        />
      )}
    </div>
  );
}

export default MapMarker;
