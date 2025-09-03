// Job scheduling types for cron-based task management

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'scheduled';

export type JobPriority = 'low' | 'medium' | 'high' | 'critical';

export type JobType = 'daily_agenda' | 'backup' | 'cleanup' | 'sync' | 'custom';

// Job definition interface
export interface JobDefinition {
  id: string;
  name: string;
  description: string;
  type: JobType;
  cronExpression: string;
  timezone: string;
  priority: JobPriority;
  enabled: boolean;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  timeout: number; // in milliseconds
  handler: string; // function name or path
  parameters?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Job execution record
export interface JobExecution {
  id: string;
  jobId: string;
  status: JobStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  error?: string;
  retryCount: number;
  result?: any;
  logs: JobLog[];
}

// Job log entry
export interface JobLog {
  id: string;
  executionId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// Job scheduler configuration
export interface JobSchedulerConfig {
  timezone: string;
  maxConcurrentJobs: number;
  defaultTimeout: number;
  defaultRetries: number;
  defaultRetryDelay: number;
  logRetentionDays: number;
  enablePersistence: boolean;
  persistenceInterval: number; // in milliseconds
}

// Job statistics
export interface JobStats {
  totalJobs: number;
  activeJobs: number;
  scheduledJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecution?: Date;
  nextExecution?: Date;
}

// Job execution context
export interface JobExecutionContext {
  jobId: string;
  executionId: string;
  startTime: Date;
  parameters: Record<string, any>;
  logger: JobLogger;
  signal?: AbortSignal;
}

// Job logger interface
export interface JobLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

// Job handler function type
export type JobHandler = (context: JobExecutionContext) => Promise<any>;

// Job scheduler service interface
export interface JobSchedulerService {
  // Job management
  addJob(job: Omit<JobDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobDefinition>;
  updateJob(jobId: string, updates: Partial<JobDefinition>): Promise<JobDefinition>;
  removeJob(jobId: string): Promise<void>;
  getJob(jobId: string): Promise<JobDefinition | null>;
  getAllJobs(): Promise<JobDefinition[]>;

  // Job execution
  startJob(jobId: string): Promise<JobExecution>;
  stopJob(jobId: string): Promise<void>;
  triggerJob(jobId: string, parameters?: Record<string, any>): Promise<JobExecution>;

  // Job monitoring
  getJobExecutions(jobId: string, limit?: number): Promise<JobExecution[]>;
  getJobStats(jobId: string): Promise<JobStats>;
  getAllJobStats(): Promise<JobStats>;

  // Scheduler control
  startScheduler(): Promise<void>;
  stopScheduler(): Promise<void>;
  isRunning(): boolean;

  // Persistence
  saveJobs(): Promise<void>;
  loadJobs(): Promise<void>;
}

// Daily agenda job specific types
export interface DailyAgendaJobParameters {
  date?: string; // YYYY-MM-DD format, defaults to today
  staffId?: string; // specific staff member, defaults to all eligible
  testMode?: boolean; // don't send emails, just generate
  forceSend?: boolean; // send even if already sent today
}

export interface DailyAgendaJobResult {
  success: boolean;
  totalStaff: number;
  emailsSent: number;
  emailsFailed: number;
  successRate: number;
  results: Array<{
    staffId: string;
    email: string;
    status: 'sent' | 'failed';
    error?: string;
  }>;
}

// Job persistence types
export interface JobPersistenceData {
  jobs: JobDefinition[];
  executions: JobExecution[];
  lastSaved: Date;
  version: string;
}

// Job validation result
export interface JobValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Cron expression validation
export interface CronValidationResult {
  isValid: boolean;
  nextExecutions: Date[];
  error?: string;
}

// Job queue item
export interface JobQueueItem {
  jobId: string;
  executionId: string;
  scheduledFor: Date;
  priority: JobPriority;
  parameters?: Record<string, any>;
  retryCount: number;
}

// Job scheduler events
export interface JobSchedulerEvents {
  'job:added': (job: JobDefinition) => void;
  'job:updated': (job: JobDefinition) => void;
  'job:removed': (jobId: string) => void;
  'job:started': (execution: JobExecution) => void;
  'job:completed': (execution: JobExecution) => void;
  'job:failed': (execution: JobExecution) => void;
  'scheduler:started': () => void;
  'scheduler:stopped': () => void;
  'scheduler:error': (error: Error) => void;
}

// Utility functions for job types
export function createJobDefinition(
  name: string,
  cronExpression: string,
  handler: string,
  options: Partial<JobDefinition> = {},
): Omit<JobDefinition, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name,
    description: options.description || '',
    type: options.type || 'custom',
    cronExpression,
    timezone: options.timezone || 'Asia/Dubai',
    priority: options.priority || 'medium',
    enabled: options.enabled !== false,
    maxRetries: options.maxRetries || 3,
    retryDelay: options.retryDelay || 5000,
    timeout: options.timeout || 300000, // 5 minutes
    handler,
    parameters: options.parameters,
  };
}

export function createJobExecutionContext(
  jobId: string,
  executionId: string,
  parameters: Record<string, any> = {},
  logger: JobLogger,
): JobExecutionContext {
  return {
    jobId,
    executionId,
    startTime: new Date(),
    parameters,
    logger,
  };
}

export function calculateJobStats(executions: JobExecution[]): JobStats {
  const total = executions.length;
  const completed = executions.filter(e => e.status === 'completed').length;
  const failed = executions.filter(e => e.status === 'failed').length;
  const successRate = total > 0 ? (completed / total) * 100 : 0;

  const completedExecutions = executions.filter(e => e.status === 'completed' && e.duration);
  const averageExecutionTime = completedExecutions.length > 0
    ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
    : 0;

  const lastExecution = executions.length > 0
    ? executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0].startedAt
    : undefined;

  return {
    totalJobs: 0, // This would be set by the scheduler
    activeJobs: executions.filter(e => e.status === 'running').length,
    scheduledJobs: executions.filter(e => e.status === 'scheduled').length,
    completedJobs: completed,
    failedJobs: failed,
    successRate: Math.round(successRate * 100) / 100,
    averageExecutionTime: Math.round(averageExecutionTime),
    lastExecution,
  };
}
