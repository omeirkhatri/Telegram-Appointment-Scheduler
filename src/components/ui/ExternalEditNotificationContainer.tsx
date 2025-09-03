'use client';

import { useExternalEditNotifications } from '@/hooks/useExternalEditNotifications';
import type { Appointment } from '@/types';
import { ExternalEditNotification } from './ExternalEditNotification';

interface ExternalEditNotificationContainerProps {
  appointments: Appointment[];
  className?: string;
}

export function ExternalEditNotificationContainer({
  appointments,
  className = '',
}: ExternalEditNotificationContainerProps) {
  const {
    notifications,
    dismissNotification,
    dismissAllNotifications,
    hasNotifications,
  } = useExternalEditNotifications({
    appointments,
    autoDismissDelay: 10000, // 10 seconds
    maxNotifications: 3,
  });

  if (!hasNotifications) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm ${className}`}>
      {notifications.map(notification => (
        <ExternalEditNotification
          key={notification.id}
          appointment={notification.appointment}
          onDismiss={() => dismissNotification(notification.id)}
          autoDismiss={true}
          autoDismissDelay={10000}
        />
      ))}
    </div>
  );
}

// Component for showing notifications in a specific area (like a sidebar)
export function ExternalEditNotificationSidebar({
  appointments,
  className = '',
}: ExternalEditNotificationContainerProps) {
  const {
    notifications,
    dismissNotification,
    recentExternalEditsCount,
  } = useExternalEditNotifications({
    appointments,
    autoDismissDelay: 30000, // 30 seconds for sidebar
    maxNotifications: 10,
  });

  if (recentExternalEditsCount === 0) {
    return null;
  }

  return (
    <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-orange-900">
          Recent External Edits
        </h3>
        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
          {recentExternalEditsCount}
        </span>
      </div>

      <div className="space-y-2">
        {notifications.slice(0, 5).map(notification => (
          <div
            key={notification.id}
            className="bg-white border border-orange-200 rounded p-2 text-xs"
          >
            <div className="font-medium text-gray-900">
              {notification.appointment.appointment_type}
            </div>
            <div className="text-gray-600">
              {notification.appointment.last_external_edit_source === 'google_calendar'
                ? 'Google Calendar'
                : 'External'}
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="text-orange-600 hover:text-orange-800 mt-1"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
