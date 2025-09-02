'use client';

import { useStaff } from '@/hooks/useStaff';
import { AlertCircle, Calendar, CheckCircle, Loader2, Mail, Send, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmailTestSectionProps {
  className?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  error?: string;
}

export function EmailTestSection({ className = '' }: EmailTestSectionProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [testDate, setTestDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const { staff, isLoading: staffLoading, error: staffError } = useStaff({
    initialFilters: { status: 'active' },
    autoFetch: true
  });

  // Filter staff to only those with email notifications enabled
  const eligibleStaff = staff.filter(member =>
    member.email_notifications_enabled &&
    member.email &&
    member.email.trim() !== ''
  );

  // Set default test date to today
  useEffect(() => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    setTestDate(dateString);
  }, []);

  const handleSendTestAgenda = async () => {
    if (!selectedStaffId) {
      setTestResult({
        success: false,
        message: 'Please select a staff member',
        error: 'No staff member selected'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/email/daily-agenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId: selectedStaffId,
          date: testDate,
          testMode: true
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `Test agenda sent successfully to ${eligibleStaff.find(s => s.id === selectedStaffId)?.email}`
        });
      } else {
        setTestResult({
          success: false,
          message: 'Failed to send test agenda',
          error: data.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to send test agenda',
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewAgenda = async () => {
    if (!selectedStaffId) {
      setTestResult({
        success: false,
        message: 'Please select a staff member',
        error: 'No staff member selected'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/email/daily-agenda?staffId=${selectedStaffId}&date=${testDate}`);
      const data = await response.json();

      if (data.success) {
        setPreviewData(data.data);
        setShowPreview(true);
      } else {
        setTestResult({
          success: false,
          message: 'Failed to load agenda preview',
          error: data.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to load agenda preview',
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStaff = eligibleStaff.find(s => s.id === selectedStaffId);

  return (
    <div className={`bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center space-x-2 mb-6">
        <Mail className="w-5 h-5 text-[--primary]" />
        <h3 className="text-lg font-semibold text-[--foreground]">Email Testing</h3>
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
          ) : eligibleStaff.length === 0 ? (
            <div className="flex items-center space-x-2 text-[--muted-foreground]">
              <AlertCircle className="w-4 h-4" />
              <span>No staff members with email notifications enabled</span>
            </div>
          ) : (
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
            >
              <option value="">Choose a staff member...</option>
              {eligibleStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name} ({member.email}) - {member.staff_type}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Test Date */}
        <div>
          <label className="block text-sm font-medium text-[--foreground] mb-2">
            Test Date
          </label>
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
          />
        </div>

        {/* Selected Staff Info */}
        {selectedStaff && (
          <div className="bg-[--muted] border border-[--border] rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[--primary] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-[--foreground]">
                  {selectedStaff.first_name} {selectedStaff.last_name}
                </p>
                <p className="text-sm text-[--muted-foreground]">
                  {selectedStaff.email} • {selectedStaff.staff_type}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handlePreviewAgenda}
            disabled={!selectedStaffId || isLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="w-4 h-4" />
            <span>Preview Agenda</span>
          </button>

          <button
            onClick={handleSendTestAgenda}
            disabled={!selectedStaffId || isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Send Test Agenda</span>
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success
              ? 'bg-[--success]/10 border-[--success]/20 text-[--success]'
              : 'bg-[--destructive]/10 border-[--destructive]/20 text-[--destructive]'
          }`}>
            <div className="flex items-center space-x-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <div>
                <p className="font-medium">{testResult.message}</p>
                {testResult.error && (
                  <p className="text-sm mt-1 opacity-80">{testResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Agenda Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[--card] border border-[--border] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-[--border]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[--foreground]">
                    Agenda Preview - {previewData.date}
                  </h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-[--muted-foreground] hover:text-[--foreground] transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="prose prose-sm max-w-none">
                  <div
                    className="text-[--foreground]"
                    dangerouslySetInnerHTML={{ __html: previewData.agenda?.html || 'No agenda content available' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
