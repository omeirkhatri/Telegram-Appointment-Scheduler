'use client';

import type { Appointment } from '@/types';
import { getEditSourceDisplayName, getTimeSinceLastExternalEdit } from '@/types/appointment';
import { AlertCircle, Clock, ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExternalEditNotificationProps {
  appointment: Appointment;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
  className?: string;
}

export function ExternalEditNotification({
  appointment,
  onDismiss,
  autoDismiss = true,
  autoDismissDelay = 10000, // 10 seconds
  className = '',
}: ExternalEditNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, isVisible]);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300); // Animation duration
  };

  if (!isVisible) {
    return null;
  }

  const timeSince = getTimeSinceLastExternalEdit(appointment);
  const source = appointment.last_external_edit_source;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        bg-orange-50 border border-orange-200 rounded-lg shadow-lg
        transform transition-all duration-300 ease-in-out
        ${isDismissing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${className}
      `}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-orange-900">
                External Edit Detected
              </h4>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-orange-400 hover:text-orange-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-orange-800 space-y-1">
              <div className="flex items-center space-x-1">
                <ExternalLink className="w-3 h-3" />
                <span>
                  {appointment.appointment_type} appointment was modified
                </span>
              </div>

              {source && (
                <div className="text-xs text-orange-700">
                  Source: {getEditSourceDisplayName(source)}
                </div>
              )}

              {timeSince && (
                <div className="flex items-center space-x-1 text-xs text-orange-700">
                  <Clock className="w-3 h-3" />
                  <span>{timeSince}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExternalEditToastProps {
  appointment: Appointment;
  onDismiss?: () => void;
  className?: string;
}

export function ExternalEditToast({
  appointment,
  onDismiss,
  className = '',
}: ExternalEditToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  const timeSince = getTimeSinceLastExternalEdit(appointment);
  const source = appointment.last_external_edit_source;

  return (
    <div
      className={`
        bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2
        transform transition-all duration-200 ease-in-out
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ExternalLink className="w-4 h-4 text-orange-600" />
          <div className="text-sm">
            <span className="font-medium text-orange-900">
              External edit detected
            </span>
            {source && (
              <span className="text-orange-700 ml-1">
                via {getEditSourceDisplayName(source)}
              </span>
            )}
            {timeSince && (
              <span className="text-orange-600 ml-1">
                ({timeSince})
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-orange-400 hover:text-orange-600 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface ExternalEditBannerProps {
  appointments: Appointment[];
  onDismiss?: () => void;
  className?: string;
}

export function ExternalEditBanner({
  appointments,
  onDismiss,
  className = '',
}: ExternalEditBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || appointments.length === 0) {
    return null;
  }

  const recentExternalEdits = appointments.filter(apt => {
    const timeSince = getTimeSinceLastExternalEdit(apt);
    return timeSince && (
      timeSince.includes('minute') ||
      timeSince.includes('hour') ||
      (timeSince.includes('day') && parseInt(timeSince) <= 1)
    );
  });

  if (recentExternalEdits.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        bg-orange-50 border-l-4 border-orange-400 p-4 mb-4
        transform transition-all duration-200 ease-in-out
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <div>
            <h4 className="text-sm font-medium text-orange-900">
              Recent External Edits
            </h4>
            <p className="text-sm text-orange-700">
              {recentExternalEdits.length} appointment{recentExternalEdits.length !== 1 ? 's' : ''}
              {' '}modified externally in the last 24 hours
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-orange-400 hover:text-orange-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
