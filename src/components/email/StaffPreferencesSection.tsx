'use client';

import { useStaff } from '@/hooks/useStaff';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Loader2,
    Mail,
    RefreshCw,
    Save,
    Settings,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface StaffPreferencesSectionProps {
  className?: string;
}

interface StaffPreference {
  staffId: string;
  emailNotificationsEnabled: boolean;
  dailyAgendaEnabled: boolean;
  agendaTime: string;
  timezone: string;
}

interface BulkPreferenceUpdate {
  emailNotificationsEnabled?: boolean;
  dailyAgendaEnabled?: boolean;
  agendaTime?: string;
  timezone?: string;
}

export function StaffPreferencesSection({ className = '' }: StaffPreferencesSectionProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [preferences, setPreferences] = useState<StaffPreference | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdate, setBulkUpdate] = useState<BulkPreferenceUpdate>({});
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const { staff, isLoading: staffLoading, error: staffError, refresh: refreshStaff } = useStaff({
    autoFetch: true,
  });

  // Load preferences when staff is selected
  useEffect(() => {
    if (selectedStaffId) {
      loadStaffPreferences(selectedStaffId);
    } else {
      setPreferences(null);
    }
  }, [selectedStaffId]);

  const loadStaffPreferences = async (staffId: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/email/daily-agenda?staffId=${staffId}`);
      const data = await response.json();

      if (data.success && data.data.preferences) {
        setPreferences({
          staffId: staffId,
          emailNotificationsEnabled: data.data.preferences.emailNotificationsEnabled,
          dailyAgendaEnabled: data.data.preferences.dailyAgendaEnabled,
          agendaTime: data.data.preferences.agendaTime || '06:00',
          timezone: data.data.preferences.timezone || 'Asia/Dubai',
        });
      } else {
        // Set default preferences if none exist
        setPreferences({
          staffId: staffId,
          emailNotificationsEnabled: true,
          dailyAgendaEnabled: true,
          agendaTime: '06:00',
          timezone: 'Asia/Dubai',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to load preferences',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (field: keyof StaffPreference, value: any) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        [field]: value,
      });
    }
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;

    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/daily-agenda', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId: preferences.staffId,
          preferences: {
            emailNotificationsEnabled: preferences.emailNotificationsEnabled,
            dailyAgendaEnabled: preferences.dailyAgendaEnabled,
            agendaTime: preferences.agendaTime,
            timezone: preferences.timezone,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Preferences updated successfully',
        });
        // Refresh staff data to reflect changes
        refreshStaff();
      } else {
        setResult({
          success: false,
          message: 'Failed to update preferences',
          error: data.error || 'Unknown error',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to update preferences',
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedStaffIds.length === 0) {
      setResult({
        success: false,
        message: 'Please select at least one staff member',
        error: 'No staff selected',
      });
      return;
    }

    setIsSaving(true);
    setResult(null);

    try {
      const updatePromises = selectedStaffIds.map(staffId =>
        fetch('/api/email/daily-agenda', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            staffId,
            preferences: bulkUpdate,
          }),
        }),
      );

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(r => r.json()));

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (failureCount === 0) {
        setResult({
          success: true,
          message: `Successfully updated preferences for ${successCount} staff members`,
        });
      } else {
        setResult({
          success: false,
          message: `Updated ${successCount} staff members, ${failureCount} failed`,
          error: 'Some updates failed',
        });
      }

      // Clear bulk update form
      setSelectedStaffIds([]);
      setBulkUpdate({});
      setShowBulkUpdate(false);

      // Refresh staff data
      refreshStaff();
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to update preferences',
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  return (
    <div className={`bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-[--primary]" />
          <h3 className="text-lg font-semibold text-[--foreground]">Staff Email Preferences</h3>
        </div>
        <button
          onClick={() => setShowBulkUpdate(!showBulkUpdate)}
          className="flex items-center space-x-2 px-3 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground]"
        >
          <Users className="w-4 h-4" />
          <span>Bulk Update</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Staff Selection */}
        <div>
          <label className="block text-sm font-medium text-[--foreground] mb-2">
            Select Staff Member
          </label>
          {staffLoading ? (
            <div className="flex items-center space-x-2 text-[--muted-foreground]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading staff...</span>
            </div>
          ) : staffError ? (
            <div className="flex items-center space-x-2 text-[--destructive]">
              <AlertCircle className="w-4 h-4" />
              <span>Error loading staff: {staffError}</span>
            </div>
          ) : (
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
            >
              <option value="">Choose a staff member...</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name} ({member.email}) - {member.staff_type}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Individual Preferences */}
        {selectedStaffId && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[--primary]" />
                <span className="ml-2 text-[--muted-foreground]">Loading preferences...</span>
              </div>
            ) : preferences ? (
              <div className="bg-[--muted] border border-[--border] rounded-lg p-4 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-[--primary] rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[--foreground]">
                      {selectedStaff?.first_name} {selectedStaff?.last_name}
                    </p>
                    <p className="text-sm text-[--muted-foreground]">
                      {selectedStaff?.email} • {selectedStaff?.staff_type}
                    </p>
                  </div>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-[--muted-foreground]" />
                    <div>
                      <p className="text-sm font-medium text-[--foreground]">Email Notifications</p>
                      <p className="text-xs text-[--muted-foreground]">Receive email notifications</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailNotificationsEnabled}
                      onChange={(e) => handlePreferenceChange('emailNotificationsEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[--muted] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[--ring] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[--border] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--primary]" />
                  </label>
                </div>

                {/* Daily Agenda */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[--muted-foreground]" />
                    <div>
                      <p className="text-sm font-medium text-[--foreground]">Daily Agenda</p>
                      <p className="text-xs text-[--muted-foreground]">Receive daily agenda emails</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.dailyAgendaEnabled}
                      onChange={(e) => handlePreferenceChange('dailyAgendaEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[--muted] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[--ring] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[--border] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--primary]" />
                  </label>
                </div>

                {/* Agenda Time */}
                <div>
                  <label className="block text-sm font-medium text-[--foreground] mb-2">
                    Agenda Time
                  </label>
                  <input
                    type="time"
                    value={preferences.agendaTime}
                    onChange={(e) => handlePreferenceChange('agendaTime', e.target.value)}
                    className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                  />
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-[--foreground] mb-2">
                    Timezone
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                  >
                    <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                    <option value="Europe/London">Europe/London (GMT+0)</option>
                  </select>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSavePreferences}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Preferences</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Bulk Update Section */}
        {showBulkUpdate && (
          <div className="bg-[--muted] border border-[--border] rounded-lg p-4 space-y-4">
            <h4 className="text-md font-semibold text-[--foreground]">Bulk Update Preferences</h4>

            {/* Staff Selection for Bulk Update */}
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-2">
                Select Staff Members
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-[--border] rounded-lg p-2">
                {staff.map((member) => (
                  <label key={member.id} className="flex items-center space-x-2 p-2 hover:bg-[--accent] rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStaffIds([...selectedStaffIds, member.id]);
                        } else {
                          setSelectedStaffIds(selectedStaffIds.filter(id => id !== member.id));
                        }
                      }}
                      className="rounded border-[--border] text-[--primary] focus:ring-[--ring]"
                    />
                    <span className="text-sm text-[--foreground]">
                      {member.first_name} {member.last_name} ({member.staff_type})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bulk Update Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">
                  Email Notifications
                </label>
                <select
                  value={bulkUpdate.emailNotificationsEnabled?.toString() || ''}
                  onChange={(e) => setBulkUpdate({
                    ...bulkUpdate,
                    emailNotificationsEnabled: e.target.value === '' ? undefined : e.target.value === 'true',
                  })}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                >
                  <option value="">No change</option>
                  <option value="true">Enable</option>
                  <option value="false">Disable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">
                  Daily Agenda
                </label>
                <select
                  value={bulkUpdate.dailyAgendaEnabled?.toString() || ''}
                  onChange={(e) => setBulkUpdate({
                    ...bulkUpdate,
                    dailyAgendaEnabled: e.target.value === '' ? undefined : e.target.value === 'true',
                  })}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                >
                  <option value="">No change</option>
                  <option value="true">Enable</option>
                  <option value="false">Disable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">
                  Agenda Time
                </label>
                <input
                  type="time"
                  value={bulkUpdate.agendaTime || ''}
                  onChange={(e) => setBulkUpdate({
                    ...bulkUpdate,
                    agendaTime: e.target.value || undefined,
                  })}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">
                  Timezone
                </label>
                <select
                  value={bulkUpdate.timezone || ''}
                  onChange={(e) => setBulkUpdate({
                    ...bulkUpdate,
                    timezone: e.target.value || undefined,
                  })}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                >
                  <option value="">No change</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                  <option value="America/New_York">America/New_York (GMT-5)</option>
                  <option value="Europe/London">Europe/London (GMT+0)</option>
                </select>
              </div>
            </div>

            {/* Bulk Update Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowBulkUpdate(false);
                  setSelectedStaffIds([]);
                  setBulkUpdate({});
                }}
                className="px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground]"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={isSaving || selectedStaffIds.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Update {selectedStaffIds.length} Staff</span>
              </button>
            </div>
          </div>
        )}

        {/* Result Message */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success
              ? 'bg-[--success]/10 border-[--success]/20 text-[--success]'
              : 'bg-[--destructive]/10 border-[--destructive]/20 text-[--destructive]'
          }`}>
            <div className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <div>
                <p className="font-medium">{result.message}</p>
                {result.error && (
                  <p className="text-sm mt-1 opacity-80">{result.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
