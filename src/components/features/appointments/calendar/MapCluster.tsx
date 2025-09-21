// @ts-nocheck
'use client';

import type { MapCluster as MapClusterType } from '@/types/map';
import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface MapClusterProps {
  cluster: MapClusterType;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (cluster: MapClusterType) => void;
  onHover?: (cluster: MapClusterType | null) => void;
  className?: string;
  style?: React.CSSProperties;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  showTypeBreakdown?: boolean;
  animated?: boolean;
  pulse?: boolean;
}

export function MapCluster({
  cluster,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  className = '',
  style = {},
  size = 'medium',
  showCount = true,
  showTypeBreakdown = true,
  animated = true,
  pulse = false
}: MapClusterProps) {
  const clusterRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate appointment type breakdown
  const getTypeBreakdown = useCallback(() => {
    const breakdown: Record<string, number> = {};
    cluster.markers.forEach(marker => {
      breakdown[marker.appointment_type] = (breakdown[marker.appointment_type] || 0) + 1;
    });
    return breakdown;
  }, [cluster.markers]);

  // Get dominant appointment type
  const getDominantType = useCallback(() => {
    const breakdown = getTypeBreakdown();
    const entries = Object.entries(breakdown);
    if (entries.length === 0) return 'doctor_on_call'; // Default fallback
    return entries.reduce((a, b) => breakdown[a[0]] > breakdown[b[0]] ? a : b)[0];
  }, [getTypeBreakdown]);

  // Size configuration
  const getSizeConfig = useCallback((size: string, isMobileDevice: boolean) => {
    const configs = {
      small: {
        container: isMobileDevice ? 'w-12 h-12' : 'w-10 h-10',
        text: isMobileDevice ? 'text-sm' : 'text-xs',
        icon: isMobileDevice ? 'w-6 h-6' : 'w-5 h-5',
        padding: isMobileDevice ? 'p-2' : 'p-1.5',
        touchTarget: 'min-h-[44px] min-w-[44px]'
      },
      large: {
        container: isMobileDevice ? 'w-20 h-20' : 'w-18 h-18',
        text: isMobileDevice ? 'text-lg' : 'text-base',
        icon: isMobileDevice ? 'w-10 h-10' : 'w-9 h-9',
        padding: isMobileDevice ? 'p-3' : 'p-2.5',
        touchTarget: 'min-h-[44px] min-w-[44px]'
      },
      medium: {
        container: isMobileDevice ? 'w-16 h-16' : 'w-14 h-14',
        text: isMobileDevice ? 'text-base' : 'text-sm',
        icon: isMobileDevice ? 'w-8 h-8' : 'w-7 h-7',
        padding: isMobileDevice ? 'p-2.5' : 'p-2',
        touchTarget: 'min-h-[44px] min-w-[44px]'
      }
    };

    return configs[size as keyof typeof configs] || configs.medium;
  }, []);

  const sizeConfig = getSizeConfig(size, isMobile);
  const typeBreakdown = getTypeBreakdown();
  const dominantType = getDominantType();
  const primaryColor = getAppointmentTypeColor(dominantType as any, 'primary');
  const lightColor = getAppointmentTypeColor(dominantType as any, 'light');

  // Handle click events
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) {
      onClick(cluster);
    }
  }, [onClick, cluster]);

  // Handle hover events (desktop only)
  const handleMouseEnter = useCallback(() => {
    if (onHover && !isMobile) {
      onHover(cluster);
    }
  }, [onHover, cluster, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (onHover && !isMobile) {
      onHover(null);
    }
  }, [onHover, isMobile]);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    // Provide haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (onClick) {
      onClick(cluster);
    }
  }, [onClick, cluster]);

  // Animation effects
  useEffect(() => {
    if (animated && clusterRef.current) {
      const element = clusterRef.current;

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

  // Get cluster icon based on dominant type
  const getClusterIcon = useCallback((appointmentType: string) => {
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
      ref={clusterRef}
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
        WebkitTapHighlightColor: isMobile ? 'transparent' : 'auto',
        touchAction: isMobile ? 'manipulation' : 'auto'
      }}
      onClick={isMobile ? undefined : handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      role="button"
      tabIndex={0}
      aria-label={`Cluster with ${cluster.count} appointments`}
      title={`${cluster.count} appointments clustered`}
    >
      {/* Main cluster circle */}
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
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${lightColor} 100%)`,
          boxShadow: isSelected
            ? `0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px ${primaryColor}40`
            : `0 4px 12px ${primaryColor}40`,
          borderColor: isSelected ? '#3B82F6' : 'white'
        }}
      >
        {/* Cluster icon */}
        <div
          className={`${sizeConfig.icon} text-white`}
          style={{ color: 'white' }}
        >
          {getClusterIcon(dominantType)}
        </div>

        {/* Count badge */}
        {showCount && (
          <div
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full border-2 border-white shadow-lg min-w-[20px] h-5 flex items-center justify-center px-1"
            style={{
              fontSize: isMobile ? '10px' : '9px',
              fontWeight: 'bold'
            }}
          >
            {cluster.count}
          </div>
        )}

        {/* Inner glow effect */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle at center, white 0%, transparent 70%)`
          }}
        />
      </div>

      {/* Cluster label - Always visible on mobile when selected */}
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
          borderColor: primaryColor,
          borderWidth: '1px'
        }}
      >
        {/* Cluster count */}
        <div className="font-semibold">
          {cluster.count} appointment{cluster.count !== 1 ? 's' : ''}
        </div>

        {/* Type breakdown */}
        {showTypeBreakdown && Object.keys(typeBreakdown).length > 1 && (
          <div className="text-xs opacity-90 mt-1">
            {Object.entries(typeBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 2)
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getAppointmentTypeColor(type as any, 'primary') }}
                  />
                  {type.replace('_', ' ')}: {count}
                </div>
              ))}
            {Object.keys(typeBreakdown).length > 2 && (
              <div className="text-xs opacity-75">
                +{Object.keys(typeBreakdown).length - 2} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ripple effect for click animation */}
      {isAnimating && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${lightColor} 100%)`,
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

export default MapCluster;
