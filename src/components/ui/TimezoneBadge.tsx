'use client';

import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';
import { useState } from 'react';

interface TimezoneBadgeProps {
  className?: string;
  showTooltip?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  showSource?: boolean;
}

export function TimezoneBadge({ 
  className = '', 
  showTooltip = true, 
  variant = 'default',
  showSource = false 
}: TimezoneBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const timezoneArtifacts = buildTimezoneArtifacts();
  const { resolution } = timezoneArtifacts;

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'explicit':
        return 'text-green-600 bg-green-100';
      case 'location':
        return 'text-blue-600 bg-blue-100';
      case 'organization':
        return 'text-purple-600 bg-purple-100';
      case 'fallback':
        return 'text-orange-600 bg-orange-100';
      case 'environment':
        return 'text-gray-600 bg-gray-100';
      case 'legacy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'explicit':
        return 'Explicit';
      case 'location':
        return 'Location';
      case 'organization':
        return 'Organization';
      case 'fallback':
        return 'Fallback';
      case 'environment':
        return 'Environment';
      case 'legacy':
        return 'Legacy';
      default:
        return 'Unknown';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'px-2 py-1 text-xs';
      case 'detailed':
        return 'px-3 py-2 text-sm';
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        data-testid="timezone-badge"
        className={`
          inline-flex items-center gap-1 rounded-md border font-medium
          ${getVariantClasses()}
          ${className}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="text-gray-600">🕐</span>
        <span className="font-mono">{resolution.abbreviation}</span>
        {variant === 'detailed' && (
          <span className="text-gray-500">({resolution.timezone})</span>
        )}
        {showSource && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getSourceColor(resolution.source)}`}>
            {getSourceLabel(resolution.source)}
          </span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div data-testid="timezone-tooltip" className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
            <div className="font-semibold mb-1">Timezone Information</div>
            <div className="space-y-1">
              <div>
                <span className="text-gray-300">Zone:</span> {resolution.timezone}
              </div>
              <div>
                <span className="text-gray-300">Abbreviation:</span> {resolution.abbreviation}
              </div>
              <div>
                <span className="text-gray-300">Offset:</span> {resolution.offsetMinutes > 0 ? '+' : ''}{resolution.offsetMinutes / 60}h
              </div>
              <div>
                <span className="text-gray-300">Source:</span> 
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${getSourceColor(resolution.source)}`}>
                  {getSourceLabel(resolution.source)}
                </span>
              </div>
              {resolution.resolutionPath.length > 1 && (
                <div>
                  <span className="text-gray-300">Resolution Path:</span>
                  <div className="text-xs text-gray-400 mt-1">
                    {resolution.resolutionPath.map((path, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <span className="text-gray-500">{index + 1}.</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${getSourceColor(path)}`}>
                          {getSourceLabel(path)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimezoneBadge;
