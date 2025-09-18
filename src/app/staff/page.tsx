'use client';

import Header from '@/components/layout/Header';
import { StaffModal } from '@/components/modals';
import { VirtualizedTable, type VirtualizedTableColumn } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import { useStaff } from '@/hooks';
import { createStaffShortcuts, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
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
import { useCallback, useEffect, useRef, useState } from 'react';

export default function StaffPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { showToast } = useToastContext();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input function
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  // Page-specific keyboard shortcuts
  const staffShortcuts = createStaffShortcuts(focusSearch);

  useKeyboardShortcuts({
    shortcuts: staffShortcuts,
    enabled: true,
    ignoreInputs: true,
  });

  const {
    staff,
    isLoading,
    error,
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

  // Filter staff based on search term
  const filteredStaff = staff.filter(member =>
    searchTerm === '' ||
    `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.staff_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Define columns for virtualized table
  const columns: VirtualizedTableColumn<Staff>[] = [
    {
      key: 'staff',
      header: 'Staff Member',
      width: 400,
      minWidth: 200,
      render: (member) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[--muted] rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-[--muted-foreground]">
              {member.first_name[0]}{member.last_name[0]}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[--foreground] truncate">{member.first_name} {member.last_name}</p>
            <p className="text-sm text-[--muted-foreground] truncate">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: 180,
      minWidth: 100,
      render: (member) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          member.staff_type === 'doctor' ? 'bg-[--medical-blue]/10 text-[--medical-blue]' :
          member.staff_type === 'nurse' ? 'bg-[--success]/10 text-[--success]' :
          'bg-[--warning]/10 text-[--warning]'
        }`}>
          {member.staff_type.charAt(0).toUpperCase() + member.staff_type.slice(1)}
        </span>
      ),
    },
    {
      key: 'specialization',
      header: 'Specialization',
      width: 250,
      minWidth: 120,
      render: (member) => (
        <span className="text-sm text-[--foreground] truncate">{member.specialization || 'N/A'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 140,
      minWidth: 80,
      render: (member) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          member.status === 'active' ? 'bg-[--success]/10 text-[--success]' :
          member.status === 'inactive' ? 'bg-[--error]/10 text-[--error]' :
          'bg-[--warning]/10 text-[--warning]'
        }`}>
          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      width: 180,
      minWidth: 120,
      render: (member) => (
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-[--muted-foreground] flex-shrink-0" />
          <span className="text-sm text-[--foreground] truncate">{member.phone}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      width: 300,
      minWidth: 150,
      render: (member) => (
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-sm text-[--foreground] truncate">{member.email}</span>
          {member.telegram_verified ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
              ✅ Telegram Verified
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex-shrink-0">
              ⚠️ Not Verified
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      minWidth: 80,
      render: (member) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEditStaff(member);
          }}
          className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      ),
    },
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
                ref={searchInputRef}
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

        {/* Error Display */}
        {error && (
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="bg-[--destructive]/10 border border-[--destructive]/20 rounded-lg p-4">
              <p className="text-[--destructive] font-medium">Error loading staff</p>
              <p className="text-[--destructive]/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Virtualized Staff Table */}
        <VirtualizedTable
          data={filteredStaff}
          columns={columns}
          height={600}
          itemHeight={80}
          loading={isLoading || !isClient}
          loadingMessage="Loading staff members..."
          emptyMessage="No staff members found"
          onRowClick={handleEditStaff}
          getRowKey={(member) => member.id}
          enableKeyboardNavigation={true}
        />

        {/* Staff Modal */}
        <StaffModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          onVerificationSuccess={refresh}
          initialStaff={selectedStaff || undefined}
        />
      </main>
    </div>
  );
}
