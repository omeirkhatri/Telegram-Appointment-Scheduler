'use client';

import type { Appointment } from '@/types';
import {
    getEditSourceDisplayName,
    getTimeSinceLastExternalEdit,
    hasExternalEdits,
    isLastEditExternal
} from '@/types/appointment';
import { AlertCircle, Clock, ExternalLink, Info } from 'lucide-react';

interface ExternalEditIndicatorProps {
  appointment: Appointment;
  variant?: 'badge' | 'detailed' | 'compact';
  showTimestamp?: boolean;
  showSource?: boolean;
  className?: string;
}

export function ExternalEditIndicator({
  appointment,
  variant = 'badge',
  showTimestamp = true,
  showSource = true,
  className = '',
}: ExternalEditIndicatorProps) {
  const hasExternal = hasExternalEdits(appointment);
  const isLastExternal = isLastEditExternal(appointment);
  const timeSince = getTimeSinceLastExternalEdit(appointment);
  const source = appointment.last_external_edit_source;

  if (!hasExternal && !isLastExternal) {
    return null;
  }

  const getVariantStyles = () => {
    if (isLastExternal) {
      return {
        container: 'bg-orange-50 border-orange-200 text-orange-800',
        icon: 'text-orange-600',
        badge: 'bg-orange-100 text-orange-800 border-orange-300',
      };
    } else {
      return {
        container: 'bg-blue-50 border-blue-200 text-blue-800',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    }
  };

  const styles = getVariantStyles();

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        <ExternalLink className={`w-3 h-3 ${styles.icon}`} />
        {(hasExternal || isLastExternal) && (
          <span className="text-xs font-medium">External</span>
        )}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${styles.badge} ${className}`}>
        <ExternalLink className="w-3 h-3" />
        <span>
          {isLastExternal ? 'External Edit' : 'Has External Edits'}
        </span>
        {showSource && source && (
          <span className="opacity-75">
            ({getEditSourceDisplayName(source)})
          </span>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={`p-3 rounded-lg border ${styles.container} ${className}`}>
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0">
          {isLastExternal ? (
            <AlertCircle className={`w-4 h-4 ${styles.icon} mt-0.5`} />
          ) : (
            <Info className={`w-4 h-4 ${styles.icon} mt-0.5`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium">
              {isLastExternal ? 'Recently Edited Externally' : 'Has External Edits'}
            </span>
            {showSource && source && (
              <span className="text-xs opacity-75">
                via {getEditSourceDisplayName(source)}
              </span>
            )}
          </div>

          <div className="text-xs space-y-1">
            {showTimestamp && timeSince && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Last external edit: {timeSince}</span>
              </div>
            )}

            {appointment.external_edit_count && appointment.external_edit_count > 1 && (
              <div className="text-xs opacity-75">
                Total external edits: {appointment.external_edit_count}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExternalEditBadgeProps {
  appointment: Appointment;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ExternalEditBadge({
  appointment,
  size = 'sm',
  className = ''
}: ExternalEditBadgeProps) {
  const hasExternal = hasExternalEdits(appointment);
  const isLastExternal = isLastEditExternal(appointment);

  if (!hasExternal && !isLastExternal) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClass = isLastExternal ? 'bg-orange-500' : 'bg-blue-500';

  return (
    <div
      className={`${sizeClasses[size]} ${colorClass} rounded-full border-2 border-white shadow-sm ${className}`}
      title={isLastExternal ? 'Recently edited externally' : 'Has external edits'}
    />
  );
}

interface ExternalEditTooltipProps {
  appointment: Appointment;
  children: React.ReactNode;
  className?: string;
}

export function ExternalEditTooltip({
  appointment,
  children,
  className = ''
}: ExternalEditTooltipProps) {
  const hasExternal = hasExternalEdits(appointment);
  const isLastExternal = isLastEditExternal(appointment);
  const timeSince = getTimeSinceLastExternalEdit(appointment);
  const source = appointment.last_external_edit_source;

  if (!hasExternal && !isLastExternal) {
    return <>{children}</>;
  }

  const tooltipContent = (
    <div className="text-xs space-y-1">
      <div className="font-medium">
        {isLastExternal ? 'Recently Edited Externally' : 'Has External Edits'}
      </div>
      {source && (
        <div>Source: {getEditSourceDisplayName(source)}</div>
      )}
      {timeSince && (
        <div>Last edit: {timeSince}</div>
      )}
      {appointment.external_edit_count && appointment.external_edit_count > 1 && (
        <div>Total edits: {appointment.external_edit_count}</div>
      )}
    </div>
  );

  return (
    <div className={`relative group ${className}`}>
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
        {tooltipContent}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
