'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  RotateCcw,
  Bell,
  Link2,
  Shield
} from 'lucide-react';

interface SyncSettingsPanelProps {
  className?: string;
}

interface SyncSettings {
  autoSyncAppointments: boolean;
  bidirectionalSync: boolean;
  conflictResolution: boolean;
  syncReminders: boolean;
  syncInterval: number;
  retryAttempts: number;
  webhookEnabled: boolean;
  lastUpdated: string;
}

export function SyncSettingsPanel({ className = '' }: SyncSettingsPanelProps) {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/google-calendar/sync-settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
      } else {
        setSaveStatus({
          type: 'error',
          message: data.error || 'Failed to load settings'
        });
      }
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: 'Failed to load settings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/google-calendar/sync-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      
      if (data.success) {
        setSaveStatus({
          type: 'success',
          message: 'Settings saved successfully'
        });
        setSettings(data.data);
      } else {
        setSaveStatus({
          type: 'error',
          message: data.error || 'Failed to save settings'
        });
      }
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: 'Failed to save settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (key: keyof SyncSettings, value: any) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleReset = () => {
    if (settings) {
      setSettings({
        autoSyncAppointments: true,
        bidirectionalSync: true,
        conflictResolution: false,
        syncReminders: true,
        syncInterval: 300,
        retryAttempts: 3,
        webhookEnabled: true,
        lastUpdated: new Date().toISOString()
      });
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading sync settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Unable to load sync settings</p>
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
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sync Settings</h3>
              <p className="text-sm text-gray-600">Configure Google Calendar synchronization behavior</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset to Defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={fetchSettings}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh Settings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus.type && (
        <div className={`p-4 border-b border-gray-200 ${
          saveStatus.type === 'success' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {saveStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              saveStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {saveStatus.message}
            </span>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="p-6 space-y-6">
        {/* Basic Sync Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Link2 className="w-4 h-4 mr-2" />
            Basic Sync Settings
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Auto-sync appointments</p>
                <p className="text-xs text-gray-500">Automatically sync new appointments to Google Calendar</p>
              </div>
              <button
                onClick={() => handleSettingChange('autoSyncAppointments', !settings.autoSyncAppointments)}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  settings.autoSyncAppointments ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  settings.autoSyncAppointments ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Bidirectional sync</p>
                <p className="text-xs text-gray-500">Sync changes from Google Calendar back to system</p>
              </div>
              <button
                onClick={() => handleSettingChange('bidirectionalSync', !settings.bidirectionalSync)}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  settings.bidirectionalSync ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  settings.bidirectionalSync ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Sync reminders</p>
                <p className="text-xs text-gray-500">Include appointment reminders in calendar events</p>
              </div>
              <button
                onClick={() => handleSettingChange('syncReminders', !settings.syncReminders)}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  settings.syncReminders ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  settings.syncReminders ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Advanced Settings
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Conflict resolution</p>
                <p className="text-xs text-gray-500">Automatically resolve sync conflicts</p>
              </div>
              <button
                onClick={() => handleSettingChange('conflictResolution', !settings.conflictResolution)}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  settings.conflictResolution ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  settings.conflictResolution ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Webhook enabled</p>
                <p className="text-xs text-gray-500">Enable real-time sync via webhooks</p>
              </div>
              <button
                onClick={() => handleSettingChange('webhookEnabled', !settings.webhookEnabled)}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  settings.webhookEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  settings.webhookEnabled ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Timing Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Timing Settings
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Interval (seconds)
              </label>
              <input
                type="number"
                min="60"
                max="3600"
                value={settings.syncInterval}
                onChange={(e) => handleSettingChange('syncInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">How often to check for sync updates (60-3600 seconds)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retry Attempts
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.retryAttempts}
                onChange={(e) => handleSettingChange('retryAttempts', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Number of retry attempts for failed syncs (1-10)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Last updated: {new Date(settings.lastUpdated).toLocaleString()}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
