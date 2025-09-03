'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

interface SyncStatusCardProps {
  className?: string;
}

interface SyncStats {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  lastSyncTime: string;
  syncSuccessRate: number;
  eventsSyncedToday: number;
  eventsSyncedThisWeek: number;
  averageSyncTime: number;
}

export function SyncStatusCard({ className = '' }: SyncStatusCardProps) {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchSyncStats();
  }, []);

  const fetchSyncStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch staff with calendar connections
      const staffResponse = await fetch('/api/staff');
      const staffData = await staffResponse.json();
      
      if (staffData.success) {
        const staffWithCalendars = staffData.data.filter((staff: any) => staff.google_calendar_id);
        const totalConnections = staffWithCalendars.length;
        
        // Test connections
        let activeConnections = 0;
        let failedConnections = 0;
        
        for (const staff of staffWithCalendars) {
          try {
            const statusResponse = await fetch('/api/staff/validate-calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ calendarId: staff.google_calendar_id })
            });
            
            const statusData = await statusResponse.json();
            if (statusData.success) {
              activeConnections++;
            } else {
              failedConnections++;
            }
          } catch (error) {
            failedConnections++;
          }
        }
        
        const syncSuccessRate = totalConnections > 0 ? (activeConnections / totalConnections) * 100 : 0;
        
        // Mock sync statistics (in a real app, these would come from the database)
        const mockStats: SyncStats = {
          totalConnections,
          activeConnections,
          failedConnections,
          lastSyncTime: new Date().toISOString(),
          syncSuccessRate: Math.round(syncSuccessRate * 100) / 100,
          eventsSyncedToday: Math.floor(Math.random() * 50) + 10,
          eventsSyncedThisWeek: Math.floor(Math.random() * 200) + 50,
          averageSyncTime: Math.floor(Math.random() * 500) + 100
        };
        
        setStats(mockStats);
      }
    } catch (error) {
      console.error('Error fetching sync stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSyncStats();
    setIsRefreshing(false);
  };

  const getOverallStatus = () => {
    if (!stats) return { status: 'unknown', color: 'gray', icon: Clock };
    
    if (stats.syncSuccessRate >= 90) {
      return { status: 'excellent', color: 'green', icon: CheckCircle };
    } else if (stats.syncSuccessRate >= 70) {
      return { status: 'good', color: 'blue', icon: Activity };
    } else if (stats.syncSuccessRate >= 50) {
      return { status: 'fair', color: 'yellow', icon: Clock };
    } else {
      return { status: 'poor', color: 'red', icon: AlertCircle };
    }
  };

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'red':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading sync status...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Unable to load sync status</p>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getStatusColor(overallStatus.color)}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
              <p className="text-sm text-gray-600">Google Calendar synchronization overview</p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Overall Status */}
          <div className={`p-4 rounded-lg border ${getStatusColor(overallStatus.color)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Overall Status</p>
                <p className="text-2xl font-bold capitalize">{overallStatus.status}</p>
              </div>
              <StatusIcon className="w-6 h-6" />
            </div>
          </div>

          {/* Success Rate */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.syncSuccessRate}%</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>

          {/* Active Connections */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Active Connections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeConnections}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>

          {/* Failed Connections */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Failed Connections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failedConnections}</p>
              </div>
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Sync Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Events Synced Today</p>
                <p className="text-xl font-bold text-blue-900">{stats.eventsSyncedToday}</p>
              </div>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Events This Week</p>
                <p className="text-xl font-bold text-purple-900">{stats.eventsSyncedThisWeek}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Avg Sync Time</p>
                <p className="text-xl font-bold text-orange-900">{stats.averageSyncTime}ms</p>
              </div>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Last Sync Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Last Sync</p>
              <p className="text-sm text-gray-600">
                {new Date(stats.lastSyncTime).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${stats.activeConnections > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">
                {stats.activeConnections > 0 ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
