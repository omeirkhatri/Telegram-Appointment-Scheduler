'use client';

import type { Appointment } from '@/types';
import { getTimeSinceLastExternalEdit, isLastEditExternal } from '@/types/appointment';
import { useCallback, useEffect, useState } from 'react';

interface ExternalEditNotification {
  id: string;
  appointment: Appointment;
  timestamp: string;
  dismissed: boolean;
}

interface UseExternalEditNotificationsProps {
  appointments: Appointment[];
  autoDismissDelay?: number;
  maxNotifications?: number;
}

export function useExternalEditNotifications({
  appointments,
  autoDismissDelay = 10000, // 10 seconds
  maxNotifications = 5,
}: UseExternalEditNotificationsProps) {
  const [notifications, setNotifications] = useState<ExternalEditNotification[]>([]);
  const [lastProcessedAppointments, setLastProcessedAppointments] = useState<Set<string>>(new Set());

  // Check for new external edits
  const checkForExternalEdits = useCallback(() => {
    const now = new Date();
    const recentThreshold = new Date(now.getTime() - 5 * 60 * 1000); // Last 5 minutes

    const newNotifications: ExternalEditNotification[] = [];

    appointments.forEach(appointment => {
      // Skip if we've already processed this appointment
      if (lastProcessedAppointments.has(appointment.id)) {
        return;
      }

      // Check if this appointment has recent external edits
      if (isLastEditExternal(appointment) && appointment.last_external_edit) {
        const lastEditTime = new Date(appointment.last_external_edit);

        if (lastEditTime > recentThreshold) {
          newNotifications.push({
            id: `${appointment.id}-${lastEditTime.getTime()}`,
            appointment,
            timestamp: appointment.last_external_edit,
            dismissed: false,
          });
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const combined = [...prev, ...newNotifications];
        // Sort by timestamp (newest first) and limit to maxNotifications
        return combined
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, maxNotifications);
      });

      // Update processed appointments
      setLastProcessedAppointments(prev => {
        const newSet = new Set(prev);
        newNotifications.forEach(notification => {
          newSet.add(notification.appointment.id);
        });
        return newSet;
      });
    }
  }, [appointments, lastProcessedAppointments, maxNotifications]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notifications.length === 0) return;

    const timer = setTimeout(() => {
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          dismissed: true,
        }))
      );

      // Remove dismissed notifications after animation
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => !n.dismissed));
      }, 300);
    }, autoDismissDelay);

    return () => clearTimeout(timer);
  }, [notifications.length, autoDismissDelay]);

  // Check for external edits when appointments change
  useEffect(() => {
    checkForExternalEdits();
  }, [checkForExternalEdits]);

  // Manual dismiss notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, dismissed: true }
          : notification
      )
    );

    // Remove after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, 300);
  }, []);

  // Dismiss all notifications
  const dismissAllNotifications = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, dismissed: true }))
    );

    setTimeout(() => {
      setNotifications([]);
    }, 300);
  }, []);

  // Get active (non-dismissed) notifications
  const activeNotifications = notifications.filter(n => !n.dismissed);

  // Get recent external edits count
  const recentExternalEditsCount = appointments.filter(appointment => {
    if (!isLastEditExternal(appointment) || !appointment.last_external_edit) {
      return false;
    }

    const lastEditTime = new Date(appointment.last_external_edit);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return lastEditTime > oneHourAgo;
  }).length;

  return {
    notifications: activeNotifications,
    recentExternalEditsCount,
    dismissNotification,
    dismissAllNotifications,
    hasNotifications: activeNotifications.length > 0,
  };
}

// Hook for managing external edit notifications in a specific component
export function useExternalEditNotification(appointment: Appointment) {
  const [showNotification, setShowNotification] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);

  useEffect(() => {
    // Show notification if this appointment was recently edited externally
    if (isLastEditExternal(appointment) && appointment.last_external_edit && !hasShownNotification) {
      const lastEditTime = new Date(appointment.last_external_edit);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (lastEditTime > fiveMinutesAgo) {
        setShowNotification(true);
        setHasShownNotification(true);
      }
    }
  }, [appointment, hasShownNotification]);

  const dismissNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  return {
    showNotification,
    dismissNotification,
    timeSinceEdit: getTimeSinceLastExternalEdit(appointment),
  };
}
