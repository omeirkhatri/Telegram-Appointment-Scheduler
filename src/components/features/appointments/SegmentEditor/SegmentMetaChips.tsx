import { Badge } from '@/components/ui/Badge';
import type { TransportationSegmentStatus } from '@/types/transportationSegment';
import { getTransportationSegmentStatusLabel } from '@/types/transportationSegment';
import type { TravelWarning } from '@/utils/transportationSegments';
import { AlertTriangle, CheckCircle2, Clock3, FileText, PlayCircle, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface SegmentMetaChipsProps {
  status: TransportationSegmentStatus;
  manualOverride?: boolean | null;
  warning?: TravelWarning | null;
  className?: string;
}

interface StatusConfig {
  icon: ReactNode;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const STATUS_CONFIG: Record<TransportationSegmentStatus, StatusConfig> = {
  draft: {
    icon: <FileText className="h-3.5 w-3.5" aria-hidden="true" />,
    variant: 'secondary',
  },
  scheduled: {
    icon: <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />,
    variant: 'default',
  },
  in_progress: {
    icon: <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />,
    variant: 'warning',
  },
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
    variant: 'success',
  },
  cancelled: {
    icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
    variant: 'destructive',
  },
};

export function SegmentMetaChips({ status, manualOverride, warning, className = '' }: SegmentMetaChipsProps) {
  const statusConfig = STATUS_CONFIG[status];
  const warningTitle = warning?.messages?.join(' ') ?? undefined;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Badge variant={statusConfig.variant} className="inline-flex items-center gap-1">
        {statusConfig.icon}
        <span>{getTransportationSegmentStatusLabel(status)}</span>
      </Badge>

      {warning && (
        <Badge
          variant="warning"
          className="inline-flex items-center gap-1"
          title={warningTitle}
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Travel warning</span>
        </Badge>
      )}

      {manualOverride && (
        <Badge variant="warning" className="inline-flex items-center gap-1 border border-orange-200">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Manual override</span>
        </Badge>
      )}
    </div>
  );
}
