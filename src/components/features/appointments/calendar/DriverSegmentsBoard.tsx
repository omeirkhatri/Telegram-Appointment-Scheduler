'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { Staff } from '@/types/staff';
import type { TransportationSegment, TransportationSegmentStatus, TransportationSegmentType } from '@/types/transportationSegment';
import { getTransportationSegmentStatusLabel, getTransportationSegmentTypeLabel } from '@/types/transportationSegment';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle,
    Clock,
    Edit,
    MapPin,
    Phone,
    Play,
    RefreshCw,
    Search,
    User,
    Users,
    XCircle
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DriverReassignmentModal } from './DriverReassignmentModal';
import { DriverTimelineView } from './DriverTimelineView';
import { TransportationSegmentEditModal } from './TransportationSegmentEditModal';

interface DriverSegmentsBoardProps {
  segments?: TransportationSegment[];
  unassignedSegments?: TransportationSegment[];
  drivers?: Staff[];
  selectedDate?: string;
  timeWindow?: '12h' | '24h' | '48h' | '72h' | '7d';
  onSegmentClick?: (segment: TransportationSegment) => void;
  onDriverClick?: (driver: Staff) => void;
  onSegmentStatusUpdate?: (segmentId: string, status: TransportationSegmentStatus) => void;
  onSegmentReassign?: (segmentId: string, newDriverId: string) => void;
  onSegmentUpdate?: (segmentId: string, updates: Partial<TransportationSegment>) => void;
  onSegmentAssign?: (segmentId: string, driverId: string) => void;
  onSegmentAssignToVendor?: (segmentId: string, vendorType: string) => void;
  onCallDriver?: (driver: Staff) => void;
  onRefresh?: () => void;
  onTimeWindowChange?: (window: '12h' | '24h' | '48h' | '72h' | '7d') => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

interface DriverTimeline {
  driver: Staff;
  segments: TransportationSegment[];
  conflicts: SegmentConflict[];
  totalSegments: number;
  completedSegments: number;
  inProgressSegments: number;
  upcomingSegments: number;
}

interface VendorLane {
  vendorType: string;
  segments: TransportationSegment[];
  totalSegments: number;
  completedSegments: number;
  inProgressSegments: number;
  upcomingSegments: number;
}

interface SegmentConflict {
  segmentId: string;
  conflictType: 'overlap' | 'travel_gap' | 'manual_override';
  severity: 'low' | 'medium' | 'high';
  message: string;
  relatedSegmentId?: string;
}

export function DriverSegmentsBoard({
  segments = [],
  unassignedSegments = [],
  drivers = [],
  selectedDate,
  timeWindow = '24h',
  onSegmentClick,
  onDriverClick,
  onSegmentStatusUpdate,
  onSegmentReassign,
  onSegmentUpdate,
  onSegmentAssign,
  onSegmentAssignToVendor,
  onCallDriver,
  onRefresh,
  onTimeWindowChange,
  isLoading = false,
  error = null,
  className = ''
}: DriverSegmentsBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransportationSegmentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TransportationSegmentType | 'all'>('all');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [customTimeRange, setCustomTimeRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [reassignmentModal, setReassignmentModal] = useState<{
    isOpen: boolean;
    segment: TransportationSegment | null;
  }>({ isOpen: false, segment: null });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    segment: TransportationSegment | null;
  }>({ isOpen: false, segment: null });
  const [draggedSegment, setDraggedSegment] = useState<TransportationSegment | null>(null);
  const [dragOverDriver, setDragOverDriver] = useState<string | null>(null);
  const [dragOverVendor, setDragOverVendor] = useState<string | null>(null);

  // Filter segments based on search, filters, and time window
  const filteredSegments = useMemo(() => {
    return segments.filter(segment => {
      const matchesSearch = !searchTerm ||
        segment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        segment.driver?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        segment.driver?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        segment.instructions?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || segment.status === statusFilter;
      const matchesType = typeFilter === 'all' || segment.segment_type === typeFilter;

      // Time window filtering
      const matchesTimeWindow = (() => {
        if (!segment.planned_start) return true;

        const segmentStart = new Date(segment.planned_start);

        // If custom time range is set, use it
        if (customTimeRange) {
          const rangeStart = new Date(customTimeRange.start);
          const rangeEnd = new Date(customTimeRange.end);
          return segmentStart >= rangeStart && segmentStart <= rangeEnd;
        }

        // Otherwise use the standard time window
        const now = new Date();
        let windowHours: number;

        if (timeWindow === '7d') {
          windowHours = 7 * 24; // 7 days
        } else {
          windowHours = parseInt(timeWindow.replace('h', ''));
        }

        const windowEnd = new Date(now.getTime() + (windowHours * 60 * 60 * 1000));

        return segmentStart >= now && segmentStart <= windowEnd;
      })();

      return matchesSearch && matchesStatus && matchesType && matchesTimeWindow;
    });
  }, [segments, searchTerm, statusFilter, typeFilter, timeWindow, customTimeRange]);

  // Group segments by driver and detect conflicts
  const driverTimelines = useMemo((): DriverTimeline[] => {
    const driverMap = new Map<string, DriverTimeline>();

    // Initialize drivers
    drivers.forEach(driver => {
      driverMap.set(driver.id, {
        driver,
        segments: [],
        conflicts: [],
        totalSegments: 0,
        completedSegments: 0,
        inProgressSegments: 0,
        upcomingSegments: 0
      });
    });

    // Add segments to drivers
    filteredSegments.forEach(segment => {
      if (segment.driver_id && driverMap.has(segment.driver_id)) {
        const timeline = driverMap.get(segment.driver_id)!;
        timeline.segments.push(segment);
        timeline.totalSegments++;

        // Count by status
        switch (segment.status) {
          case 'completed':
            timeline.completedSegments++;
            break;
          case 'in_progress':
            timeline.inProgressSegments++;
            break;
          case 'scheduled':
          case 'draft':
            timeline.upcomingSegments++;
            break;
        }
      }
    });

    // Sort segments by planned_start time
    driverMap.forEach(timeline => {
      timeline.segments.sort((a, b) => {
        const timeA = a.planned_start ? new Date(a.planned_start).getTime() : 0;
        const timeB = b.planned_start ? new Date(b.planned_start).getTime() : 0;
        return timeA - timeB;
      });
    });

    // Detect conflicts
    driverMap.forEach(timeline => {
      const conflicts: SegmentConflict[] = [];

      for (let i = 0; i < timeline.segments.length - 1; i++) {
        const current = timeline.segments[i];
        const next = timeline.segments[i + 1];

        if (!current.planned_end || !next.planned_start) continue;

        const currentEnd = new Date(current.planned_end).getTime();
        const nextStart = new Date(next.planned_start).getTime();

        // Check for overlap
        if (currentEnd > nextStart) {
          conflicts.push({
            segmentId: current.id,
            conflictType: 'overlap',
            severity: 'high',
            message: `Overlaps with next segment`,
            relatedSegmentId: next.id
          });
        }

        // Check for insufficient travel time (less than 20 minutes)
        const travelGap = nextStart - currentEnd;
        const minTravelTime = 20 * 60 * 1000; // 20 minutes in milliseconds

        if (travelGap < minTravelTime && travelGap > 0) {
          conflicts.push({
            segmentId: current.id,
            conflictType: 'travel_gap',
            severity: 'medium',
            message: `Insufficient travel time (${Math.round(travelGap / 60000)} min)`,
            relatedSegmentId: next.id
          });
        }

        // Check for manual overrides
        if (current.manual_override) {
          conflicts.push({
            segmentId: current.id,
            conflictType: 'manual_override',
            severity: 'low',
            message: 'Manual override applied'
          });
        }
      }

      timeline.conflicts = conflicts;
    });

    return Array.from(driverMap.values()).filter(timeline => timeline.totalSegments > 0);
  }, [filteredSegments, drivers]);

  // Group segments by vendor type for vendor lanes
  const vendorLanes = useMemo((): VendorLane[] => {
    const vendorMap = new Map<string, VendorLane>();

    // Process segments with vendor transport modes
    filteredSegments.forEach(segment => {
      // Check if this is a vendor segment (no driver_id and has vendor transport mode)
      if (!segment.driver_id && segment.travel_mode && ['vendor', 'public_transport', 'taxi', 'uber'].includes(segment.travel_mode)) {
        const vendorType = segment.travel_mode;

        if (!vendorMap.has(vendorType)) {
          vendorMap.set(vendorType, {
            vendorType,
            segments: [],
            totalSegments: 0,
            completedSegments: 0,
            inProgressSegments: 0,
            upcomingSegments: 0
          });
        }

        const lane = vendorMap.get(vendorType)!;
        lane.segments.push(segment);
        lane.totalSegments++;

        // Count by status
        switch (segment.status) {
          case 'completed':
            lane.completedSegments++;
            break;
          case 'in_progress':
            lane.inProgressSegments++;
            break;
          case 'scheduled':
          case 'draft':
            lane.upcomingSegments++;
            break;
        }
      }
    });

    // Sort segments by planned_start time
    vendorMap.forEach(lane => {
      lane.segments.sort((a, b) => {
        const timeA = a.planned_start ? new Date(a.planned_start).getTime() : 0;
        const timeB = b.planned_start ? new Date(b.planned_start).getTime() : 0;
        return timeA - timeB;
      });
    });

    return Array.from(vendorMap.values()).filter(lane => lane.totalSegments > 0);
  }, [filteredSegments]);

  // Filter drivers based on conflicts if enabled
  const displayTimelines = useMemo(() => {
    if (showConflictsOnly) {
      return driverTimelines.filter(timeline => timeline.conflicts.length > 0);
    }
    return driverTimelines;
  }, [driverTimelines, showConflictsOnly]);

  const toggleDriverExpansion = (driverId: string) => {
    const newExpanded = new Set(expandedDrivers);
    if (newExpanded.has(driverId)) {
      newExpanded.delete(driverId);
    } else {
      newExpanded.add(driverId);
    }
    setExpandedDrivers(newExpanded);
  };

  const toggleVendorExpansion = (vendorType: string) => {
    const newExpanded = new Set(expandedVendors);
    if (newExpanded.has(vendorType)) {
      newExpanded.delete(vendorType);
    } else {
      newExpanded.add(vendorType);
    }
    setExpandedVendors(newExpanded);
  };

  const handleReassignSegment = (segment: TransportationSegment) => {
    setReassignmentModal({ isOpen: true, segment });
  };

  const handleReassignmentClose = () => {
    setReassignmentModal({ isOpen: false, segment: null });
  };

  const handleReassignmentSubmit = (segmentId: string, newDriverId: string) => {
    if (onSegmentReassign) {
      onSegmentReassign(segmentId, newDriverId);
    }
    handleReassignmentClose();
  };

  const handleStatusUpdate = (segmentId: string, status: TransportationSegmentStatus) => {
    if (onSegmentStatusUpdate) {
      onSegmentStatusUpdate(segmentId, status);
    }
  };

  const handleEditSegment = (segment: TransportationSegment) => {
    setEditModal({ isOpen: true, segment });
  };

  const handleEditModalClose = () => {
    setEditModal({ isOpen: false, segment: null });
  };

  const handleSegmentUpdate = (segmentId: string, updates: Partial<TransportationSegment>) => {
    if (onSegmentUpdate) {
      onSegmentUpdate(segmentId, updates);
    }
    handleEditModalClose();
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, segment: TransportationSegment) => {
    setDraggedSegment(segment);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', segment.id);

    // Add visual feedback to the dragged element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = () => {
    setDraggedSegment(null);
    setDragOverDriver(null);
    setDragOverVendor(null);

    // Reset visual feedback for all dragged elements
    document.querySelectorAll('[draggable="true"]').forEach(element => {
      if (element instanceof HTMLElement) {
        element.style.opacity = '';
      }
    });
  };

  const handleDragOver = (e: React.DragEvent, driverId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDriver(driverId);
  };

  const handleDragLeave = () => {
    setDragOverDriver(null);
    setDragOverVendor(null);
  };

  const handleDrop = (e: React.DragEvent, driverId: string) => {
    e.preventDefault();
    const segmentId = e.dataTransfer.getData('text/plain');

    if (draggedSegment && onSegmentAssign) {
      onSegmentAssign(segmentId, driverId);
    }

    setDraggedSegment(null);
    setDragOverDriver(null);
  };

  const handleVendorDragOver = (e: React.DragEvent, vendorType: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverVendor(vendorType);
  };

  const handleVendorDrop = (e: React.DragEvent, vendorType: string) => {
    e.preventDefault();
    const segmentId = e.dataTransfer.getData('text/plain');

    if (draggedSegment && onSegmentAssignToVendor) {
      onSegmentAssignToVendor(segmentId, vendorType);
    }

    setDraggedSegment(null);
    setDragOverVendor(null);
  };

  const getStatusColor = (status: TransportationSegmentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConflictIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getVendorTypeLabel = (vendorType: string) => {
    const labels: Record<string, string> = {
      vendor: 'Vendor Transport',
      public_transport: 'Public Transport',
      taxi: 'Taxi',
      uber: 'Uber/Careem',
      metro: 'Metro'
    };
    return labels[vendorType] || vendorType;
  };

  const getVendorTypeIcon = (vendorType: string) => {
    switch (vendorType) {
      case 'public_transport':
      case 'metro':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'taxi':
      case 'uber':
        return <User className="w-5 h-5 text-yellow-600" />;
      case 'vendor':
        return <User className="w-5 h-5 text-purple-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSegmentTypeIcon = (segmentType: TransportationSegmentType) => {
    switch (segmentType) {
      case 'pickup':
        return <ArrowRight className="w-4 h-4 text-green-600" />;
      case 'dropoff':
        return <ArrowRight className="w-4 h-4 text-red-600" />;
      case 'stay_with_staff':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'metro_assist':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'custom':
        return <MapPin className="w-4 h-4 text-gray-600" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSegmentTypeColor = (segmentType: TransportationSegmentType) => {
    switch (segmentType) {
      case 'pickup':
        return 'border-l-green-500 bg-green-50';
      case 'dropoff':
        return 'border-l-red-500 bg-red-50';
      case 'stay_with_staff':
        return 'border-l-blue-500 bg-blue-50';
      case 'metro_assist':
        return 'border-l-blue-500 bg-blue-50';
      case 'custom':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'TBD';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Error loading driver segments: {error}</p>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Driver Segments Board</h2>
          <p className="text-gray-600">
            {selectedDate
              ? `Segments for ${formatDate(selectedDate)} ${
                  customTimeRange
                    ? `(${formatDate(customTimeRange.start)} - ${formatDate(customTimeRange.end)})`
                    : `(${timeWindow} window)`
                }`
              : `Driver segments ${
                  customTimeRange
                    ? `(${formatDate(customTimeRange.start)} - ${formatDate(customTimeRange.end)})`
                    : `(${timeWindow} window)`
                }`
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Time Window Selector */}
          {onTimeWindowChange && (
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {(['12h', '24h', '48h', '72h', '7d'] as const).map((window) => (
                <Button
                  key={window}
                  size="sm"
                  variant={timeWindow === window ? 'default' : 'ghost'}
                  onClick={() => {
                    onTimeWindowChange(window);
                    setCustomTimeRange(null); // Clear custom range when selecting preset
                  }}
                  className="px-3 py-1"
                >
                  {window}
                </Button>
              ))}
              <Button
                size="sm"
                variant={customTimeRange ? 'default' : 'ghost'}
                onClick={() => {
                  // Toggle custom time range
                  if (customTimeRange) {
                    setCustomTimeRange(null);
                  } else {
                    // Set default custom range (next 24 hours)
                    const now = new Date();
                    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    setCustomTimeRange({
                      start: now.toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
                      end: tomorrow.toISOString().slice(0, 16)
                    });
                  }
                }}
                className="px-3 py-1"
              >
                Custom
              </Button>
            </div>
          )}

          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <label htmlFor="search-segments" className="sr-only">Search segments</label>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                id="search-segments"
                type="text"
                placeholder="Search segments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search segments by title, driver name, or instructions"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status-filter" className="sr-only">Filter by status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TransportationSegmentStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Filter segments by status"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label htmlFor="type-filter" className="sr-only">Filter by type</label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TransportationSegmentType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Filter segments by type"
              >
                <option value="all">All Types</option>
                <option value="pickup">Pickup</option>
                <option value="dropoff">Drop-off</option>
                <option value="stay_with_staff">Stay with Staff</option>
                <option value="metro_assist">Metro Assist</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Conflicts Only Toggle */}
            <div className="flex items-center space-x-2 sm:col-span-2 lg:col-span-1">
              <input
                id="conflicts-only"
                type="checkbox"
                checked={showConflictsOnly}
                onChange={(e) => setShowConflictsOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-describedby="conflicts-only-description"
              />
              <label htmlFor="conflicts-only" className="text-sm text-gray-700">
                Show conflicts only
              </label>
              <span id="conflicts-only-description" className="sr-only">
                Toggle to show only drivers with scheduling conflicts
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Time Range Controls */}
      {customTimeRange && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="custom-start" className="text-sm font-medium text-gray-700">
                  From:
                </label>
                <input
                  id="custom-start"
                  type="datetime-local"
                  value={customTimeRange.start}
                  onChange={(e) => setCustomTimeRange(prev => prev ? { ...prev, start: e.target.value } : null)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label htmlFor="custom-end" className="text-sm font-medium text-gray-700">
                  To:
                </label>
                <input
                  id="custom-end"
                  type="datetime-local"
                  value={customTimeRange.end}
                  onChange={(e) => setCustomTimeRange(prev => prev ? { ...prev, end: e.target.value } : null)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCustomTimeRange(null)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unassigned Segments Queue */}
      {unassignedSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Unassigned Segments</span>
              <Badge variant="destructive">{unassignedSegments.length}</Badge>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Drag segments to driver lanes or vendor lanes to assign them
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {unassignedSegments.map((segment) => (
                <div
                  key={segment.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, segment)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 border rounded-lg cursor-move hover:shadow-md transition-all duration-200 ${
                    draggedSegment?.id === segment.id
                      ? 'opacity-50 scale-95 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  title="Drag to assign to driver or vendor"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {segment.title}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {formatTime(segment.planned_start)} • {segment.segment_type}
                      </p>
                      {segment.assignment_mode && (
                        <p className="text-xs text-blue-600 mt-1">
                          Mode: {segment.assignment_mode.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Priority: {segment.priority || 0}
                      </Badge>
                      {segment.escalation_state === 'escalated' && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>

                  {/* Quick assignment buttons */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500">Quick assign:</span>
                    {drivers.slice(0, 3).map((driver) => (
                      <Button
                        key={driver.id}
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 py-1 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSegmentAssign) {
                            onSegmentAssign(segment.id, driver.id);
                          }
                        }}
                      >
                        {driver.first_name}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs px-2 py-1 h-auto border-purple-300 text-purple-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSegmentAssignToVendor) {
                          onSegmentAssignToVendor(segment.id, 'vendor');
                        }
                      }}
                    >
                      Vendor
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drag and Drop Indicator */}
      {draggedSegment && (
        <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <ArrowRight className="w-5 h-5" />
              <span className="font-medium">
                Dragging: {draggedSegment.title}
              </span>
              <ArrowRight className="w-5 h-5" />
            </div>
            <p className="text-sm text-blue-500 mt-1">
              Drop on a driver lane or vendor lane to assign
            </p>
          </CardContent>
        </Card>
      )}

      {/* Driver Timelines */}
      {isLoading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading driver segments...</p>
        </div>
      ) : displayTimelines.length === 0 && vendorLanes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Segments Found</h3>
            <p className="text-gray-600">
              {showConflictsOnly
                ? 'No drivers with conflicts found for the selected criteria.'
                : 'No segments found for the selected criteria.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{displayTimelines.length}</div>
                  <div className="text-sm text-blue-600">Active Drivers</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{vendorLanes.length}</div>
                  <div className="text-sm text-purple-600">Vendor Types</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {displayTimelines.reduce((sum, timeline) => sum + timeline.totalSegments, 0)}
                  </div>
                  <div className="text-sm text-green-600">Driver Segments</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {vendorLanes.reduce((sum, lane) => sum + lane.totalSegments, 0)}
                  </div>
                  <div className="text-sm text-yellow-600">Vendor Segments</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Lanes Section */}
          {displayTimelines.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Driver Lanes</h3>
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  {displayTimelines.length} active drivers
                </Badge>
              </div>
              {displayTimelines.map((timeline) => (
            <Card
              key={timeline.driver.id}
              className={`overflow-hidden transition-all duration-200 ${
                dragOverDriver === timeline.driver.id
                  ? 'ring-2 ring-blue-500 bg-blue-50 scale-[1.02]'
                  : draggedSegment ? 'hover:ring-1 hover:ring-blue-300' : ''
              }`}
            >
              <CardHeader
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  dragOverDriver === timeline.driver.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => toggleDriverExpansion(timeline.driver.id)}
                onDragOver={(e) => handleDragOver(e, timeline.driver.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, timeline.driver.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDriverExpansion(timeline.driver.id);
                  }
                }}
                aria-expanded={expandedDrivers.has(timeline.driver.id)}
                aria-label={`Toggle details for driver ${timeline.driver.first_name} ${timeline.driver.last_name}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-gray-600" />
                      <div>
                        <CardTitle className="text-lg">
                          {timeline.driver.first_name} {timeline.driver.last_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {timeline.driver.staff_type} • {timeline.driver.phone}
                        </p>
                      </div>
                    </div>

                    {/* Driver Stats - Responsive Layout */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center sm:space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <span className="font-medium">{timeline.totalSegments}</span>
                        <span className="ml-1">segments</span>
                      </span>
                      <span className="text-green-600 flex items-center">
                        <span className="font-medium">{timeline.completedSegments}</span>
                        <span className="ml-1">completed</span>
                      </span>
                      <span className="text-blue-600 flex items-center">
                        <span className="font-medium">{timeline.inProgressSegments}</span>
                        <span className="ml-1">in progress</span>
                      </span>
                      <span className="text-yellow-600 flex items-center">
                        <span className="font-medium">{timeline.upcomingSegments}</span>
                        <span className="ml-1">upcoming</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    {/* Conflict Indicator */}
                    {timeline.conflicts.length > 0 && (
                      <Badge variant="destructive" className="flex items-center space-x-1 w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{timeline.conflicts.length} conflicts</span>
                      </Badge>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center space-x-1">
                      {onCallDriver && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCallDriver(timeline.driver);
                          }}
                          aria-label={`Call driver ${timeline.driver.first_name} ${timeline.driver.last_name}`}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDriverExpansion(timeline.driver.id);
                        }}
                        aria-label={expandedDrivers.has(timeline.driver.id) ? 'Collapse driver details' : 'Expand driver details'}
                      >
                        {expandedDrivers.has(timeline.driver.id) ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {expandedDrivers.has(timeline.driver.id) && (
                <CardContent className="pt-0">
                  {/* Conflicts Summary */}
                  {timeline.conflicts.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <h4 className="font-medium text-red-900">Conflicts Detected</h4>
                      </div>
                      <div className="space-y-1">
                        {timeline.conflicts.map((conflict, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-red-700">
                            {getConflictIcon(conflict.severity)}
                            <span>{conflict.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Timeline View */}
                  <DriverTimelineView
                    segments={timeline.segments}
                    drivers={drivers}
                    conflicts={timeline.conflicts}
                    onSegmentClick={onSegmentClick}
                    onSegmentStatusUpdate={onSegmentStatusUpdate}
                    onSegmentReassign={onSegmentReassign}
                    onSegmentUpdate={onSegmentUpdate}
                    onEditSegment={handleEditSegment}
                    onReassignSegment={handleReassignSegment}
                    onCallDriver={onCallDriver}
                  />
                </CardContent>
              )}
            </Card>
              ))}
            </div>
          )}

          {/* Vendor Lanes Section */}
          {vendorLanes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Vendor Lanes</h3>
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  {vendorLanes.length} vendor types
                </Badge>
              </div>
              {vendorLanes.map((lane) => (
            <Card
              key={lane.vendorType}
              className={`overflow-hidden transition-all duration-200 ${
                dragOverVendor === lane.vendorType
                  ? 'ring-2 ring-purple-500 bg-purple-50 scale-[1.02]'
                  : draggedSegment ? 'hover:ring-1 hover:ring-purple-300' : ''
              }`}
            >
              <CardHeader
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  dragOverVendor === lane.vendorType ? 'bg-purple-50' : ''
                }`}
                onClick={() => toggleVendorExpansion(lane.vendorType)}
                onDragOver={(e) => handleVendorDragOver(e, lane.vendorType)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleVendorDrop(e, lane.vendorType)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleVendorExpansion(lane.vendorType);
                  }
                }}
                aria-expanded={expandedVendors.has(lane.vendorType)}
                aria-label={`Toggle details for ${getVendorTypeLabel(lane.vendorType)}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      {getVendorTypeIcon(lane.vendorType)}
                      <div>
                        <CardTitle className="text-lg">
                          {getVendorTypeLabel(lane.vendorType)}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          Vendor Transport • {lane.totalSegments} segments
                        </p>
                      </div>
                    </div>

                    {/* Vendor Stats */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center sm:space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <span className="font-medium">{lane.totalSegments}</span>
                        <span className="ml-1">segments</span>
                      </span>
                      <span className="text-green-600 flex items-center">
                        <span className="font-medium">{lane.completedSegments}</span>
                        <span className="ml-1">completed</span>
                      </span>
                      <span className="text-blue-600 flex items-center">
                        <span className="font-medium">{lane.inProgressSegments}</span>
                        <span className="ml-1">in progress</span>
                      </span>
                      <span className="text-yellow-600 flex items-center">
                        <span className="font-medium">{lane.upcomingSegments}</span>
                        <span className="ml-1">upcoming</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVendorExpansion(lane.vendorType);
                      }}
                      aria-label={expandedVendors.has(lane.vendorType) ? 'Collapse vendor details' : 'Expand vendor details'}
                    >
                      {expandedVendors.has(lane.vendorType) ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedVendors.has(lane.vendorType) && (
                <CardContent className="pt-0">
                  {/* Segments Timeline */}
                  <div className="space-y-3">
                    {lane.segments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className={`p-4 border-l-4 rounded-lg hover:shadow-md transition-shadow ${
                          segment.manual_override
                            ? 'border-orange-300 bg-orange-50'
                            : getSegmentTypeColor(segment.segment_type)
                        }`}
                        role="article"
                        aria-label={`Segment: ${segment.title}`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={getStatusColor(segment.status)}>
                                {getTransportationSegmentStatusLabel(segment.status)}
                              </Badge>
                              <Badge variant="outline" className="flex items-center space-x-1">
                                {getSegmentTypeIcon(segment.segment_type)}
                                <span>{getTransportationSegmentTypeLabel(segment.segment_type)}</span>
                              </Badge>
                              <Badge variant="outline" className="border-purple-300 text-purple-700">
                                {getVendorTypeLabel(segment.travel_mode || 'vendor')}
                              </Badge>
                              {segment.manual_override && (
                                <Badge variant="outline" className="border-orange-300 text-orange-700">
                                  Manual Override
                                </Badge>
                              )}
                            </div>

                            <h4 className="font-medium text-gray-900 mb-2 break-words">{segment.title}</h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
                              {/* Timing */}
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                  {formatTime(segment.planned_start)} - {formatTime(segment.planned_end)}
                                </span>
                              </div>

                              {/* Location */}
                              <div className="flex items-start space-x-2">
                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span className="text-xs leading-relaxed">
                                  <span className="block truncate">
                                    {segment.pickup_location?.address || 'Pickup Location TBD'}
                                  </span>
                                  <span className="block truncate">
                                    → {segment.patient_location?.address || 'Patient Location TBD'}
                                  </span>
                                </span>
                              </div>

                              {/* Travel Info */}
                              {(segment.estimated_travel_minutes || segment.estimated_distance_km) && (
                                <div className="flex items-center space-x-2 sm:col-span-2 lg:col-span-1">
                                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-xs">
                                    {segment.estimated_travel_minutes && `${segment.estimated_travel_minutes} min`}
                                    {segment.estimated_distance_km && ` • ${segment.estimated_distance_km} km`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Instructions */}
                            {segment.instructions && (
                              <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                                <strong>Instructions:</strong>
                                <span className="block mt-1 break-words">{segment.instructions}</span>
                              </div>
                            )}
                          </div>

                          {/* Segment Actions */}
                          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-stretch space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2 lg:ml-4">
                            {/* Quick Status Update */}
                            {onSegmentStatusUpdate && segment.status !== 'completed' && segment.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newStatus = segment.status === 'scheduled' ? 'in_progress' : 'completed';
                                  handleStatusUpdate(segment.id, newStatus);
                                }}
                                className="w-full sm:w-auto"
                                aria-label={`${segment.status === 'scheduled' ? 'Start' : 'Complete'} segment: ${segment.title}`}
                              >
                                {segment.status === 'scheduled' ? (
                                  <>
                                    <Play className="w-4 h-4 mr-1" />
                                    Start
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Complete
                                  </>
                                )}
                              </Button>
                            )}

                            {/* Edit Segment */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSegment(segment)}
                              className="w-full sm:w-auto"
                              aria-label={`Edit segment: ${segment.title}`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                              <span className="sm:hidden">Edit Segment</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reassignment Modal */}
      <DriverReassignmentModal
        isOpen={reassignmentModal.isOpen}
        onClose={handleReassignmentClose}
        segment={reassignmentModal.segment}
        availableDrivers={drivers}
        onReassign={handleReassignmentSubmit}
        onStatusUpdate={handleStatusUpdate}
        isLoading={isLoading}
      />

      {/* Edit Modal */}
      <TransportationSegmentEditModal
        isOpen={editModal.isOpen}
        onClose={handleEditModalClose}
        segment={editModal.segment}
        onSave={handleSegmentUpdate}
        isLoading={isLoading}
      />
    </div>
  );
}
