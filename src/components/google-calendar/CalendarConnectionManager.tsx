'use client';

import {
    AlertCircle,
    CheckCircle,
    ExternalLink,
    Info,
    Link,
    Plus,
    Unlink,
    X
} from 'lucide-react';
import { useState } from 'react';

interface CalendarConnectionManagerProps {
  onConnectionAdded?: (connection: any) => void;
  onConnectionRemoved?: (connectionId: string) => void;
  className?: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  google_calendar_id?: string;
}

export function CalendarConnectionManager({
  onConnectionAdded,
  onConnectionRemoved,
  className = ''
}: CalendarConnectionManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [calendarId, setCalendarId] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();

      if (data.success) {
        setStaff(data.data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchStaff();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedStaff('');
    setCalendarId('');
    setValidationResult(null);
  };

  const validateCalendarId = async () => {
    if (!calendarId.trim()) {
      setValidationResult({
        isValid: false,
        message: 'Please enter a calendar ID'
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/staff/validate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId: calendarId.trim() })
      });

      const data = await response.json();

      setValidationResult({
        isValid: data.success,
        message: data.success ? 'Calendar ID is valid and accessible' : data.error
      });
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: 'Failed to validate calendar ID'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedStaff || !calendarId.trim() || !validationResult?.isValid) {
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch(`/api/staff/${selectedStaff}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_calendar_id: calendarId.trim()
        })
      });

      if (response.ok) {
        const staffMember = staff.find(s => s.id === selectedStaff);
        if (staffMember) {
          onConnectionAdded?.({
            id: selectedStaff,
            staffName: `${staffMember.first_name} ${staffMember.last_name}`,
            calendarId: calendarId.trim()
          });
        }
        handleClose();
      } else {
        const errorData = await response.json();
        setValidationResult({
          isValid: false,
          message: errorData.error || 'Failed to connect calendar'
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: 'Failed to connect calendar'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (staffId: string) => {
    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_calendar_id: null })
      });

      if (response.ok) {
        onConnectionRemoved?.(staffId);
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  const staffWithoutCalendar = staff.filter(s => !s.google_calendar_id);
  const staffWithCalendar = staff.filter(s => s.google_calendar_id);

  return (
    <div className={className}>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        Manage Calendar Connections
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Link className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Calendar Connection Manager</h3>
                    <p className="text-sm text-gray-600">Connect or disconnect Google Calendar for staff members</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Add New Connection */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Add New Connection</h4>

                <div className="space-y-4">
                  {/* Staff Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Staff Member
                    </label>
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a staff member...</option>
                      {staffWithoutCalendar.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.first_name} {member.last_name} ({member.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Calendar ID Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Calendar ID
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                        placeholder="staff@example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={validateCalendarId}
                        disabled={!calendarId.trim() || isValidating}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isValidating ? 'Validating...' : 'Validate'}
                      </button>
                    </div>

                    {/* Validation Result */}
                    {validationResult && (
                      <div className={`mt-2 p-3 rounded-lg flex items-center space-x-2 ${
                        validationResult.isValid
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        {validationResult.isValid ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm ${
                          validationResult.isValid ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {validationResult.message}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Connect Button */}
                  <button
                    onClick={handleConnect}
                    disabled={!selectedStaff || !calendarId.trim() || !validationResult?.isValid || isConnecting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Calendar'}
                  </button>
                </div>
              </div>

              {/* Existing Connections */}
              {staffWithCalendar.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    Existing Connections ({staffWithCalendar.length})
                  </h4>

                  <div className="space-y-3">
                    {staffWithCalendar.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </h5>
                            <p className="text-xs text-gray-500">
                              {member.google_calendar_id}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => window.open(`https://calendar.google.com/calendar/u/0/r`, '_blank')}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Open in Google Calendar"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDisconnect(member.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Disconnect Calendar"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Help Section */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-blue-900 mb-1">How to Find Your Calendar ID</h5>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• For personal calendars: Use your Gmail address</li>
                      <li>• For shared calendars: Use the calendar's email address</li>
                      <li>• For team calendars: Check the calendar settings in Google Calendar</li>
                      <li>• Ensure the calendar is shared with the service account for full functionality</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
