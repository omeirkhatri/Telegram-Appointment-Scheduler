'use client';

import Header from '@/components/layout/Header';
import { StaffModal } from '@/components/modals';
import { useToastContext } from '@/components/ui/ToastContainer';
import { useStaff } from '@/hooks';
import type { Staff } from '@/types';
import {
    Filter,
    MoreHorizontal,
    Phone,
    Plus,
    Search,
    UserCheck,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function StaffPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { showToast } = useToastContext();

  const {
    staff,
    isLoading,
    error,
    createStaff,
    updateStaff,
    refresh,
  } = useStaff();

  const handleAddStaff = () => {
    setSelectedStaff(null);
    setIsModalOpen(true);
  };

  const handleEditStaff = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedStaff(null);
  };

  const handleModalSuccess = () => {
    refresh();
    showToast({
      type: 'success',
      title: 'Success',
      message: selectedStaff ? 'Staff member updated successfully' : 'Staff member created successfully',
    });
  };

  // Set client-side flag to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message: error,
      });
    }
  }, [error, showToast]);

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
          <button
            onClick={handleAddStaff}
            data-testid="new-staff-button"
            className="inline-flex items-center px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors"
          >
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
                <p className="text-3xl font-bold text-[--foreground]">{isClient ? staff.length : 0}</p>
              </div>
              <Users className="w-8 h-8 text-[--medical-blue]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Doctors</p>
                <p className="text-3xl font-bold text-[--foreground]">{isClient ? staff.filter(s => s.staff_type === 'doctor').length : 0}</p>
              </div>
              <UserCheck className="w-8 h-8 text-[--success]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Nurses</p>
                <p className="text-3xl font-bold text-[--foreground]">{isClient ? staff.filter(s => s.staff_type === 'nurse').length : 0}</p>
              </div>
              <Plus className="w-8 h-8 text-[--warning]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Support Staff</p>
                <p className="text-3xl font-bold text-[--foreground]">{isClient ? staff.filter(s => !['doctor', 'nurse'].includes(s.staff_type)).length : 0}</p>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="staff-search"
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
        <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden shadow-lg" data-testid="staff-list">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[--muted]/50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Staff Member</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Role</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Specialization</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Schedule</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[--muted-foreground]">Contact</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-[--muted-foreground]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-[--muted-foreground]">
                      Loading staff members...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-[--error]">
                      Error loading staff: {error}
                    </td>
                  </tr>
                                ) : !isClient ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-[--muted-foreground]">
                      Loading...
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-[--muted-foreground]">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  staff
                    .filter(member =>
                      searchTerm === '' ||
                      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      member.staff_type.toLowerCase().includes(searchTerm.toLowerCase()),
                    )
                    .map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-[--accent]/30 transition-colors cursor-pointer"
                      onClick={() => handleEditStaff(member)}
                      data-testid={`staff-item-${member.first_name} ${member.last_name}`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[--muted] rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-[--muted-foreground]">
                              {member.first_name[0]}{member.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-[--foreground]">{member.first_name} {member.last_name}</p>
                            <p className="text-sm text-[--muted-foreground]">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.staff_type === 'doctor' ? 'bg-[--medical-blue]/10 text-[--medical-blue]' :
                          member.staff_type === 'nurse' ? 'bg-[--success]/10 text-[--success]' :
                          'bg-[--warning]/10 text-[--warning]'
                        }`}>
                          {member.staff_type.charAt(0).toUpperCase() + member.staff_type.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-[--foreground]">{member.specialization || 'N/A'}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active' ? 'bg-[--success]/10 text-[--success]' :
                          member.status === 'inactive' ? 'bg-[--error]/10 text-[--error]' :
                          'bg-[--warning]/10 text-[--warning]'
                        }`}>
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-[--foreground]">
                        {member.available_days?.length ? `${member.available_days.length} days/week` : 'N/A'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-[--muted-foreground]" />
                          <span className="text-sm text-[--foreground]">{member.phone}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStaff(member);
                          }}
                          className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff Modal */}
        <StaffModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          initialStaff={selectedStaff}
        />
      </main>
    </div>
  );
}
