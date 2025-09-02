'use client';

import { ErrorMessage, LoadingSpinner } from '@/components/ui';
import type { EmailDeliveryLog, EmailDeliveryStatistics } from '@/types/email';
import { useEffect, useState } from 'react';

interface DeliveryDashboardProps {
  className?: string;
}

export function DeliveryDashboard({ className = '' }: DeliveryDashboardProps) {
  const [statistics, setStatistics] = useState<EmailDeliveryStatistics[]>([]);
  const [recentLogs, setRecentLogs] = useState<EmailDeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'logs' | 'failed'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load statistics for the last 7 days
      const statsResponse = await fetch('/api/email/delivery?action=statistics&dateFrom=2024-01-01');
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStatistics(statsData.data);
      }

      // Load recent logs
      const logsResponse = await fetch('/api/email/delivery?action=logs&limit=20');
      const logsData = await logsResponse.json();

      if (logsData.success) {
        setRecentLogs(logsData.data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const retryFailedDelivery = async (logId: string) => {
    try {
      const response = await fetch('/api/email/delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'retry_single',
          logId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload data to show updated status
        await loadDashboardData();
      } else {
        setError(data.error || 'Failed to retry delivery');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry delivery');
    }
  };

  const retryAllFailed = async () => {
    try {
      const response = await fetch('/api/email/delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'retry_all',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload data to show updated status
        await loadDashboardData();
      } else {
        setError(data.error || 'Failed to retry all deliveries');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry all deliveries');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'sent':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-blue-600 bg-blue-100';
      case 'low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorMessage error={error} />
        <button
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const failedLogs = recentLogs.filter(log => log.status === 'failed');
  const totalEmails = statistics.reduce((sum, stat) => sum + stat.totalEmails, 0);
  const totalSuccessful = statistics.reduce((sum, stat) => sum + stat.successfulDeliveries, 0);
  const totalFailed = statistics.reduce((sum, stat) => sum + stat.failedDeliveries, 0);
  const overallSuccessRate = totalEmails > 0 ? (totalSuccessful / totalEmails) * 100 : 0;

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Delivery Dashboard</h2>
        <p className="text-gray-600">Monitor email delivery status and manage retries</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'logs', label: 'Recent Logs' },
            { id: 'failed', label: 'Failed Deliveries' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Emails</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalEmails}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalSuccessful}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalFailed}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{overallSuccessRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Table */}
          {statistics.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Daily Statistics</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Successful</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statistics.map((stat) => (
                      <tr key={stat.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.emailType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.totalEmails}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{stat.successfulDeliveries}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{stat.failedDeliveries}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.successRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Logs Tab */}
      {selectedTab === 'logs' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Delivery Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retries</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.recipientEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs">{log.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(log.priority)}`}>
                        {log.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.retryCount}/{log.maxRetries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failed Deliveries Tab */}
      {selectedTab === 'failed' && (
        <div className="space-y-4">
          {failedLogs.length > 0 && (
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Failed Deliveries</h3>
              <button
                onClick={retryAllFailed}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry All Failed
              </button>
            </div>
          )}

          {failedLogs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No failed deliveries</h3>
              <p className="mt-1 text-sm text-gray-500">All emails have been delivered successfully.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retries</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {failedLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.recipientEmail}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs">{log.subject}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 truncate max-w-xs">{log.errorMessage}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.retryCount}/{log.maxRetries}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.retryCount < log.maxRetries && (
                            <button
                              onClick={() => retryFailedDelivery(log.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
