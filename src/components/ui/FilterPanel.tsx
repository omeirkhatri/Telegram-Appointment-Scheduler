import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface FilterPanelProps {
  children: ReactNode;
  onClose?: () => void;
  onClear?: () => void;
  title?: string;
  className?: string;
}

export function FilterPanel({
  children,
  onClose,
  onClear,
  title = 'Filters',
  className,
}: FilterPanelProps) {
  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--foreground]">{title}</h3>
        <div className="flex items-center space-x-2">
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 text-xs"
            >
              Clear All
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

interface FilterSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FilterSection({ label, children, className }: FilterSectionProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-[--foreground]">{label}</label>
      {children}
    </div>
  );
}
