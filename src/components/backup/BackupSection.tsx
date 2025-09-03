'use client';

import { AlertCircle, Calendar, CheckCircle, Database, Download, FileText, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TableInfo {
  name: string;
  rowCount: number;
  columns: string[];
  lastModified?: string;
}

interface BackupStatistics {
  totalTables: number;
  totalRows: number;
  lastBackup?: string;
  tableStats: TableInfo[];
}

interface BackupSectionProps {
  className?: string;
}

export function BackupSection({ className = '' }: BackupSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<BackupStatistics | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'core' | 'system' | 'table'>('all');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  // Load backup statistics on component mount
  useEffect(() => {
    loadBackupInfo();
  }, []);

  const loadBackupInfo = async () => {
    try {
      const response = await fetch('/api/backup/info?includeTableInfo=true');
      const result = await response.json();

      if (result.success) {
        setStatistics(result.data.statistics);
      } else {
        setStatus({
          type: 'error',
          message: result.error || 'Failed to load backup information',
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Failed to load backup information',
      });
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const requestBody = {
        type: selectedType,
        tableName: selectedType === 'table' ? selectedTable : undefined,
        format: selectedFormat,
        includeMetadata,
        dateRange: dateRange.from && dateRange.to ? dateRange : undefined,
      };

      const response = await fetch('/api/backup/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `backup_${new Date().toISOString().split('T')[0]}.${selectedFormat}`;

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus({
        type: 'success',
        message: `Backup exported successfully as ${filename}`,
      });

      // Refresh statistics
      await loadBackupInfo();

    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Export failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportTypes = [
    {
      id: 'all',
      label: 'Complete Database',
      description: 'Export all tables and data',
      icon: Database,
    },
    {
      id: 'core',
      label: 'Core Business Data',
      description: 'Patients, appointments, staff, and assignments',
      icon: FileText,
    },
    {
      id: 'system',
      label: 'System Configuration',
      description: 'Settings, preferences, and audit logs',
      icon: Settings,
    },
    {
      id: 'table',
      label: 'Specific Table',
      description: 'Export a single table',
      icon: Calendar,
    },
  ];

  const formats = [
    { id: 'csv', label: 'CSV', description: 'Comma-separated values (Excel compatible)' },
    { id: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[--foreground]">Backup & Export</h2>
          <p className="text-[--muted-foreground] mt-1">
            Export your data as CSV dumps for backup and analysis
          </p>
        </div>
        {statistics && (
          <div className="text-right text-sm text-[--muted-foreground]">
            <div>{statistics.totalTables} tables</div>
            <div>{statistics.totalRows.toLocaleString()} total rows</div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[--card] border border-[--border] rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-[--primary]" />
              <span className="font-medium text-[--foreground]">Total Tables</span>
            </div>
            <div className="text-2xl font-bold text-[--foreground] mt-2">
              {statistics.totalTables}
            </div>
          </div>

          <div className="bg-[--card] border border-[--border] rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-[--primary]" />
              <span className="font-medium text-[--foreground]">Total Rows</span>
            </div>
            <div className="text-2xl font-bold text-[--foreground] mt-2">
              {statistics.totalRows.toLocaleString()}
            </div>
          </div>

          <div className="bg-[--card] border border-[--border] rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-[--primary]" />
              <span className="font-medium text-[--foreground]">Last Export</span>
            </div>
            <div className="text-sm text-[--muted-foreground] mt-2">
              {statistics.lastBackup ? new Date(statistics.lastBackup).toLocaleDateString() : 'Never'}
            </div>
          </div>
        </div>
      )}

      {/* Export Configuration */}
      <div className="bg-[--card] border border-[--border] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[--foreground] mb-4">Export Configuration</h3>

        <div className="space-y-6">
          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-3">
              Export Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id as any)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      selectedType === type.id
                        ? 'border-[--primary] bg-[--primary]/5'
                        : 'border-[--border] hover:border-[--primary]/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-[--primary]" />
                      <div>
                        <div className="font-medium text-[--foreground]">{type.label}</div>
                        <div className="text-sm text-[--muted-foreground]">{type.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Selection */}
          {selectedType === 'table' && (
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-2">
                Select Table
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
              >
                <option value="">Choose a table...</option>
                {statistics?.tableStats.map((table) => (
                  <option key={table.name} value={table.name}>
                    {table.name} ({table.rowCount.toLocaleString()} rows)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id as any)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedFormat === format.id
                      ? 'border-[--primary] bg-[--primary]/5'
                      : 'border-[--border] hover:border-[--primary]/50'
                  }`}
                >
                  <div className="font-medium text-[--foreground]">{format.label}</div>
                  <div className="text-sm text-[--muted-foreground]">{format.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">
              Date Range Filter (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
                />
              </div>
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-[--border] text-[--primary] focus:ring-[--primary]"
              />
              <span className="text-sm text-[--foreground]">Include metadata and export information</span>
            </label>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {status.type && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          status.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : status.type === 'error'
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {status.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : status.type === 'error' ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isLoading || (selectedType === 'table' && !selectedTable)}
          className="px-6 py-3 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export Backup</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
