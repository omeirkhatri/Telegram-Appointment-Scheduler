'use client';

import {
    Activity,
    BarChart3,
    Car,
    MapPin,
    Users
} from 'lucide-react';
import { useState } from 'react';

interface TransportationSegmentChartsProps {
  data: {
    utilization: any;
    overrides: any;
    driverPerformance: any;
    conflictAnalysis: any;
  };
  className?: string;
}

export function TransportationSegmentCharts({ data, className = '' }: TransportationSegmentChartsProps) {
  const [activeTab, setActiveTab] = useState<'utilization' | 'overrides' | 'drivers' | 'conflicts'>('utilization');

  const tabs = [
    { id: 'utilization', label: 'Utilization', icon: Car },
    { id: 'overrides', label: 'Overrides', icon: Activity },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'conflicts', label: 'Conflicts', icon: MapPin },
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transportation Analytics</h3>
              <p className="text-sm text-gray-600">Segment utilization and performance insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        {activeTab === 'utilization' && (
          <UtilizationCharts data={data.utilization} />
        )}
        {activeTab === 'overrides' && (
          <OverridesCharts data={data.overrides} />
        )}
        {activeTab === 'drivers' && (
          <DriverCharts data={data.driverPerformance} />
        )}
        {activeTab === 'conflicts' && (
          <ConflictCharts data={data.conflictAnalysis} />
        )}
      </div>
    </div>
  );
}

function UtilizationCharts({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      {/* Segment Type Distribution */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Segment Type Distribution</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(data.byType || {}).map(([type, count]) => (
            <div key={type} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  type === 'pickup' ? 'bg-green-500' :
                  type === 'dropoff' ? 'bg-blue-500' :
                  type === 'stay_with_staff' ? 'bg-purple-500' :
                  type === 'metro_assist' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segment Status Distribution */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Segment Status Distribution</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(data.byStatus || {}).map(([status, count]) => (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{status}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'scheduled' ? 'bg-blue-500' :
                  status === 'cancelled' ? 'bg-red-500' :
                  status === 'in_progress' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Trends */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Daily Segment Trends</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            {data.trends?.daily?.slice(-7).map((trend: any, index: number) => (
              <div key={trend.date} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(trend.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (trend.count / Math.max(...(data.trends?.daily || []).map((t: any) => t.count))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{trend.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverridesCharts({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      {/* Override Reasons */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Override Reasons</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.byReason || {}).map(([reason, count]) => (
            <div key={reason} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{reason.replace('_', ' ')}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-orange-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Override Users */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Override Activity by User</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.byUser || {}).map(([user, count]) => (
            <div key={user} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{user}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up Requirements */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Follow-up Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Requires Follow-up</span>
              <span className="text-lg font-bold text-gray-900">{data.summary?.requiresFollowUp || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((data.summary?.requiresFollowUp || 0) / Math.max(1, data.summary?.totalOverrides || 1)) * 100)}%`
                }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Follow-up Rate</span>
              <span className="text-lg font-bold text-gray-900">{data.summary?.followUpRate || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, data.summary?.followUpRate || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverCharts({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      {/* Driver Performance Metrics */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Driver Performance Overview</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Average Completion Rate</span>
              <span className="text-lg font-bold text-gray-900">{data.summary?.avgCompletionRate || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, data.summary?.avgCompletionRate || 0)}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Average Override Rate</span>
              <span className="text-lg font-bold text-gray-900">{data.summary?.avgOverrideRate || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, data.summary?.avgOverrideRate || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Drivers */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Top Performing Drivers</h4>
        <div className="space-y-3">
          {data.driverStats?.slice(0, 5).map((driver: any, index: number) => (
            <div key={driver.driverId} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{driver.driverName}</p>
                    <p className="text-xs text-gray-600">{driver.totalSegments} segments</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{driver.completionRate}%</p>
                  <p className="text-xs text-gray-600">completion rate</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConflictCharts({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      {/* Conflict Types */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Conflict Types</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data.byConflictType || {}).map(([type, count]) => (
            <div key={type} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{type} conflicts</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  type === 'single' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segment Types with Conflicts */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Conflicts by Segment Type</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.bySegmentType || {}).map(([type, count]) => (
            <div key={type} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conflict Resolution Rate */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Conflict Resolution</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Manual Overrides</span>
              <span className="text-lg font-bold text-gray-900">{data.summary?.manualOverrides || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((data.summary?.manualOverrides || 0) / Math.max(1, data.summary?.totalConflicts || 1)) * 100)}%`
                }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Override Rate</span>
              <span className="text-lg font-bold text-gray-900">{data.summary?.overrideRate || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, data.summary?.overrideRate || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
