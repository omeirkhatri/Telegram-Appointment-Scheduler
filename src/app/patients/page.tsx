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

export default function Patients() {
  // Sample patients data
  const patients = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 (555) 123-4567',
      age: 34,
      status: 'active',
      lastVisit: '2024-01-15',
      nextAppointment: '2024-02-20',
      doctor: 'Dr. Smith'
    },
    {
      id: 2,
      name: 'Mike Wilson',
      email: 'mike.wilson@email.com',
      phone: '+1 (555) 234-5678',
      age: 28,
      status: 'active',
      lastVisit: '2024-01-10',
      nextAppointment: '2024-02-15',
      doctor: 'Dr. Johnson'
    },
    {
      id: 3,
      name: 'Emma Davis',
      email: 'emma.davis@email.com',
      phone: '+1 (555) 345-6789',
      age: 42,
      status: 'pending',
      lastVisit: '2024-01-05',
      nextAppointment: '2024-02-10',
      doctor: 'Dr. Brown'
    },
    {
      id: 4,
      name: 'James Wilson',
      email: 'james.wilson@email.com',
      phone: '+1 (555) 456-7890',
      age: 39,
      status: 'active',
      lastVisit: '2024-01-20',
      nextAppointment: '2024-02-25',
      doctor: 'Dr. Smith'
    },
    {
      id: 5,
      name: 'Maria Garcia',
      email: 'maria.garcia@email.com',
      phone: '+1 (555) 567-8901',
      age: 31,
      status: 'inactive',
      lastVisit: '2023-12-15',
      nextAppointment: null,
      doctor: 'Dr. Johnson'
    }
  ];

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* Header with Navigation */}
      <Header currentPage="patients" />

      {/* Main Content - Full Width */}
      <main className="px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[--foreground]">Patients</h1>
            <p className="text-[--muted-foreground] text-lg mt-1">Manage patient records and information</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Total Patients</p>
                <p className="text-3xl font-bold text-[--foreground]">156</p>
              </div>
              <Users className="w-8 h-8 text-[--medical-blue]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Active Patients</p>
                <p className="text-3xl font-bold text-[--foreground]">142</p>
              </div>
              <UserCheck className="w-8 h-8 text-[--success]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">New This Month</p>
                <p className="text-3xl font-bold text-[--foreground]">12</p>
              </div>
              <Plus className="w-8 h-8 text-[--warning]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Pending Reviews</p>
                <p className="text-3xl font-bold text-[--foreground]">8</p>
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
                placeholder="Search patients..."
                className="w-full pl-10 pr-4 py-3 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] placeholder-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
              />
            </div>
            <button className="inline-flex items-center px-4 py-3 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors text-[--muted-foreground] hover:text-[--foreground]">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>
        </div>

        {/* Patients table */}
        <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[--muted]/50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Patient</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Contact</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Age</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Last Visit</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Next Appointment</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Doctor</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-[--muted-foreground]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-[--accent]/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-[--foreground]">{patient.name}</p>
                        <p className="text-sm text-[--muted-foreground]">{patient.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-[--muted-foreground]" />
                        <span className="text-sm text-[--foreground]">{patient.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-[--foreground]">{patient.age}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        patient.status === 'active' ? 'bg-[--success]/10 text-[--success]' :
                        patient.status === 'pending' ? 'bg-[--warning]/10 text-[--warning]' :
                        'bg-[--muted] text-[--muted-foreground]'
                      }`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-[--foreground]">{patient.lastVisit}</td>
                    <td className="py-4 px-6 text-sm text-[--foreground]">
                      {patient.nextAppointment || 'None scheduled'}
                    </td>
                    <td className="py-4 px-6 text-sm text-[--foreground]">{patient.doctor}</td>
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
