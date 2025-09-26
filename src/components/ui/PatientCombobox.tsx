'use client';

import { useDebounce } from '@/hooks';
import type { Patient } from '@/types';
import { Search, User, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface PatientComboboxProps {
  patients: Patient[];
  selectedPatient?: Patient | null;
  onPatientSelect: (patient: Patient | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function PatientCombobox({
  patients,
  selectedPatient,
  onPatientSelect,
  placeholder = 'Search patients by name...',
  className = '',
  disabled = false,
  error,
}: PatientComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounce search term to avoid too many API calls
  const { debouncedValue: debouncedSearchTerm } = useDebounce(searchTerm, {
    delay: 300,
    leading: false,
    trailing: true,
  });

  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return patients;
    }

    const term = debouncedSearchTerm.toLowerCase();
    return patients.filter((patient) => {
      const name = patient.name.toLowerCase();
      return name.includes(term);
    });
  }, [patients, debouncedSearchTerm]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // If user clears the input, clear selection
    if (!value.trim()) {
      onPatientSelect(null);
    }
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    onPatientSelect(patient);
    setSearchTerm(patient.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle clear selection
  const handleClear = () => {
    onPatientSelect(null);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredPatients.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredPatients.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredPatients.length) {
          handlePatientSelect(filteredPatients[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    if (!searchTerm && selectedPatient) {
      setSearchTerm(selectedPatient.name);
    }
  };

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    // Delay to allow click events on options
    setTimeout(() => {
      if (e.currentTarget && !e.currentTarget.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  // Update search term when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      setSearchTerm(selectedPatient.name);
    } else {
      setSearchTerm('');
    }
  }, [selectedPatient]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {selectedPatient && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <ul ref={listRef} className="py-1">
            {filteredPatients.length === 0 ? (
              <li className="px-3 py-2 text-gray-500 text-sm">
                {debouncedSearchTerm ? 'No patients found' : 'Start typing to search patients...'}
              </li>
            ) : (
              filteredPatients.map((patient, index) => (
                <li
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className={`px-3 py-2 cursor-pointer flex items-center space-x-3 ${
                    index === highlightedIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{patient.name}</div>
                    <div className="text-xs text-gray-500 truncate">{patient.phone}</div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
