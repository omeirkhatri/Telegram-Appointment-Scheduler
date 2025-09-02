'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  Settings,
  Square,
  Calendar,
  Activity,
  RefreshCw,
  Zap,
  History,
  BarChart3
} from 'lucide-react';

interface AutomatedEmailSectionProps {
  className?: string;
}

interface JobStatus {
  id: string;
  name: string;
  enabled: boolean;
  cronExpression: string;
  nextRun: string;
  lastRun?: string;
  status: 'running' | 'stopped' | 'error';
}

interface JobExecution {
  id: string;
  jobId: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  result?: {
    totalStaff: number;
    emailsSent: number;
    emailsFailed: number;
    successRate: number;
  };
  error?: string;
}

interface SchedulerStatus {
  isRunning: boolean;
  totalJobs: number;
  enabledJobs: number;
  lastExecution?: string;
}

export function AutomatedEmailSection({ className = '' }: AutomatedEmailSectionProps) {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('06:00');
  const [isEnabled, setIsEnabled] = useState(true);

  // Load initial data
  useEffect(() => {
    loadSchedulerStatus();
    loadJobStatus();
    loadExecutions();
  }, []);

  const loadSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();

      if (data.success) {
        setSchedulerStatus(data.data.scheduler);
      }
    } catch (error) {
      console.error('Failed to load scheduler status:', error);
    }
  };

  const loadJobStatus = async () => {
    try {
      const response = await fetch('/api/jobs/daily-agenda');
      const data = await response.json();

      if (data.success) {
        setJobStatus(data.data.job);
        setIsEnabled(data.data.job.enabled);
        // Extract time from cron expression (assuming format: "0 6 * * *")
        const cronParts = data.data.job.cronExpression.split(' ');
        if (cronParts.length >= 2) {
          const hour = cronParts[1].padStart(2, '0');
          const minute = cronParts[0].padStart(2, '0');
          setScheduleTime(`${hour}:${minute}`);
        }
      }
    } catch (error) {
      console.error('Failed to load job status:', error);
    }
  };

  const loadExecutions = async () => {
    try {
      const response = await fetch('/api/jobs/daily-agenda?limit=10');
      const data = await response.json();

      if (data.success) {
        setExecutions(data.data.executions || []);
      }
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
  };

  const handleSchedulerControl = async (action: 'start' | 'stop') => {
    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch('/api/jobs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action === 'start' ? 'start_scheduler' : 'stop_scheduler'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Scheduler ${action === 'start' ? 'started' : 'stopped'} successfully`
        });
        loadSchedulerStatus();
      } else {
        setResult({
          success: false,
          message: `Failed to ${action} scheduler`,
          error: data.error || 'Unknown error'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Failed to ${action} scheduler`,
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleScheduleUpdate = async () => {
    if (!jobStatus) return;

    setIsSaving(true);
    setResult(null);

    try {
      // Convert time to cron expression (assuming daily at specified time)
      const [hour, minute] = scheduleTime.split(':');
      const cronExpression = `${minute} ${hour} * * *`;

      const response = await fetch('/api/jobs/daily-agenda', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_schedule',
          cronExpression,
          enabled: isEnabled
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Schedule updated successfully'
        });
        loadJobStatus();
      } else {
        setResult({
          success: false,
          message: 'Failed to update schedule',
          error: data.error || 'Unknown error'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to update schedule',
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualTrigger = async () => {
    if (!jobStatus) return;

    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch('/api/jobs/daily-agenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forceSend: true
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: 'Manual execution triggered successfully'
        });
        // Refresh data after a short delay
        setTimeout(() => {
          loadExecutions();
          loadJobStatus();
        }, 2000);
      } else {
        setResult({
          success: false,
          message: 'Failed to trigger manual execution',
          error: data.error || 'Unknown error'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to trigger manual execution',
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Dubai'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'running':
        return 'text-[--success]';
      case 'failed':
      case 'error':
        return 'text-[--destructive]';
      case 'stopped':
        return 'text-[--muted-foreground]';
      default:
        return 'text-[--muted-foreground]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'running':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-[--primary]" />
          <h3 className="text-lg font-semibold text-[--foreground]">Automated Email System</h3>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center space-x-2 px-3 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground]"
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Scheduler Status */}
        <div className="bg-[--muted] border border-[--border] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[--muted-foreground]" />
              <h4 className="text-md font-semibold text-[--foreground]">Scheduler Status</h4>
            </div>
            <div className="flex items-center space-x-2">
              {schedulerStatus?.isRunning ? (
                <div className="flex items-center space-x-2 text-[--success]">
                  <div className="w-2 h-2 bg-[--success] rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Running</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-[--muted-foreground]">
                  <div className="w-2 h-2 bg-[--muted-foreground] rounded-full"></div>
                  <span className="text-sm font-medium">Stopped</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[--foreground]">{schedulerStatus?.totalJobs || 0}</p>
              <p className="text-sm text-[--muted-foreground]">Total Jobs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[--foreground]">{schedulerStatus?.enabledJobs || 0}</p>
              <p className="text-sm text-[--muted-foreground]">Enabled Jobs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[--foreground]">
                {schedulerStatus?.lastExecution ? formatDate(schedulerStatus.lastExecution).split(',')[0] : 'Never'}
              </p>
              <p className="text-sm text-[--muted-foreground]">Last Execution</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => handleSchedulerControl('start')}
              disabled={isSaving || schedulerStatus?.isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-[--success] text-white rounded-lg hover:bg-[--success]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Start Scheduler</span>
            </button>
            
            <button
              onClick={() => handleSchedulerControl('stop')}
              disabled={isSaving || !schedulerStatus?.isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-[--destructive] text-white rounded-lg hover:bg-[--destructive]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Stop Scheduler</span>
            </button>
          </div>
        </div>

        {/* Job Configuration */}
        {jobStatus && (
          <div className="bg-[--muted] border border-[--border] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-[--muted-foreground]" />
              <h4 className="text-md font-semibold text-[--foreground]">Daily Agenda Job</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">
                  Schedule Time
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-2">
                  Job Status
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[--muted] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[--ring] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[--border] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--primary]"></div>
                  <span className="ml-3 text-sm text-[--foreground]">
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleScheduleUpdate}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
                <span>Update Schedule</span>
              </button>

              <button
                onClick={handleManualTrigger}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--foreground] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Send Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Execution History */}
        {showHistory && (
          <div className="bg-[--muted] border border-[--border] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[--muted-foreground]" />
              <h4 className="text-md font-semibold text-[--foreground]">Execution History</h4>
            </div>

            {executions.length === 0 ? (
              <p className="text-[--muted-foreground] text-center py-4">No executions found</p>
            ) : (
              <div className="space-y-3">
                {executions.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-3 bg-[--background] rounded-lg border border-[--border]">
                    <div className="flex items-center space-x-3">
                      <div className={getStatusColor(execution.status)}>
                        {getStatusIcon(execution.status)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[--foreground]">
                          {formatDate(execution.startedAt)}
                        </p>
                        {execution.result && (
                          <p className="text-xs text-[--muted-foreground]">
                            {execution.result.emailsSent} sent, {execution.result.emailsFailed} failed
                            ({execution.result.successRate.toFixed(1)}% success)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[--foreground]">
                        {execution.duration ? `${execution.duration}ms` : 'Running...'}
                      </p>
                      {execution.error && (
                        <p className="text-xs text-[--destructive] truncate max-w-48">
                          {execution.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
