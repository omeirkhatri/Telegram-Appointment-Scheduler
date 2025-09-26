import type { TransportationSegment } from '@/types/transportationSegment';

export type TravelWarningReason = 'insufficient_buffer' | 'insufficient_gap';

export interface TravelWarning {
  reasons: TravelWarningReason[];
  messages: string[];
  availableGapMinutes?: number | null;
  requiredMinutes?: number | null;
}

export const RECOMMENDED_SEGMENT_BUFFER_MINUTES = 20;

function minutesBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) {
    return null;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return Math.round((startDate.getTime() - endDate.getTime()) / 60000);
}

function pushWarning(
  warnings: Record<string, TravelWarning>,
  segmentId: string,
  reason: TravelWarningReason,
  message: string,
  extras?: { availableGapMinutes?: number | null; requiredMinutes?: number | null },
) {
  if (!warnings[segmentId]) {
    warnings[segmentId] = {
      reasons: [reason],
      messages: [message],
      availableGapMinutes: extras?.availableGapMinutes ?? null,
      requiredMinutes: extras?.requiredMinutes ?? null,
    };
    return;
  }

  const existing = warnings[segmentId];
  if (!existing.reasons.includes(reason)) {
    existing.reasons = [...existing.reasons, reason];
  }
  existing.messages = [...existing.messages, message];
  if (extras?.availableGapMinutes !== undefined) {
    existing.availableGapMinutes = extras.availableGapMinutes;
  }
  if (extras?.requiredMinutes !== undefined) {
    existing.requiredMinutes = extras.requiredMinutes;
  }
}

export function calculateSegmentWarnings(segments: TransportationSegment[]): Record<string, TravelWarning> {
  const warnings: Record<string, TravelWarning> = {};

  if (!segments || segments.length === 0) {
    return warnings;
  }

  const sortedSegments = [...segments].sort((a, b) => {
    const timeA = a.planned_start ?? a.created_at ?? '';
    const timeB = b.planned_start ?? b.created_at ?? '';
    const dateA = new Date(timeA).getTime();
    const dateB = new Date(timeB).getTime();
    return dateA - dateB;
  });

  sortedSegments.forEach((segment, index) => {
    const bufferMinutes = segment.buffer_minutes ?? 0;
    if (bufferMinutes < RECOMMENDED_SEGMENT_BUFFER_MINUTES) {
      pushWarning(
        warnings,
        segment.id,
        'insufficient_buffer',
        `Buffer (${bufferMinutes} min) is below the recommended ${RECOMMENDED_SEGMENT_BUFFER_MINUTES} minutes.`,
      );
    }

    const estimatedTravelMinutes = segment.estimated_travel_minutes ?? null;
    if (estimatedTravelMinutes != null && bufferMinutes < estimatedTravelMinutes / 2) {
      pushWarning(
        warnings,
        segment.id,
        'insufficient_buffer',
        `Buffer (${bufferMinutes} min) is less than half of the estimated travel (${estimatedTravelMinutes} min).`,
      );
    }

    if (index === 0) {
      return;
    }

    const previous = sortedSegments[index - 1];
    const gapMinutes = minutesBetween(segment.planned_start, previous.planned_end);

    if (gapMinutes == null) {
      return;
    }

    const requiredMinutes = (estimatedTravelMinutes ?? 0) + (bufferMinutes || RECOMMENDED_SEGMENT_BUFFER_MINUTES);

    if (estimatedTravelMinutes != null && gapMinutes < estimatedTravelMinutes) {
      pushWarning(
        warnings,
        segment.id,
        'insufficient_gap',
        `Only ${gapMinutes} minutes between segments; estimated travel requires ${estimatedTravelMinutes} minutes.`,
        { availableGapMinutes: gapMinutes, requiredMinutes: estimatedTravelMinutes },
      );
      return;
    }

    if (gapMinutes < requiredMinutes) {
      pushWarning(
        warnings,
        segment.id,
        'insufficient_gap',
        `Only ${gapMinutes} minutes between segments; recommended minimum is ${requiredMinutes} minutes (travel + buffer).`,
        { availableGapMinutes: gapMinutes, requiredMinutes },
      );
    }
  });

  return warnings;
}
