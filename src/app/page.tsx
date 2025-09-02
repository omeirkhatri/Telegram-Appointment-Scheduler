'use client';

import Header from '@/components/layout/Header';
import {
    Activity,
    BarChart3,
    CalendarDays,
    ChevronRight,
    Clock,
    FileText,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Users
} from 'lucide-react';

export default function Home() {
  // Stats data with modern styling
  const stats = [
    {
      title: "Today's Appointments",
      value: "24",
      change: "+12.5%",
      changeType: "positive",
      icon: CalendarDays,
      description: "Trending up this month",
      subtitle: "Appointments for the last 30 days"
    },
    {
      title: "Active Patients",
      value: "156",
      change: "+3",
      changeType: "positive",
      icon: Users,
      description: "Strong patient retention",
      subtitle: "Engagement exceeds targets"
    },
    {
      title: "Pending Reviews",
      value: "8",
      change: "Requires",
      changeType: "warning",
      icon: Clock,
      description: "Needs attention",
      subtitle: "Reviews pending approval"
    },
    {
      title: "Completed Today",
      value: "18",
      change: "75%",
      changeType: "neutral",
      icon: FileText,
      description: "Steady performance",
      subtitle: "Meets daily targets"
    }
  ];

  // Recent activity data
  const recentActivity = [
    { time: '2 min ago', text: 'Appointment confirmed for Sarah Johnson', status: 'confirmed' },
    { time: '15 min ago', text: 'Dr. Smith updated patient notes', status: 'updated' },
    { time: '1 hour ago', text: 'New patient registration: Mike Wilson', status: 'new' },
    { time: '2 hours ago', text: 'Appointment rescheduled for tomorrow', status: 'rescheduled' },
    { time: '3 hours ago', text: 'Follow-up reminder sent to 5 patients', status: 'reminder' }
  ];

  // Quick actions data
  const quickActions = [
    { name: 'Schedule', icon: CalendarDays, description: 'Create new appointment', href: '/appointments/new' },
    { name: 'Add Patient', icon: Users, description: 'Register new patient', href: '/patients/new' },
    { name: 'Reports', icon: BarChart3, description: 'View analytics', href: '/reports' },
    { name: 'Manage', icon: Activity, description: 'System settings', href: '/settings' }
  ];

  // Upcoming appointments data
  const upcomingAppointments = [
    { time: '09:00 AM', patient: 'Emma Davis', doctor: 'Dr. Smith', type: 'Check-up', status: 'confirmed' },
    { time: '10:30 AM', patient: 'James Wilson', doctor: 'Dr. Johnson', type: 'Consultation', status: 'confirmed' },
    { time: '01:00 PM', patient: 'Maria Garcia', doctor: 'Dr. Brown', type: 'Follow-up', status: 'pending' },
    { time: '03:30 PM', patient: 'David Lee', doctor: 'Dr. Smith', type: 'Emergency', status: 'urgent' }
  ];

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* Header with Navigation */}
      <Header currentPage="dashboard" />

      {/* Main Content - Full Width */}
      <div className="flex-1">
        <main className="px-8 py-8 space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[--foreground]">Dashboard</h1>
              <p className="text-[--muted-foreground] text-lg mt-1">Welcome back, Admin</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[--muted] rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-[--medical-blue]" />
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      stat.changeType === 'positive' ? 'bg-[--success]/10 text-[--success]' :
                      stat.changeType === 'warning' ? 'bg-[--warning]/10 text-[--warning]' :
                      'bg-[--muted] text-[--muted-foreground]'
                    }`}>
                      {stat.change}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[--muted-foreground] mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-[--foreground] mb-1">{stat.value}</p>
                    <p className="text-xs text-[--muted-foreground]">{stat.description}</p>
                    <p className="text-xs text-[--muted-foreground]/70 mt-1">{stat.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent activity */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[--foreground]">Recent Activity</h3>
                <button className="text-[--muted-foreground] hover:text-[--foreground] transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-[--accent] transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.status === 'confirmed' ? 'bg-[--success]' :
                      activity.status === 'updated' ? 'bg-[--medical-blue]' :
                      activity.status === 'new' ? 'bg-[--medical-purple]' :
                      activity.status === 'rescheduled' ? 'bg-[--warning]' :
                      'bg-[--muted-foreground]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[--foreground]">{activity.text}</p>
                      <p className="text-xs text-[--muted-foreground] mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[--foreground]">Quick Actions</h3>
                <button className="text-[--muted-foreground] hover:text-[--foreground] transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      className="bg-[--muted] border border-[--border] hover:bg-[--accent] hover:border-[--muted-foreground] text-[--foreground] rounded-xl p-4 text-left transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="w-6 h-6 text-[--primary] group-hover:text-[--primary]/80" />
                        <ChevronRight className="w-4 h-4 text-[--muted-foreground] group-hover:text-[--foreground]" />
                      </div>
                      <p className="font-medium text-[--foreground]">{action.name}</p>
                      <p className="text-sm text-[--muted-foreground]">{action.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upcoming appointments table */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[--border]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[--foreground]">Upcoming Appointments</h3>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
                    <input
                      type="text"
                      placeholder="Search appointments..."
                      className="pl-10 pr-4 py-2 bg-[--muted] border border-[--border] rounded-lg text-[--foreground] placeholder-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                    />
                  </div>
                  <button className="inline-flex items-center px-3 py-2 bg-[--muted] border border-[--border] rounded-lg text-[--muted-foreground] hover:bg-[--accent] hover:text-[--foreground] transition-colors">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </button>
                  <button className="inline-flex items-center px-3 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors">
                    <Plus className="w-4 h-4 mr-2" />
                    New
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[--muted]/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Time</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Patient</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Doctor</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Type</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Status</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-[--muted-foreground]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border]">
                  {upcomingAppointments.map((appointment, index) => (
                    <tr key={index} className="hover:bg-[--accent]/30 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-sm text-[--foreground] font-medium">{appointment.time}</p>
                          <p className="text-xs text-[--muted-foreground]">Today</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[--muted] rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-[--muted-foreground]">
                              {appointment.patient.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm text-[--foreground]">{appointment.patient}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-[--foreground]">{appointment.doctor}</td>
                      <td className="py-4 px-6 text-sm text-[--foreground]">{appointment.type}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'confirmed' ? 'bg-[--success]/10 text-[--success]' :
                          appointment.status === 'pending' ? 'bg-[--warning]/10 text-[--warning]' :
                          'bg-[--destructive]/10 text-[--destructive]'
                        }`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
