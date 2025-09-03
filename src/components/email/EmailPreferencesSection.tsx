'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Settings,
  TestTube,
  Upload,
} from 'lucide-react';
import {
  GlobalEmailPreferences,
  DEFAULT_EMAIL_PREFERENCES,
  EMAIL_PREFERENCE_CATEGORIES,
  EmailPreferenceField,
} from '@/types/emailPreferences';

interface EmailPreferencesSectionProps {
  className?: string;
}

interface ApiResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

export function EmailPreferencesSection({ className = '' }: EmailPreferencesSectionProps) {
  const [preferences, setPreferences] = useState<GlobalEmailPreferences>(DEFAULT_EMAIL_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');

  // Load preferences on component mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/preferences');
      const data = await response.json();

      if (data.success) {
        setPreferences(data.data);
      } else {
        setResult({
          success: false,
          message: 'Failed to load preferences',
          error: data.error,
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

  const savePreferences = async () => {
    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Email preferences saved successfully',
        });
        setPreferences(data.data);
      } else {
        setResult({
          success: false,
          message: 'Failed to save preferences',
          error: data.error,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to save preferences',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Email preferences reset to defaults',
        });
        setPreferences(data.data);
      } else {
        setResult({
          success: false,
          message: 'Failed to reset preferences',
          error: data.error,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to reset preferences',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testEmailConfiguration = async () => {
    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test' }),
      });

      const data = await response.json();

      setResult({
        success: data.success,
        message: data.message,
        error: data.error,
      });
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to test email configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportPreferences = async () => {
    try {
      const response = await fetch('/api/email/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'export' }),
      });

      const data = await response.json();

      if (data.success) {
        // Download the JSON file
        const blob = new Blob([data.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'email-preferences.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setResult({
          success: true,
          message: 'Email preferences exported successfully',
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to export preferences',
          error: data.error,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to export preferences',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const importPreferences = async () => {
    if (!importData.trim()) {
      setResult({
        success: false,
        message: 'Please enter JSON data to import',
      });
      return;
    }

    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'import', preferencesJson: importData }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Email preferences imported successfully',
        });
        setPreferences(data.data);
        setShowImportModal(false);
        setImportData('');
      } else {
        setResult({
          success: false,
          message: 'Failed to import preferences',
          error: data.error,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to import preferences',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof GlobalEmailPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderField = (field: EmailPreferenceField) => {
    const value = preferences[field.id];

    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[--foreground]">{field.label}</p>
              {field.description && (
                <p className="text-xs text-[--muted-foreground]">{field.description}</p>
              )}
            </div>
            <button
              onClick={() => handlePreferenceChange(field.id, !value)}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                value ? 'bg-[--primary]' : 'bg-[--muted]'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  value ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        );

      case 'number':
        return (
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-[--muted-foreground] mb-2">{field.description}</p>
            )}
            <input
              type="number"
              value={value}
              onChange={(e) => handlePreferenceChange(field.id, Number(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.step}
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
            />
          </div>
        );

      case 'string':
        return (
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-[--muted-foreground] mb-2">{field.description}</p>
            )}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handlePreferenceChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
            />
          </div>
        );

      case 'time':
        return (
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-[--muted-foreground] mb-2">{field.description}</p>
            )}
            <input
              type="time"
              value={value || ''}
              onChange={(e) => handlePreferenceChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
            />
          </div>
        );

      case 'select':
        return (
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-[--muted-foreground] mb-2">{field.description}</p>
            )}
            <select
              value={value || ''}
              onChange={(e) => handlePreferenceChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
            >
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[--primary]" />
          <span className="ml-2 text-[--muted-foreground]">Loading email preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Mail className="w-6 h-6 text-[--primary]" />
          <h3 className="text-lg font-semibold text-[--foreground]">Email Preferences</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={testEmailConfiguration}
            disabled={isSaving}
            className="px-3 py-1 text-sm border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground] disabled:opacity-50"
          >
            <TestTube className="w-4 h-4 inline mr-1" />
            Test
          </button>
          <button
            onClick={exportPreferences}
            className="px-3 py-1 text-sm border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground]"
          >
            <Download className="w-4 h-4 inline mr-1" />
            Export
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1 text-sm border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground]"
          >
            <Upload className="w-4 h-4 inline mr-1" />
            Import
          </button>
          <button
            onClick={resetToDefaults}
            disabled={isSaving}
            className="px-3 py-1 text-sm border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] hover:text-[--foreground] disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 inline mr-1" />
            Reset
          </button>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            result.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{result.message}</span>
          </div>
          {result.error && (
            <p className="mt-1 text-sm opacity-90">{result.error}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {EMAIL_PREFERENCE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeCategory === category.id
                    ? 'bg-[--primary] text-[--primary-foreground]'
                    : 'hover:bg-[--accent] text-[--foreground]'
                }`}
              >
                <div className="font-medium">{category.title}</div>
                <div className="text-xs opacity-75">{category.description}</div>
              </button>
            ))}
          </nav>
        </div>

        {/* Category Content */}
        <div className="lg:col-span-3">
          {EMAIL_PREFERENCE_CATEGORIES.map((category) => (
            activeCategory === category.id && (
              <div key={category.id} className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-[--foreground]">{category.title}</h4>
                  <p className="text-sm text-[--muted-foreground]">{category.description}</p>
                </div>
                <div className="space-y-4">
                  {category.fields.map((field) => (
                    <div key={field.id} className="p-4 border border-[--border] rounded-lg">
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6 pt-6 border-t border-[--border]">
        <button
          onClick={savePreferences}
          disabled={isSaving}
          className="px-6 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 inline mr-2" />
              Save Preferences
            </>
          )}
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold text-[--foreground] mb-4">Import Email Preferences</h3>
            <p className="text-sm text-[--muted-foreground] mb-4">
              Paste the JSON data from an exported preferences file:
            </p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste JSON data here..."
              className="w-full h-64 px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent font-mono text-sm"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                }}
                className="px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground]"
              >
                Cancel
              </button>
              <button
                onClick={importPreferences}
                disabled={isSaving || !importData.trim()}
                className="px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
