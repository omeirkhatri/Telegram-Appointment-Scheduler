'use client';

import Header from '@/components/layout/Header';
import {
    Filter,
    MoreHorizontal,
    Phone,
    Plus,
    Search,
    UserCheck,
    Users
} from 'lucide-react';

export default function StaffPage() {
  // Sample staff data
  const staff = [
    {
      id: 1,
      name: 'Dr. Sarah Smith',
      email: 'dr.smith@medicare.com',
      phone: '+1 (555) 123-4567',
      role: 'Doctor',
      department: 'Cardiology',
      status: 'Active',
      schedule: 'Mon-Fri, 9AM-5PM',
      patients: 45,
      avatar: 'SS'
    },
    {
      id: 2,
      name: 'Dr. Michael Johnson',
      email: 'dr.johnson@medicare.com',
      phone: '+1 (555) 234-5678',
      role: 'Doctor',
      department: 'Neurology',
      status: 'Active',
      schedule: 'Mon-Fri, 8AM-4PM',
      patients: 38,
      avatar: 'MJ'
    },
    {
      id: 3,
      name: 'Dr. Emily Brown',
      email: 'dr.brown@medicare.com',
      phone: '+1 (555) 345-6789',
      role: 'Doctor',
      department: 'Pediatrics',
      status: 'Active',
      schedule: 'Mon-Fri, 10AM-6PM',
      patients: 52,
      avatar: 'EB'
    },
    {
      id: 4,
      name: 'Nurse Jennifer Wilson',
      email: 'nurse.wilson@medicare.com',
      phone: '+1 (555) 456-7890',
      role: 'Nurse',
      department: 'Emergency',
      status: 'Active',
      schedule: 'Rotating shifts',
      patients: 28,
      avatar: 'JW'
    },
    {
      id: 5,
      name: 'Dr. Robert Davis',
      email: 'dr.davis@medicare.com',
      phone: '+1 (555) 567-8901',
      role: 'Doctor',
      department: 'Orthopedics',
      status: 'On Leave',
      schedule: 'Mon-Fri, 9AM-5PM',
      patients: 0,
      avatar: 'RD'
    }
  ];

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* Header with Navigation */}
      <Header currentPage="staff" />

      {/* Main Content - Full Width */}
      <main className="px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[--foreground]">Staff</h1>
            <p className="text-[--muted-foreground] text-lg mt-1">Manage healthcare staff and schedules</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Total Staff</p>
                <p className="text-3xl font-bold text-[--foreground]">24</p>
              </div>
              <Users className="w-8 h-8 text-[--medical-blue]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Doctors</p>
                <p className="text-3xl font-bold text-[--foreground]">8</p>
              </div>
              <UserCheck className="w-8 h-8 text-[--success]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Nurses</p>
                <p className="text-3xl font-bold text-[--foreground]">12</p>
              </div>
              <Plus className="w-8 h-8 text-[--warning]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Support Staff</p>
                <p className="text-3xl font-bold text-[--foreground]">4</p>
              </div>
              <UserCheck className="w-8 h-8 text-[--error]" />
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
              <input
                type="text"
                placeholder="Search staff..."
                className="w-full pl-10 pr-4 py-3 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] placeholder-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
              />
            </div>
            <button className="inline-flex items-center px-4 py-3 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--muted-foreground] hover:text-[--foreground]">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>
        </div>

        {/* Staff table */}
        <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[--muted]/50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Staff Member</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Role</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Department</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Schedule</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Contact</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-[--muted-foreground]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-[--accent]/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[--muted] rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-[--muted-foreground]">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[--foreground]">{member.name}</p>
                          <p className="text-sm text-[--muted-foreground]">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        member.role === 'Doctor' ? 'bg-[--medical-blue]/10 text-[--medical-blue]' :
                        member.role === 'Nurse' ? 'bg-[--success]/10 text-[--success]' :
                        'bg-[--warning]/10 text-[--warning]'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-[--foreground]">{member.department}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        member.status === 'Active' ? 'bg-[--success]/10 text-[--success]' :
                        member.status === 'On Leave' ? 'bg-[--warning]/10 text-[--warning]' :
                        'bg-[--error]/10 text-[--error]'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-[--foreground]">{member.schedule}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-[--muted-foreground]" />
                        <span className="text-sm text-[--foreground]">{member.phone}</span>
                      </div>
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
  );
}
