'use client';

import type { DashboardStatistics } from '@/types/reports';
import {
    Activity,
    BarChart3,
    Calendar,
    Mail,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useState } from 'react';

interface ChartsSectionProps {
  statistics: DashboardStatistics;
  className?: string;
}

export function ChartsSection({ statistics, className = '' }: ChartsSectionProps) {
  const [activeTab, setActiveTab] = useState<'appointments' | 'patients' | 'staff' | 'email'>('appointments');

  const tabs = [
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'email', label: 'Email', icon: Mail },
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
              <h3 className="text-lg font-semibold text-gray-900">Analytics & Trends</h3>
              <p className="text-sm text-gray-600">Visual insights into your data</p>
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
        {activeTab === 'appointments' && (
          <AppointmentCharts statistics={statistics} />
        )}
        {activeTab === 'patients' && (
          <PatientCharts statistics={statistics} />
        )}
        {activeTab === 'staff' && (
          <StaffCharts statistics={statistics} />
        )}
        {activeTab === 'email' && (
          <EmailCharts statistics={statistics} />
        )}
      </div>
    </div>
  );
}

function AppointmentCharts({ statistics }: { statistics: DashboardStatistics }) {
  const { appointments } = statistics;

  return (
    <div className="space-y-8">
      {/* Appointment Status Distribution */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Appointment Status Distribution</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(appointments.byStatus).map(([status, count]) => (
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
                  'bg-yellow-500'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Appointment Types */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Appointment Types</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(appointments.byType).map(([type, count]) => (
            <div key={type} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Trends */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Daily Appointment Trends</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            {appointments.trends.daily.slice(-7).map((trend, index) => (
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
                        width: `${Math.min(100, (trend.count / Math.max(...appointments.trends.daily.map(t => t.count))) * 100)}%`,
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

function PatientCharts({ statistics }: { statistics: DashboardStatistics }) {
  const { patients } = statistics;

  return (
    <div className="space-y-8">
      {/* Patient Distribution by Area */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Patient Distribution by Area</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(patients.byArea).map(([area, count]) => (
            <div key={area} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{area}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Growth Trends */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Patient Growth Trends</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            {patients.trends.monthly.slice(-6).map((trend) => (
              <div key={trend.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(trend.month + '-01').toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (trend.count / Math.max(...patients.trends.monthly.map(t => t.count))) * 100)}%`,
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

function StaffCharts({ statistics }: { statistics: DashboardStatistics }) {
  const { staff } = statistics;

  return (
    <div className="space-y-8">
      {/* Staff Distribution by Type */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Staff Distribution by Type</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(staff.byType).map(([type, count]) => (
            <div key={type} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Utilization */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Staff Utilization Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Utilization Rate</span>
              <span className="text-lg font-bold text-gray-900">{staff.utilizationRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, staff.utilizationRate)}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Average Workload</span>
              <span className="text-lg font-bold text-gray-900">{staff.averageWorkload}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (staff.averageWorkload / 10) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailCharts({ statistics }: { statistics: DashboardStatistics }) {
  const { emailDelivery } = statistics;

  return (
    <div className="space-y-8">
      {/* Email Delivery Performance */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Email Delivery Performance</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{emailDelivery.successRate}%</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failure Rate</p>
                <p className="text-2xl font-bold text-red-600">{emailDelivery.failureRate}%</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Delivery Time</p>
                <p className="text-2xl font-bold text-blue-600">{emailDelivery.averageDeliveryTime}ms</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Types */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Email Types Sent</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(emailDelivery.byType).map(([type, count]) => (
            <div key={type} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
