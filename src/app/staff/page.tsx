'use client';

import { StaffModal } from '@/components/features/staff';
import { PageHeader } from '@/components/layout/PageHeader';
import { ShadButton as Button, ShadCard as Card, Input, VirtualizedTable, type VirtualizedTableColumn } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import { useStaff } from '@/hooks';
import { createStaffShortcuts, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Staff } from '@/types';
import type { CalendarVerificationStatus } from '@/types/calendar';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Filter,
    MoreHorizontal,
    Phone,
    Plus,
    Search,
    Users,
    XCircle
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function StaffPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<CalendarVerificationStatus | 'all'>('all');
  const [isClient, setIsClient] = useState(false);
  const { showToast } = useToastContext();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const verificationCheckInterval = useRef<NodeJS.Timeout | null>(null);

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

  // Check verification status for pending staff members
  useEffect(() => {
    const checkVerificationStatus = async () => {
      const pendingStaff = staff.filter(s => s.calendar_verification_status === 'pending');

      if (pendingStaff.length === 0) {
        return;
      }

      let hasUpdates = false;

      for (const staffMember of pendingStaff) {
        try {
          const response = await fetch(`/api/calendar/verify?staff_id=${staffMember.id}`);
          const data = await response.json();

          if (data.success && data.verification_status === 'verified') {
            hasUpdates = true;
            showToast({
              type: 'success',
              title: 'Calendar Verified',
              message: `${staffMember.first_name} ${staffMember.last_name}'s calendar has been verified!`,
            });
          }
        } catch (error) {
          console.warn(`Failed to check verification status for ${staffMember.id}:`, error);
        }
      }

      if (hasUpdates) {
        refresh();
      }
    };

    // Check every 10 seconds if there are pending verifications
    if (staff.some(s => s.calendar_verification_status === 'pending')) {
      verificationCheckInterval.current = setInterval(checkVerificationStatus, 10000);
    }

    return () => {
      if (verificationCheckInterval.current) {
        clearInterval(verificationCheckInterval.current);
      }
    };
  }, [staff, refresh, showToast]);

  // Calendar status helpers
  const getCalendarStatusIcon = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'not_required':
        return <Calendar className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCalendarStatusText = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'not_required':
        return 'Not Required';
      default:
        return 'Unknown';
    }
  };

  const getCalendarStatusColor = (status: CalendarVerificationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_required':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Filter staff based on search term and calendar status
  const filteredStaff = staff.filter(member => {
    const matchesSearch = searchTerm === '' ||
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.staff_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCalendarStatus = calendarStatusFilter === 'all' ||
      member.calendar_verification_status === calendarStatusFilter;

    return matchesSearch && matchesCalendarStatus;
  });

  // Define columns for virtualized table
  const columns: VirtualizedTableColumn<Staff>[] = [
    {
      key: 'staff',
      header: 'Staff Member',
      width: 280,
      minWidth: 180,
      render: (member) => (
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[--muted] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm font-medium text-[--muted-foreground]">
              {member.first_name[0]}{member.last_name[0]}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[--foreground] truncate text-sm sm:text-base">{member.first_name} {member.last_name}</p>
            <p className="text-xs sm:text-sm text-[--muted-foreground] truncate">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: 120,
      minWidth: 80,
      render: (member) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          member.staff_type === 'doctor' ? 'bg-[--medical-blue]/10 text-[--medical-blue]' :
          member.staff_type === 'nurse' ? 'bg-[--success]/10 text-[--success]' :
          'bg-[--warning]/10 text-[--warning]'
        }`}>
          <span className="hidden sm:inline">{member.staff_type.charAt(0).toUpperCase() + member.staff_type.slice(1)}</span>
          <span className="sm:hidden">{member.staff_type.charAt(0).toUpperCase()}</span>
        </span>
      ),
    },
    {
      key: 'specialization',
      header: 'Specialization',
      width: 180,
      minWidth: 100,
      render: (member) => (
        <span className="text-xs sm:text-sm text-[--foreground] truncate">{member.specialization || 'N/A'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 100,
      minWidth: 60,
      render: (member) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          member.status === 'active' ? 'bg-[--success]/10 text-[--success]' :
          member.status === 'inactive' ? 'bg-[--error]/10 text-[--error]' :
          'bg-[--warning]/10 text-[--warning]'
        }`}>
          <span className="hidden sm:inline">{member.status.charAt(0).toUpperCase() + member.status.slice(1)}</span>
          <span className="sm:hidden">{member.status.charAt(0).toUpperCase()}</span>
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      width: 140,
      minWidth: 100,
      render: (member) => (
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-[--muted-foreground] flex-shrink-0" />
          <span className="text-xs sm:text-sm text-[--foreground] truncate">{member.phone}</span>
        </div>
      ),
    },
    {
      key: 'telegram_status',
      header: 'Telegram',
      width: 120,
      minWidth: 80,
      render: (member) => (
        <div className="flex items-center space-x-1">
          {member.telegram_verified ? (
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
          )}
          <span className={`inline-flex items-center px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium ${
            member.telegram_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <span className="hidden sm:inline">{member.telegram_verified ? 'Verified' : 'Not Verified'}</span>
            <span className="sm:hidden">{member.telegram_verified ? '✓' : '✗'}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'calendar_status',
      header: 'Calendar Status',
      width: 160,
      minWidth: 100,
      maxWidth: 180,
      render: (member) => (
        <div className="flex items-center space-x-1">
          {getCalendarStatusIcon(member.calendar_verification_status)}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCalendarStatusColor(member.calendar_verification_status)}`}>
            <span className="hidden sm:inline">{getCalendarStatusText(member.calendar_verification_status)}</span>
            <span className="sm:hidden">
              {member.calendar_verification_status === 'verified' ? '✓' :
               member.calendar_verification_status === 'failed' ? '✗' :
               member.calendar_verification_status === 'pending' ? '⏳' : '○'}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 60,
      minWidth: 50,
      render: (member) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleEditStaff(member);
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Staff"
        description="Manage healthcare staff and schedules"
        actions={
          <Button onClick={handleAddStaff} data-testid="new-staff-button">
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Total Staff</p>
                <p className="text-3xl font-bold text-[--foreground]">{isClient ? staff.length : 0}</p>
              </div>
              <Users className="w-8 h-8 text-[--medical-blue]" />
            </div>
          </Card>
        <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Calendar Verified</p>
                <p className="text-3xl font-bold text-[--foreground]">{isClient ? staff.filter(s => s.calendar_verification_status === 'verified').length : 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>
        <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Calendar Pending</p>
                <p className="text-3xl font-bold text-[--foreground]">{isClient ? staff.filter(s => s.calendar_verification_status === 'pending').length : 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>
        <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Calendar Failed</p>
                <p className="text-3xl font-bold text-[--foreground]">{isClient ? staff.filter(s => s.calendar_verification_status === 'failed').length : 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </Card>
      </div>

      {/* Search and filters */}
      <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="staff-search"
                className="w-full pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
                <select
                  value={calendarStatusFilter}
                  onChange={(e) => setCalendarStatusFilter(e.target.value as CalendarVerificationStatus | 'all')}
                  className="w-full pl-10 pr-8 py-2.5 sm:py-3 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent appearance-none text-sm sm:text-base"
                >
                  <option value="all">All Calendar Status</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="not_required">Not Required</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setCalendarStatusFilter('all');
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-6">
          <div className="bg-[--destructive]/10 border border-[--destructive]/20 rounded-lg p-4">
            <p className="text-[--destructive] font-medium">Error loading staff</p>
            <p className="text-[--destructive]/80 text-sm mt-1">{error}</p>
          </div>
        </Card>
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
    </>
  );
}
