import { cn } from '@/lib/utils/cn';
import { Filter } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';

interface FilterButtonProps {
  onClick: () => void;
  activeCount?: number;
  isActive?: boolean;
  className?: string;
  showText?: boolean;
}

export function FilterButton({
  onClick,
  activeCount = 0,
  isActive = false,
  className,
  showText = true,
}: FilterButtonProps) {
  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      onClick={onClick}
      className={cn('relative', className)}
    >
      <Filter className="h-4 w-4" />
      {showText && <span className="ml-2 hidden sm:inline">Filters</span>}
      {activeCount > 0 && (
        <Badge
          variant={isActive ? 'secondary' : 'default'}
          className="ml-2 h-5 min-w-[20px] px-1.5"
        >
          {activeCount}
        </Badge>
      )}
    </Button>
  );
}
