import { supabase } from '@/lib/supabase';

export interface BackupOptions {
  includeTables?: string[];
  excludeTables?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  format: 'csv' | 'json';
  includeMetadata?: boolean;
}

export interface BackupResult {
  success: boolean;
  data?: any;
  filename?: string;
  error?: string;
  metadata?: {
    exportedAt: string;
    totalTables: number;
    totalRows: number;
    fileSize: number;
  };
}

export interface TableInfo {
  name: string;
  rowCount: number;
  columns: string[];
  lastModified?: string;
}

export class BackupService {
  private static readonly BACKUP_TABLES = [
    'patients',
    'staff', 
    'appointments',
    'appointment_staff',
    'appointment_copy_audit_trail',
    'email_delivery_logs',
    'email_preferences',
    'audit_logs'
  ];

  private static readonly SYSTEM_TABLES = [
    'email_preferences',
    'audit_logs'
  ];

  /**
   * Get information about all tables in the database
   */
  async getTableInfo(): Promise<TableInfo[]> {
    try {
      const tableInfo: TableInfo[] = [];

      for (const tableName of this.BACKUP_TABLES) {
        try {
          // Get row count
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            console.warn(`Could not get count for table ${tableName}:`, countError);
            continue;
          }

          // Get column information
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          const columns = sampleData && sampleData.length > 0 
            ? Object.keys(sampleData[0])
            : [];

          tableInfo.push({
            name: tableName,
            rowCount: count || 0,
            columns,
            lastModified: new Date().toISOString()
          });
        } catch (error) {
          console.warn(`Error getting info for table ${tableName}:`, error);
        }
      }

      return tableInfo;
    } catch (error) {
      console.error('Error getting table info:', error);
      throw new Error('Failed to get table information');
    }
  }

  /**
   * Export all data as CSV dumps
   */
  async exportAllData(options: BackupOptions = { format: 'csv' }): Promise<BackupResult> {
    try {
      const { includeTables, excludeTables, format, includeMetadata = true } = options;
      
      const tablesToExport = includeTables || this.BACKUP_TABLES;
      const filteredTables = tablesToExport.filter(table => 
        !excludeTables?.includes(table)
      );

      const exportData: Record<string, any[]> = {};
      let totalRows = 0;

      // Export each table
      for (const tableName of filteredTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*');

          if (error) {
            console.error(`Error exporting table ${tableName}:`, error);
            continue;
          }

          exportData[tableName] = data || [];
          totalRows += (data || []).length;
        } catch (error) {
          console.error(`Error exporting table ${tableName}:`, error);
        }
      }

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `medicare_backup_${timestamp}.${format}`;

      let result: any;
      if (format === 'csv') {
        result = this.convertToCSV(exportData, includeMetadata);
      } else {
        result = this.convertToJSON(exportData, includeMetadata);
      }

      return {
        success: true,
        data: result,
        filename,
        metadata: {
          exportedAt: new Date().toISOString(),
          totalTables: filteredTables.length,
          totalRows,
          fileSize: new Blob([result]).size
        }
      };
    } catch (error) {
      console.error('Error exporting all data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data'
      };
    }
  }

  /**
   * Export specific table as CSV
   */
  async exportTable(tableName: string, options: BackupOptions = { format: 'csv' }): Promise<BackupResult> {
    try {
      const { dateRange, format, includeMetadata = true } = options;

      let query = supabase.from(tableName).select('*');

      // Apply date range filter if specified and table has date columns
      if (dateRange && this.hasDateColumns(tableName)) {
        const dateColumn = this.getDateColumn(tableName);
        if (dateColumn) {
          query = query
            .gte(dateColumn, dateRange.from)
            .lte(dateColumn, dateRange.to);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to export table ${tableName}: ${error.message}`);
      }

      const exportData = { [tableName]: data || [] };
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${tableName}_backup_${timestamp}.${format}`;

      let result: any;
      if (format === 'csv') {
        result = this.convertToCSV(exportData, includeMetadata);
      } else {
        result = this.convertToJSON(exportData, includeMetadata);
      }

      return {
        success: true,
        data: result,
        filename,
        metadata: {
          exportedAt: new Date().toISOString(),
          totalTables: 1,
          totalRows: (data || []).length,
          fileSize: new Blob([result]).size
        }
      };
    } catch (error) {
      console.error(`Error exporting table ${tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to export table ${tableName}`
      };
    }
  }

  /**
   * Export core business data (patients, appointments, staff)
   */
  async exportCoreData(options: BackupOptions = { format: 'csv' }): Promise<BackupResult> {
    const coreTables = ['patients', 'appointments', 'staff', 'appointment_staff'];
    return this.exportAllData({
      ...options,
      includeTables: coreTables
    });
  }

  /**
   * Export system configuration data
   */
  async exportSystemData(options: BackupOptions = { format: 'csv' }): Promise<BackupResult> {
    return this.exportAllData({
      ...options,
      includeTables: this.SYSTEM_TABLES
    });
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: Record<string, any[]>, includeMetadata: boolean): string {
    let csvContent = '';

    // Add metadata header if requested
    if (includeMetadata) {
      csvContent += '# MediCare Scheduler Database Backup\n';
      csvContent += `# Exported At: ${new Date().toISOString()}\n`;
      csvContent += `# Total Tables: ${Object.keys(data).length}\n`;
      csvContent += `# Total Rows: ${Object.values(data).reduce((sum, rows) => sum + rows.length, 0)}\n`;
      csvContent += '\n';
    }

    // Export each table
    for (const [tableName, rows] of Object.entries(data)) {
      if (rows.length === 0) continue;

      csvContent += `# Table: ${tableName}\n`;
      csvContent += `# Rows: ${rows.length}\n`;

      // Get headers from first row
      const headers = Object.keys(rows[0]);
      csvContent += headers.join(',') + '\n';

      // Add rows
      rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Handle different data types
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += values.join(',') + '\n';
      });

      csvContent += '\n';
    }

    return csvContent;
  }

  /**
   * Convert data to JSON format
   */
  private convertToJSON(data: Record<string, any[]>, includeMetadata: boolean): string {
    const result: any = {};

    if (includeMetadata) {
      result.metadata = {
        exportedAt: new Date().toISOString(),
        totalTables: Object.keys(data).length,
        totalRows: Object.values(data).reduce((sum, rows) => sum + rows.length, 0),
        version: '1.0'
      };
    }

    result.tables = data;
    return JSON.stringify(result, null, 2);
  }

  /**
   * Check if table has date columns
   */
  private hasDateColumns(tableName: string): boolean {
    const dateColumns: Record<string, string[]> = {
      appointments: ['appointment_date', 'created_at', 'updated_at'],
      patients: ['created_at', 'updated_at'],
      staff: ['created_at', 'updated_at'],
      appointment_staff: ['created_at'],
      appointment_copy_audit_trail: ['started_at', 'completed_at', 'created_at'],
      email_delivery_logs: ['sent_at', 'created_at'],
      audit_logs: ['created_at']
    };

    return tableName in dateColumns;
  }

  /**
   * Get the primary date column for a table
   */
  private getDateColumn(tableName: string): string | null {
    const dateColumns: Record<string, string> = {
      appointments: 'appointment_date',
      patients: 'created_at',
      staff: 'created_at',
      appointment_staff: 'created_at',
      appointment_copy_audit_trail: 'started_at',
      email_delivery_logs: 'sent_at',
      audit_logs: 'created_at'
    };

    return dateColumns[tableName] || null;
  }

  /**
   * Get backup statistics
   */
  async getBackupStatistics(): Promise<{
    totalTables: number;
    totalRows: number;
    lastBackup?: string;
    tableStats: TableInfo[];
  }> {
    try {
      const tableInfo = await this.getTableInfo();
      const totalRows = tableInfo.reduce((sum, table) => sum + table.rowCount, 0);

      return {
        totalTables: tableInfo.length,
        totalRows,
        tableStats: tableInfo
      };
    } catch (error) {
      console.error('Error getting backup statistics:', error);
      throw new Error('Failed to get backup statistics');
    }
  }
}

export const backupService = new BackupService();
