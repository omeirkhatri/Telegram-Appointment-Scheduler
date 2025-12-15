import { cn } from '@/lib/utils/cn';
import { Calendar, Grid3X3, List } from 'lucide-react';
import { Button } from './Button';

export type ViewMode = 'calendar' | 'table' | 'grid';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  modes?: ViewMode[];
  className?: string;
  showLabels?: boolean;
}

const viewConfig = {
  calendar: { icon: Calendar, label: 'Calendar' },
  table: { icon: List, label: 'Table' },
  grid: { icon: Grid3X3, label: 'Grid' },
};

export function ViewToggle({
  value,
  onChange,
  modes = ['calendar', 'table'],
  className,
  showLabels = true,
}: ViewToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-[--border] bg-[--muted] p-1',
        className
      )}
    >
      {modes.map((mode) => {
        const config = viewConfig[mode];
        const Icon = config.icon;
        const isActive = value === mode;

        return (
          <Button
            key={mode}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(mode)}
            className={cn(
              'h-8',
              !isActive && 'hover:bg-[--accent]'
            )}
          >
            <Icon className="h-4 w-4" />
            {showLabels && (
              <span className="ml-2 hidden sm:inline">{config.label}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
