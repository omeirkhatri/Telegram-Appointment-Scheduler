'use client';

import { Button } from '@/components/ui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Calendar,
    ChevronDown,
    Columns,
    LayoutGrid,
    Table
} from 'lucide-react';
import { useEffect, useState } from 'react';

export type LeadViewMode = 'kanban' | 'table' | 'cards' | 'timeline';

interface LeadViewSwitcherProps {
  currentView: LeadViewMode;
  onViewChange: (view: LeadViewMode) => void;
  className?: string;
}

const VIEW_OPTIONS: Array<{
  value: LeadViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  mobile?: boolean;
}> = [
  {
    value: 'kanban',
    label: 'Kanban',
    icon: Columns,
    description: 'Drag and drop pipeline view',
    mobile: true,
  },
  {
    value: 'table',
    label: 'Table',
    icon: Table,
    description: 'Detailed list with sorting',
    mobile: false,
  },
  {
    value: 'cards',
    label: 'Cards',
    icon: LayoutGrid,
    description: 'Visual card grid',
    mobile: true,
  },
  {
    value: 'timeline',
    label: 'Timeline',
    icon: Calendar,
    description: 'Chronological view',
    mobile: true,
  },
];

const STORAGE_KEY = 'lead-view-mode';

export function LeadViewSwitcher({
  currentView,
  onViewChange,
  className = ''
}: LeadViewSwitcherProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Load saved view preference
    const savedView = localStorage.getItem(STORAGE_KEY) as LeadViewMode;
    if (savedView && savedView !== currentView) {
      onViewChange(savedView);
    }
  }, [currentView, onViewChange]);

  const handleViewChange = (view: LeadViewMode) => {
    onViewChange(view);
    localStorage.setItem(STORAGE_KEY, view);
  };

  const currentViewOption = VIEW_OPTIONS.find(option => option.value === currentView);
  const availableViews = VIEW_OPTIONS.filter(option =>
    isMobile ? option.mobile : true
  );

  if (isMobile) {
    // Mobile: Show as dropdown
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={`${className}`}>
            {currentViewOption && (
              <>
                <currentViewOption.icon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{currentViewOption.label}</span>
              </>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableViews.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleViewChange(option.value)}
              className="flex items-center"
            >
              <option.icon className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Desktop: Show as button group
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {availableViews.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === currentView;

        return (
          <Button
            key={option.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange(option.value)}
            className="flex items-center space-x-2"
            title={option.description}
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

// Hook for managing view state
export function useLeadViewMode(): [LeadViewMode, (view: LeadViewMode) => void] {
  const [viewMode, setViewMode] = useState<LeadViewMode>('kanban');

  useEffect(() => {
    const savedView = localStorage.getItem(STORAGE_KEY) as LeadViewMode;
    if (savedView && VIEW_OPTIONS.some(option => option.value === savedView)) {
      setViewMode(savedView);
    }
  }, []);

  const changeView = (view: LeadViewMode) => {
    setViewMode(view);
    localStorage.setItem(STORAGE_KEY, view);
  };

  return [viewMode, changeView];
}
