'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Staff } from '@/types/staff';
import { ArrowDown, Plus, User, Users } from 'lucide-react';
import { useState } from 'react';

interface DropZoneProps {
  driver?: Staff;
  vendorType?: string;
  isDragOver?: boolean;
  canDrop?: boolean;
  onDrop?: (driverId?: string, vendorType?: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  segmentCount?: number;
  className?: string;
}

export function DropZone({
  driver,
  vendorType,
  isDragOver = false,
  canDrop = true,
  onDrop,
  onDragOver,
  onDragLeave,
  segmentCount = 0,
  className = ''
}: DropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';
    onDragOver?.(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (canDrop) {
      onDrop?.(driver?.id, vendorType);
    }
  };

  const handleDragLeave = () => {
    onDragLeave?.();
  };

  const getDropZoneContent = () => {
    if (driver) {
      return {
        title: `${driver.first_name} ${driver.last_name}`,
        subtitle: driver.staff_type,
        icon: <User className="w-6 h-6" />,
        color: 'blue'
      };
    } else if (vendorType) {
      return {
        title: getVendorTypeLabel(vendorType),
        subtitle: 'External Service',
        icon: <Users className="w-6 h-6" />,
        color: 'purple'
      };
    } else {
      return {
        title: 'Unassigned',
        subtitle: 'No driver assigned',
        icon: <Plus className="w-6 h-6" />,
        color: 'gray'
      };
    }
  };

  const getVendorTypeLabel = (type: string) => {
    switch (type) {
      case 'taxi': return 'Taxi Service';
      case 'uber': return 'Uber';
      case 'lyft': return 'Lyft';
      case 'public_transport': return 'Public Transport';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const content = getDropZoneContent();

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative p-6 border-2 border-dashed rounded-lg transition-all duration-200
        ${isDragOver && canDrop
          ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
          : isDragOver && !canDrop
          ? 'border-red-500 bg-red-50'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }
        ${className}
      `}
    >
      {/* Drop Zone Content */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center
          ${isDragOver && canDrop
            ? 'bg-blue-100 text-blue-600'
            : content.color === 'blue'
            ? 'bg-blue-100 text-blue-600'
            : content.color === 'purple'
            ? 'bg-purple-100 text-purple-600'
            : 'bg-gray-100 text-gray-600'
          }
        `}>
          {content.icon}
        </div>

        <div>
          <h3 className="font-medium text-gray-900">{content.title}</h3>
          <p className="text-sm text-gray-600">{content.subtitle}</p>
        </div>

        {/* Segment Count */}
        {segmentCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {segmentCount} segments
          </Badge>
        )}

        {/* Drop Indicator */}
        {isDragOver && canDrop && (
          <div className="flex items-center space-x-2 text-blue-600 font-medium">
            <ArrowDown className="w-4 h-4 animate-bounce" />
            <span>Drop here to assign</span>
          </div>
        )}

        {/* Cannot Drop Indicator */}
        {isDragOver && !canDrop && (
          <div className="flex items-center space-x-2 text-red-600 font-medium">
            <span>Cannot assign here</span>
          </div>
        )}

        {/* Hover Actions */}
        {isHovered && !isDragOver && (
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" className="text-xs">
              View Details
            </Button>
            {driver && (
              <Button size="sm" variant="outline" className="text-xs">
                Call Driver
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Drop Zone Overlay */}
      {isDragOver && canDrop && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-20 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none">
          <div className="absolute top-2 left-2 text-blue-600 text-xs font-medium">
            Drop Zone Active
          </div>
        </div>
      )}
    </div>
  );
}



