'use client';

import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    ExternalLink,
    Info,
    Link,
    RefreshCw,
    Settings,
    Unlink,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface GoogleCalendarSectionProps {
  className?: string;
}

interface CalendarConnection {
  id: string;
  calendarId: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync?: string;
  error?: string;
  staffName?: string;
}

export function GoogleCalendarSection({ className = '' }: GoogleCalendarSectionProps) {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchCalendarConnections();
  }, []);

  const fetchCalendarConnections = async () => {
    try {
      setIsLoading(true);
      // Fetch staff members with Google Calendar IDs
      const response = await fetch('/api/staff');
      const data = await response.json();

      if (data.success) {
        const staffWithCalendars = data.data.filter((staff: any) => staff.google_calendar_id);

        // Check connection status for each calendar
        const connectionPromises = staffWithCalendars.map(async (staff: any) => {
          try {
            const statusResponse = await fetch('/api/staff/validate-calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ calendarId: staff.google_calendar_id }),
            });

            const statusData = await statusResponse.json();

            return {
              id: staff.id,
              calendarId: staff.google_calendar_id,
              status: statusData.success ? 'connected' : 'error',
              lastSync: new Date().toISOString(),
              error: statusData.success ? undefined : statusData.error,
              staffName: `${staff.first_name} ${staff.last_name}`,
            };
          } catch (error) {
            return {
              id: staff.id,
              calendarId: staff.google_calendar_id,
              status: 'error' as const,
              error: 'Connection test failed',
              staffName: `${staff.first_name} ${staff.last_name}`,
            };
          }
        });

        const connectionResults = await Promise.all(connectionPromises);
        setConnections(connectionResults);
      }
    } catch (error) {
      console.error('Error fetching calendar connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCalendarConnections();
    setIsRefreshing(false);
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      // Remove Google Calendar ID from staff member
      const response = await fetch(`/api/staff/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_calendar_id: null }),
      });

      if (response.ok) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'syncing':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Error';
      case 'syncing':
        return 'Syncing...';
      default:
        return 'Disconnected';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'syncing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading calendar connections...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Google Calendar Integration</h3>
              <p className="text-sm text-gray-600">Manage calendar connections and sync status</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sync Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h4 className="text-md font-medium text-gray-900 mb-4">Sync Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Auto-sync appointments</p>
                <p className="text-xs text-gray-500">Automatically sync new appointments to Google Calendar</p>
              </div>
              <button className="w-12 h-6 bg-blue-600 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Bidirectional sync</p>
                <p className="text-xs text-gray-500">Sync changes from Google Calendar back to system</p>
              </div>
              <button className="w-12 h-6 bg-blue-600 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Conflict resolution</p>
                <p className="text-xs text-gray-500">Automatically resolve sync conflicts</p>
              </div>
              <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Sync reminders</p>
                <p className="text-xs text-gray-500">Include appointment reminders in calendar events</p>
              </div>
              <button className="w-12 h-6 bg-blue-600 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connections List */}
      <div className="p-6">
        {connections.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Calendar Connections</h4>
            <p className="text-gray-600 mb-4">
              No staff members have Google Calendar integration configured yet.
            </p>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Link className="w-4 h-4 mr-2" />
              Configure Calendar Integration
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">
                Connected Calendars ({connections.length})
              </h4>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Info className="w-4 h-4" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {connections.map((connection) => (
              <div
                key={connection.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(connection.status)}
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">
                        {connection.staffName}
                      </h5>
                      <p className="text-xs text-gray-500">
                        {connection.calendarId}
                      </p>
                      {connection.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {connection.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(connection.status)}`}>
                      {getStatusText(connection.status)}
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => window.open('https://calendar.google.com/calendar/u/0/r', '_blank')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Open in Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDisconnect(connection.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Disconnect Calendar"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {connection.lastSync && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Last sync: {new Date(connection.lastSync).toLocaleString()}</span>
                      <span>Status: {connection.status}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">How to Connect Google Calendar</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Staff members can add their Google Calendar ID in their profile settings</li>
              <li>• The system will automatically sync appointments to their calendar</li>
              <li>• Changes made in Google Calendar will be reflected in the system</li>
              <li>• Ensure the calendar is shared with the service account for full functionality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
