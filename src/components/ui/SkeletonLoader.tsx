
interface SkeletonLoaderProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export function SkeletonLoader({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = true,
  animate = true,
}: SkeletonLoaderProps) {
  const baseClasses = 'bg-gray-200';
  const roundedClasses = rounded ? 'rounded' : '';
  const animateClasses = animate ? 'animate-pulse' : '';

  return (
    <div
      className={`${baseClasses} ${roundedClasses} ${animateClasses} ${className}`}
      style={{ width, height }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
  rowHeight?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
  rowHeight = '3rem',
}: SkeletonTableProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonLoader
            key={`header-${index}`}
            height="2rem"
            width={`${100 / columns}%`}
            className="flex-1"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4" style={{ height: rowHeight }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader
              key={`cell-${rowIndex}-${colIndex}`}
              height="1.5rem"
              width={`${100 / columns}%`}
              className="flex-1 self-center"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  showAvatar?: boolean;
  lines?: number;
}

export function SkeletonCard({
  className = '',
  showAvatar = false,
  lines = 3,
}: SkeletonCardProps) {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-start space-x-3">
        {showAvatar && (
          <SkeletonLoader
            width="2.5rem"
            height="2.5rem"
            className="rounded-full flex-shrink-0"
          />
        )}
        <div className="flex-1 space-y-2">
          <SkeletonLoader height="1.25rem" width="60%" />
          {Array.from({ length: lines - 1 }).map((_, index) => (
            <SkeletonLoader
              key={index}
              height="1rem"
              width={index === lines - 2 ? '40%' : '100%'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
}

export function SkeletonList({
  items = 5,
  className = '',
  showAvatar = false,
}: SkeletonListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard
          key={index}
          showAvatar={showAvatar}
          lines={2}
        />
      ))}
    </div>
  );
}

interface SkeletonFormProps {
  fields?: number;
  className?: string;
  showSubmitButton?: boolean;
}

export function SkeletonForm({
  fields = 4,
  className = '',
  showSubmitButton = true,
}: SkeletonFormProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <SkeletonLoader height="1rem" width="25%" />
          <SkeletonLoader height="2.5rem" width="100%" />
        </div>
      ))}
      {showSubmitButton && (
        <div className="pt-4">
          <SkeletonLoader height="2.5rem" width="8rem" />
        </div>
      )}
    </div>
  );
}
