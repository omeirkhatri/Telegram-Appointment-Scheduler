'use client';

import { useEffect, useState } from 'react';

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: number;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  telegram_user_id?: string;
  telegram_verified?: boolean;
}

export default function TelegramSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<TelegramWebhookInfo | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('https://schedule.n8nbdoc.com/api/telegram/webhook');

  // Load bot information
  const loadBotInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/telegram/send');
      const data = await response.json();

      if (data.success) {
        setBotInfo(data.bot);
        setWebhookInfo(data.webhook);
      } else {
        setTestResult({
          success: false,
          error: data.error,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to load bot information',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load staff members
  const loadStaffMembers = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();

      if (data.success) {
        setStaffMembers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load staff members:', error);
    }
  };

  // Send test message
  const sendTestMessage = async () => {
    if (!selectedStaffId) {
      setTestResult({
        success: false,
        error: 'Please select a staff member',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: selectedStaffId,
          test_message: true,
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to send test message',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set webhook
  const setWebhook = async () => {
    if (!webhookUrl) {
      setTestResult({
        success: false,
        error: 'Please enter a webhook URL',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set_webhook',
          webhook_url: webhookUrl,
        }),
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        // Reload webhook info
        loadBotInfo();
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to set webhook',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete webhook
  const deleteWebhook = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_webhook',
        }),
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        // Reload webhook info
        loadBotInfo();
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to delete webhook',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadBotInfo();
    loadStaffMembers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Bot Status */}
      <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[--foreground] flex items-center space-x-2">
            <span className="text-2xl">🤖</span>
            <span>Bot Status</span>
          </h3>
          <button
            onClick={loadBotInfo}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-[--muted] text-[--muted-foreground] rounded-lg hover:bg-[--accent] transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {botInfo ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="font-medium text-[--foreground]">Bot is online</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[--muted-foreground]">Name:</span>
                <p className="text-[--foreground] font-medium">{botInfo.first_name} {botInfo.last_name || ''}</p>
              </div>
              <div>
                <span className="text-[--muted-foreground]">Username:</span>
                <p className="text-[--foreground] font-medium">@{botInfo.username || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[--muted-foreground]">ID:</span>
                <p className="text-[--foreground] font-medium">{botInfo.id}</p>
              </div>
              <div>
                <span className="text-[--muted-foreground]">Status:</span>
                <div className="flex space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded text-xs ${botInfo.can_join_groups ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {botInfo.can_join_groups ? 'Groups' : 'No Groups'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${botInfo.supports_inline_queries ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {botInfo.supports_inline_queries ? 'Inline' : 'No Inline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <span className="text-sm text-[--muted-foreground]">Bot information not available</span>
          </div>
        )}
      </div>

      {/* Webhook Configuration */}
      <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-[--foreground] mb-4">Webhook Configuration</h3>

        {webhookInfo ? (
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-2">
              {webhookInfo.url ? (
                <span className="text-green-500">✅</span>
              ) : (
                <span className="text-red-500">❌</span>
              )}
              <span className="font-medium text-[--foreground]">
                {webhookInfo.url ? 'Webhook is active' : 'No webhook configured'}
              </span>
            </div>
            {webhookInfo.url && (
              <div>
                <span className="text-sm text-[--muted-foreground]">URL:</span>
                <p className="text-sm text-[--foreground] break-all font-mono bg-[--muted] p-2 rounded mt-1">{webhookInfo.url}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[--muted-foreground]">Pending Updates:</span>
                <p className="text-[--foreground] font-medium">{webhookInfo.pending_update_count}</p>
              </div>
              <div>
                <span className="text-[--muted-foreground]">Max Connections:</span>
                <p className="text-[--foreground] font-medium">{webhookInfo.max_connections || 'N/A'}</p>
              </div>
            </div>
            {webhookInfo.last_error_message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-sm font-medium text-red-600">Last Error:</span>
                <p className="text-sm text-red-600 mt-1">{webhookInfo.last_error_message}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-yellow-500">⚠️</span>
            <span className="text-sm text-[--muted-foreground]">Webhook information not available</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="webhook-url" className="block text-sm font-medium text-[--foreground] mb-2">
              Webhook URL
            </label>
            <input
              id="webhook-url"
              type="text"
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
              placeholder="https://your-domain.com/api/telegram/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={setWebhook}
              disabled={isLoading || !webhookUrl}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              Set Webhook
            </button>
            <button
              onClick={deleteWebhook}
              disabled={isLoading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              Delete Webhook
            </button>
          </div>
        </div>
      </div>

      {/* Test Message */}
      <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-[--foreground] mb-4">Test Message</h3>
        <p className="text-[--muted-foreground] mb-4">Send a test message to verify Telegram integration</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="staff-select" className="block text-sm font-medium text-[--foreground] mb-2">
              Select Staff Member
            </label>
            <select
              id="staff-select"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
            >
              <option value="">Choose a staff member</option>
              {staffMembers
                .filter(staff => staff.telegram_user_id && staff.telegram_verified)
                .map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name} (@{staff.telegram_user_id})
                  </option>
                ))}
            </select>
            {staffMembers.filter(staff => staff.telegram_user_id && staff.telegram_verified).length === 0 && (
              <p className="text-sm text-[--muted-foreground] mt-1">
                No staff members with verified Telegram IDs found. Add Telegram IDs in the Staff section.
              </p>
            )}
          </div>

          <button
            onClick={sendTestMessage}
            disabled={isLoading || !selectedStaffId}
            className="w-full px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Sending...' : '📱 Send Test Message'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className={`p-4 rounded-lg border ${
          testResult.success
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            <span className={testResult.success ? 'text-green-500' : 'text-red-500'}>
              {testResult.success ? '✅' : '❌'}
            </span>
            <div>
              <p className="font-medium">
                {testResult.success ? 'Success!' : 'Error'}
              </p>
              {testResult.message && <p className="text-sm mt-1">{testResult.message}</p>}
              {testResult.error && <p className="text-sm mt-1">{testResult.error}</p>}
              {testResult.messageId && <p className="text-sm mt-1">Message ID: {testResult.messageId}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
