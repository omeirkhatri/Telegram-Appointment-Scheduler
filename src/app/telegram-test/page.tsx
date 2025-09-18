'use client';

import { useState } from 'react';

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

export default function TelegramTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<TelegramWebhookInfo | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('https://42ff985f7d40.ngrok-free.app/api/telegram/webhook');

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
  useState(() => {
    loadBotInfo();
    loadStaffMembers();
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <span className="text-2xl">🤖</span>
        <h1 className="text-3xl font-bold">Telegram Bot Test</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bot Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Bot Information</h2>
          <p className="text-gray-600 mb-4">Current bot status and configuration</p>

          {botInfo ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="font-medium">Bot is online</span>
              </div>
              <div>
                <label className="text-sm font-medium">Name:</label>
                <p className="text-sm">{botInfo.first_name} {botInfo.last_name || ''}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Username:</label>
                <p className="text-sm">@{botInfo.username || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">ID:</label>
                <p className="text-sm">{botInfo.id}</p>
              </div>
              <div className="flex space-x-2">
                <span className={`px-2 py-1 rounded text-xs ${botInfo.can_join_groups ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {botInfo.can_join_groups ? 'Can join groups' : 'Cannot join groups'}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${botInfo.supports_inline_queries ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {botInfo.supports_inline_queries ? 'Inline queries' : 'No inline queries'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-red-500">❌</span>
              <span className="text-sm">Bot information not available</span>
            </div>
          )}

          <button
            onClick={loadBotInfo}
            disabled={isLoading}
            className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh Bot Info'}
          </button>
        </div>

        {/* Webhook Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Webhook Configuration</h2>
          <p className="text-gray-600 mb-4">Manage webhook settings for receiving updates</p>

          {webhookInfo ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {webhookInfo.url ? (
                  <span className="text-green-500">✅</span>
                ) : (
                  <span className="text-red-500">❌</span>
                )}
                <span className="font-medium">
                  {webhookInfo.url ? 'Webhook is set' : 'No webhook set'}
                </span>
              </div>
              {webhookInfo.url && (
                <div>
                  <label className="text-sm font-medium">URL:</label>
                  <p className="text-sm break-all">{webhookInfo.url}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Pending Updates:</label>
                <p className="text-sm">{webhookInfo.pending_update_count}</p>
              </div>
              {webhookInfo.last_error_message && (
                <div>
                  <label className="text-sm font-medium text-red-600">Last Error:</label>
                  <p className="text-sm text-red-600">{webhookInfo.last_error_message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-yellow-500">⚠️</span>
              <span className="text-sm">Webhook information not available</span>
            </div>
          )}

          <div className="space-y-2 mt-4">
            <label htmlFor="webhook-url" className="block text-sm font-medium">Webhook URL</label>
            <input
              id="webhook-url"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://your-domain.com/api/telegram/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <div className="flex space-x-2 mt-4">
            <button
              onClick={setWebhook}
              disabled={isLoading || !webhookUrl}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Set Webhook
            </button>
            <button
              onClick={deleteWebhook}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Delete Webhook
            </button>
          </div>
        </div>
      </div>

      {/* Test Message */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Send Test Message</h2>
        <p className="text-gray-600 mb-4">Send a test message to a staff member</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="staff-select" className="block text-sm font-medium mb-2">Select Staff Member</label>
            <select
              id="staff-select"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a staff member</option>
              {staffMembers
                .filter(staff => staff.telegram_user_id)
                .map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name} ({staff.telegram_user_id})
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={sendTestMessage}
            disabled={isLoading || !selectedStaffId}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : '📱 Send Test Message'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center space-x-2">
            <span className={testResult.success ? 'text-green-500' : 'text-red-500'}>
              {testResult.success ? '✅' : '❌'}
            </span>
            <div>
              <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.success ? 'Success!' : 'Error'}
              </p>
              {testResult.message && <p className="text-sm">{testResult.message}</p>}
              {testResult.error && <p className="text-sm">{testResult.error}</p>}
              {testResult.messageId && <p className="text-sm">Message ID: {testResult.messageId}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
