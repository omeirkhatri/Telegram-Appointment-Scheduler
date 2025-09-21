#!/usr/bin/env node

/**
 * Timezone Monitoring Dashboard (Task 7.2)
 * 
 * This script instruments monitoring dashboards for timezone change events,
 * resolver errors, and fallback counts. It provides real-time monitoring
 * capabilities and generates reports for timezone system health.
 * 
 * Features:
 * - Real-time monitoring of timezone resolver performance
 * - Error tracking and alerting
 * - Fallback usage analytics
 * - Performance metrics collection
 * - Dashboard data export for external monitoring systems
 */

try {
  require('dotenv').config();
} catch (error) {
  // dotenv is optional in production environments
}

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_REPORT_DIR = path.join(process.cwd(), 'reports', 'timezone-monitoring');
const MONITORING_INTERVAL = 60000; // 1 minute
const RETENTION_DAYS = 30;

function parseArgs(argv) {
  const options = {
    mode: 'dashboard', // dashboard, report, export
    output: null,
    interval: MONITORING_INTERVAL,
    duration: null, // in minutes
    format: 'json', // json, csv, html
    realtime: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--mode':
        options.mode = argv[i + 1] || 'dashboard';
        i += 1;
        break;
      case '--output':
      case '-o':
        options.output = argv[i + 1];
        i += 1;
        break;
      case '--interval':
        options.interval = Number.parseInt(argv[i + 1], 10) || MONITORING_INTERVAL;
        i += 1;
        break;
      case '--duration':
        options.duration = Number.parseInt(argv[i + 1], 10);
        i += 1;
        break;
      case '--format':
        options.format = argv[i + 1] || 'json';
        i += 1;
        break;
      case '--realtime':
        options.realtime = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Timezone Monitoring Dashboard

Usage: node timezone-monitoring-dashboard.js [options]

Options:
  --mode MODE           Operation mode: dashboard, report, export (default: dashboard)
  --output PATH         Output file path (default: auto-generated)
  --interval MS         Monitoring interval in milliseconds (default: 60000)
  --duration MIN        Duration to run in minutes (default: continuous)
  --format FORMAT       Output format: json, csv, html (default: json)
  --realtime            Enable real-time console output
  --help, -h            Show this help message

Examples:
  # Start real-time dashboard
  node timezone-monitoring-dashboard.js --realtime

  # Generate report for last 24 hours
  node timezone-monitoring-dashboard.js --mode report --duration 1440

  # Export data as CSV
  node timezone-monitoring-dashboard.js --mode export --format csv --output ./timezone-data.csv
        `);
        process.exit(0);
        break;
      default:
        break;
    }
  }

  return options;
}

function ensureOutputPath(output, format) {
  const filePath = output || path.join(
    DEFAULT_REPORT_DIR,
    `timezone-monitoring-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`,
  );
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  return filePath;
}

class TimezoneMonitor {
  constructor(client, options) {
    this.client = client;
    this.options = options;
    this.metrics = {
      resolverCalls: 0,
      resolverErrors: 0,
      fallbackUsage: 0,
      legacyUsage: 0,
      timezoneChanges: 0,
      performanceMetrics: [],
      errorLog: [],
      timezoneChangeLog: [],
    };
    this.startTime = new Date();
  }

  async collectMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Collect timezone change events
      const { data: timezoneChanges, error: tzError } = await this.client
        .from('timezone_change_audit')
        .select('*')
        .gte('changed_at', oneDayAgo)
        .order('changed_at', { ascending: false });

      if (tzError) {
        console.warn('[timezone-monitor] Error fetching timezone changes:', tzError.message);
      } else {
        this.metrics.timezoneChanges = timezoneChanges?.length || 0;
        this.metrics.timezoneChangeLog = timezoneChanges || [];
      }

      // Collect application logs for timezone-related errors
      const { data: errorLogs, error: logError } = await this.client
        .from('application_logs')
        .select('*')
        .or('message.ilike.%timezone%,level.eq.error')
        .gte('timestamp', oneHourAgo)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (logError) {
        console.warn('[timezone-monitor] Error fetching application logs:', logError.message);
      } else {
        this.metrics.errorLog = errorLogs || [];
        this.metrics.resolverErrors = errorLogs?.filter(log => 
          log.message?.toLowerCase().includes('timezone') && 
          log.level === 'error'
        ).length || 0;
      }

      // Collect performance metrics
      const { data: perfMetrics, error: perfError } = await this.client
        .from('performance_metrics')
        .select('*')
        .or('metric_name.ilike.%timezone%,metric_name.ilike.%resolver%')
        .gte('timestamp', oneHourAgo)
        .order('timestamp', { ascending: false });

      if (perfError) {
        console.warn('[timezone-monitor] Error fetching performance metrics:', perfError.message);
      } else {
        this.metrics.performanceMetrics = perfMetrics || [];
        this.metrics.resolverCalls = perfMetrics?.filter(metric => 
          metric.metric_name?.toLowerCase().includes('resolver')
        ).reduce((sum, metric) => sum + (metric.metric_value || 0), 0) || 0;
      }

      // Analyze fallback usage from recent appointments
      const { data: appointments, error: appError } = await this.client
        .from('appointments')
        .select('custom_fields, created_at')
        .gte('created_at', oneHourAgo)
        .not('custom_fields', 'is', null);

      if (appError) {
        console.warn('[timezone-monitor] Error fetching appointments:', appError.message);
      } else {
        const fallbackCount = appointments?.filter(app => 
          app.custom_fields?.timezone_metadata?.resolution?.source === 'legacy' ||
          app.custom_fields?.timezone_metadata?.resolution?.source === 'environment'
        ).length || 0;
        
        this.metrics.fallbackUsage = fallbackCount;
        this.metrics.legacyUsage = appointments?.filter(app => 
          app.custom_fields?.timezone_metadata?.resolution?.source === 'legacy'
        ).length || 0;
      }

    } catch (error) {
      console.error('[timezone-monitor] Error collecting metrics:', error.message);
    }
  }

  generateDashboard() {
    const uptime = Date.now() - this.startTime.getTime();
    const uptimeMinutes = Math.floor(uptime / 60000);
    
    console.log('\n🕐 Timezone System Monitoring Dashboard');
    console.log('==============================================');
    console.log(`Uptime: ${uptimeMinutes} minutes`);
    console.log(`Last Updated: ${new Date().toISOString()}`);
    console.log('==============================================');
    console.log(`Resolver Calls (1h): ${this.metrics.resolverCalls}`);
    console.log(`Resolver Errors (1h): ${this.metrics.resolverErrors}`);
    console.log(`Fallback Usage (1h): ${this.metrics.fallbackUsage}`);
    console.log(`Legacy Usage (1h): ${this.metrics.legacyUsage}`);
    console.log(`Timezone Changes (24h): ${this.metrics.timezoneChanges}`);
    console.log('==============================================');
    
    if (this.metrics.resolverErrors > 0) {
      console.log('\n⚠️  Recent Errors:');
      this.metrics.errorLog.slice(0, 5).forEach(log => {
        console.log(`  ${log.timestamp}: ${log.message}`);
      });
    }
    
    if (this.metrics.timezoneChanges > 0) {
      console.log('\n🔄 Recent Timezone Changes:');
      this.metrics.timezoneChangeLog.slice(0, 5).forEach(change => {
        console.log(`  ${change.changed_at}: ${change.entity_type} ${change.entity_id} - ${change.previous_timezone} → ${change.new_timezone}`);
      });
    }
    
    console.log('==============================================');
  }

  generateReport() {
    const report = {
      generated_at: new Date().toISOString(),
      monitoring_period: {
        start: this.startTime.toISOString(),
        end: new Date().toISOString(),
        duration_minutes: Math.floor((Date.now() - this.startTime.getTime()) / 60000),
      },
      metrics: this.metrics,
      health_status: this.getHealthStatus(),
      recommendations: this.getRecommendations(),
    };

    return report;
  }

  getHealthStatus() {
    const errorRate = this.metrics.resolverCalls > 0 ? 
      (this.metrics.resolverErrors / this.metrics.resolverCalls) * 100 : 0;
    const fallbackRate = this.metrics.resolverCalls > 0 ? 
      (this.metrics.fallbackUsage / this.metrics.resolverCalls) * 100 : 0;

    let status = 'healthy';
    let issues = [];

    if (errorRate > 5) {
      status = 'unhealthy';
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    } else if (errorRate > 1) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${errorRate.toFixed(2)}%`);
    }

    if (fallbackRate > 50) {
      status = 'unhealthy';
      issues.push(`High fallback usage: ${fallbackRate.toFixed(2)}%`);
    } else if (fallbackRate > 20) {
      status = 'degraded';
      issues.push(`Elevated fallback usage: ${fallbackRate.toFixed(2)}%`);
    }

    if (this.metrics.timezoneChanges > 10) {
      issues.push(`Frequent timezone changes: ${this.metrics.timezoneChanges} in 24h`);
    }

    return {
      status,
      error_rate: errorRate,
      fallback_rate: fallbackRate,
      issues,
    };
  }

  getRecommendations() {
    const recommendations = [];

    if (this.metrics.resolverErrors > 0) {
      recommendations.push({
        priority: 'high',
        category: 'errors',
        message: 'Investigate resolver errors and improve error handling',
        count: this.metrics.resolverErrors,
      });
    }

    if (this.metrics.fallbackUsage > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: 'Consider optimizing timezone resolution to reduce fallback usage',
        count: this.metrics.fallbackUsage,
      });
    }

    if (this.metrics.legacyUsage > 0) {
      recommendations.push({
        priority: 'low',
        category: 'migration',
        message: 'Continue migrating legacy timezone usage to new resolver system',
        count: this.metrics.legacyUsage,
      });
    }

    if (this.metrics.timezoneChanges > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'stability',
        message: 'Monitor timezone change frequency for potential configuration issues',
        count: this.metrics.timezoneChanges,
      });
    }

    return recommendations;
  }

  async exportData(format) {
    const data = this.generateReport();
    
    if (format === 'csv') {
      return this.exportToCSV(data);
    } else if (format === 'html') {
      return this.exportToHTML(data);
    } else {
      return JSON.stringify(data, null, 2);
    }
  }

  exportToCSV(data) {
    const lines = [];
    lines.push('timestamp,metric,value,status');
    
    lines.push(`${data.generated_at},resolver_calls,${data.metrics.resolverCalls},${data.health_status.status}`);
    lines.push(`${data.generated_at},resolver_errors,${data.metrics.resolverErrors},${data.health_status.status}`);
    lines.push(`${data.generated_at},fallback_usage,${data.metrics.fallbackUsage},${data.health_status.status}`);
    lines.push(`${data.generated_at},legacy_usage,${data.metrics.legacyUsage},${data.health_status.status}`);
    lines.push(`${data.generated_at},timezone_changes,${data.metrics.timezoneChanges},${data.health_status.status}`);
    
    return lines.join('\n');
  }

  exportToHTML(data) {
    const healthColor = data.health_status.status === 'healthy' ? 'green' : 
                       data.health_status.status === 'degraded' ? 'orange' : 'red';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Timezone System Monitoring Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
        .status { color: ${healthColor}; font-weight: bold; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .error { background: #f8d7da; padding: 10px; border-radius: 3px; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Timezone System Monitoring Report</h1>
        <p>Generated: ${data.generated_at}</p>
        <p>Status: <span class="status">${data.health_status.status.toUpperCase()}</span></p>
    </div>
    
    <h2>Metrics Summary</h2>
    <div class="metric">Resolver Calls (1h): ${data.metrics.resolverCalls}</div>
    <div class="metric">Resolver Errors (1h): ${data.metrics.resolverErrors}</div>
    <div class="metric">Fallback Usage (1h): ${data.metrics.fallbackUsage}</div>
    <div class="metric">Legacy Usage (1h): ${data.metrics.legacyUsage}</div>
    <div class="metric">Timezone Changes (24h): ${data.metrics.timezoneChanges}</div>
    
    <h2>Health Status</h2>
    <p>Error Rate: ${data.health_status.error_rate.toFixed(2)}%</p>
    <p>Fallback Rate: ${data.health_status.fallback_rate.toFixed(2)}%</p>
    
    ${data.health_status.issues.length > 0 ? `
    <h3>Issues Detected</h3>
    <ul>
        ${data.health_status.issues.map(issue => `<li>${issue}</li>`).join('')}
    </ul>
    ` : ''}
    
    ${data.recommendations.length > 0 ? `
    <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
            ${data.recommendations.map(rec => `<li><strong>${rec.priority.toUpperCase()}</strong> (${rec.category}): ${rec.message} (${rec.count} occurrences)</li>`).join('')}
        </ul>
    </div>
    ` : ''}
    
    ${data.metrics.errorLog.length > 0 ? `
    <h2>Recent Errors</h2>
    ${data.metrics.errorLog.slice(0, 10).map(log => `
        <div class="error">
            <strong>${log.created_at}</strong>: ${log.message}
        </div>
    `).join('')}
    ` : ''}
</body>
</html>`;
  }

  async startMonitoring() {
    console.log('🚀 Starting timezone monitoring...');
    
    const monitor = async () => {
      await this.collectMetrics();
      
      if (this.options.realtime) {
        this.generateDashboard();
      }
    };

    // Initial collection
    await monitor();

    if (this.options.mode === 'dashboard') {
      const interval = setInterval(monitor, this.options.interval);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping monitoring...');
        clearInterval(interval);
        process.exit(0);
      });

      // Set duration limit if specified
      if (this.options.duration) {
        setTimeout(() => {
          console.log('\n⏰ Monitoring duration completed');
          clearInterval(interval);
          process.exit(0);
        }, this.options.duration * 60 * 1000);
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const monitor = new TimezoneMonitor(client, options);

  if (options.mode === 'dashboard') {
    await monitor.startMonitoring();
  } else if (options.mode === 'report' || options.mode === 'export') {
    await monitor.collectMetrics();
    const output = await monitor.exportData(options.format);
    
    if (options.output) {
      const outputPath = ensureOutputPath(options.output, options.format);
      fs.writeFileSync(outputPath, output, 'utf-8');
      console.log(`📊 Report exported to: ${outputPath}`);
    } else {
      console.log(output);
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Timezone monitoring failed:', error.message || error);
    process.exit(1);
  });
}

module.exports = {
  TimezoneMonitor,
  parseArgs,
};
