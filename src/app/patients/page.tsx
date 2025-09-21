'use client';

import Header from '@/components/layout/Header';
import { PatientModal } from '@/components/features/patients';
import { VirtualizedTable, type VirtualizedTableColumn } from '@/components/ui';
import { useToastContext } from '@/components/ui/ToastContainer';
import { createPatientShortcuts, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Patient } from '@/types';
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

export default function Patients() {
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToastContext();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input function
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  // Page-specific keyboard shortcuts
  const patientShortcuts = createPatientShortcuts(focusSearch);

  useKeyboardShortcuts({
    shortcuts: patientShortcuts,
    enabled: true,
    ignoreInputs: true,
  });

  // Fetch patients from API
  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/patients');
      const result = await response.json();

      if (result.success) {
        setPatients(result.data);
      } else {
        setError(result.error || 'Failed to fetch patients');
      }
    } catch (err) {
      setError('Failed to fetch patients');
      console.error('Error fetching patients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load patients on component mount
  useEffect(() => {
    fetchPatients();
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


  const handleAddPatient = () => {
    setEditingPatient(null);
    setIsPatientModalOpen(true);
  };

  const handleEditPatient = (patient: any) => {
    setEditingPatient(patient);
    setIsPatientModalOpen(true);
  };

  const handlePatientModalClose = () => {
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  };

  const handlePatientSuccess = () => {
    // Refresh patients list after successful save
    fetchPatients();
    showToast({
      type: 'success',
      title: 'Success',
      message: editingPatient ? 'Patient updated successfully' : 'Patient created successfully',
    });
  };

  // Define columns for virtualized table
  const columns: VirtualizedTableColumn<Patient>[] = [
    {
      key: 'patient',
      header: 'Patient',
      width: 350,
      minWidth: 200,
      render: (patient) => (
        <div className="min-w-0">
          <p className="font-medium text-[--foreground] truncate">{patient.name}</p>
          <p className="text-sm text-[--muted-foreground] truncate">ID: {patient.id}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      width: 220,
      minWidth: 120,
      render: (patient) => (
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-[--muted-foreground] flex-shrink-0" />
          <span className="text-sm text-[--foreground] truncate">{patient.phone}</span>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      width: 400,
      minWidth: 200,
      render: (patient) => (
        <div className="text-sm text-[--foreground] min-w-0">
          <p className="truncate">{patient.flat_villa_no}, {patient.building_street}</p>
          <p className="text-[--muted-foreground] truncate">{patient.area}, {patient.city}</p>
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      width: 180,
      minWidth: 100,
      render: (patient) => (
        <span className="text-sm text-[--foreground]">
          {new Date(patient.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'document',
      header: 'Document',
      width: 180,
      minWidth: 120,
      render: (patient) => (
        patient.id_document_url ? (
          <a
            href={patient.id_document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[--success]/10 text-[--success] hover:bg-[--success]/20 transition-colors"
          >
            View Document
          </a>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[--muted] text-[--muted-foreground]">
            None
          </span>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      minWidth: 80,
      render: (patient) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEditPatient(patient);
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
      <Header currentPage="patients" />

      {/* Main Content - Full Width */}
      <main className="px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[--foreground]">Patients</h1>
            <p className="text-[--muted-foreground] text-lg mt-1">Manage patient records and information</p>
          </div>
          <button
            onClick={handleAddPatient}
            className="inline-flex items-center px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors"
          >
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
                <p className="text-3xl font-bold text-[--foreground]">
                  {isLoading ? '...' : patients.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-[--medical-blue]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">Active Patients</p>
                <p className="text-3xl font-bold text-[--foreground]">
                  {isLoading ? '...' : patients.length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-[--success]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">New This Month</p>
                <p className="text-3xl font-bold text-[--foreground]">
                  {isLoading ? '...' : patients.filter(p => {
                    const created = new Date(p.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Plus className="w-8 h-8 text-[--warning]" />
            </div>
          </div>
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--muted-foreground]">With ID Documents</p>
                <p className="text-3xl font-bold text-[--foreground]">
                  {isLoading ? '...' : patients.filter(p => p.id_document_url).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-[--success]" />
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

        {/* Error Display */}
        {error && (
          <div className="bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg">
            <div className="bg-[--destructive]/10 border border-[--destructive]/20 rounded-lg p-4">
              <p className="text-[--destructive] font-medium">Error loading patients</p>
              <p className="text-[--destructive]/80 text-sm mt-1">{error}</p>
              <button
                onClick={fetchPatients}
                className="mt-2 px-3 py-1 bg-[--destructive] text-[--destructive-foreground] rounded text-sm hover:bg-[--destructive]/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Virtualized Patients Table */}
        <VirtualizedTable
          data={patients}
          columns={columns}
          height={600}
          itemHeight={80}
          loading={isLoading}
          loadingMessage="Loading patients..."
          emptyMessage="No patients found"
          onRowClick={handleEditPatient}
          getRowKey={(patient) => patient.id}
          enableKeyboardNavigation={true}
        />
      </main>

      {/* Patient Modal */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={handlePatientModalClose}
        onSuccess={handlePatientSuccess}
        initialPatient={editingPatient || undefined}
      />
    </div>
  );
}
