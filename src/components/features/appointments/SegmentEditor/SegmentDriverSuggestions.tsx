import { DriverAvailabilityIndicator, evaluateDriverAvailability } from '@/components/ui/DriverAvailabilityIndicator';
import { Badge } from '@/components/ui/Badge';
import type { Staff } from '@/types';
import type {
  TransportationRecommendationEntry,
  TransportationRecommendationMetadata,
  TransportationSegment,
} from '@/types/transportationSegment';
import { useMemo } from 'react';

interface SegmentDriverSuggestionsProps {
  segment: TransportationSegment;
  drivers: Staff[];
  allSegments: TransportationSegment[];
  onSelectDriver: (driverId: string) => void;
  maxSuggestions?: number;
}

const STATUS_PRIORITY = {
  available: 0,
  tight_schedule: 1,
  conflict: 2,
  unavailable: 3,
} as const;

interface RecommendationContext {
  score?: number;
  reasons: string[];
  tags: string[];
  rank: number;
  raw?: TransportationRecommendationEntry;
}

type RecommendationLookup = Map<string, RecommendationContext>;

function normaliseScore(score?: number): number | undefined {
  if (score === undefined || score === null || Number.isNaN(score)) {
    return undefined;
  }

  if (score <= 1 && score >= 0) {
    return Math.round(score * 100);
  }

  return Math.round(score);
}

function extractEntryReasonStrings(entry?: TransportationRecommendationEntry): string[] {
  if (!entry) {
    return [];
  }

  const reasons: string[] = [];

  if (Array.isArray(entry.reasons)) {
    reasons.push(...entry.reasons.filter(Boolean));
  }

  if (Array.isArray(entry.conflicts)) {
    reasons.push(...entry.conflicts.filter(Boolean));
  }

  const factorReasons = entry.factors as unknown;
  if (factorReasons && Array.isArray((factorReasons as { reasons?: string[] }).reasons)) {
    reasons.push(...((factorReasons as { reasons?: string[] }).reasons ?? []).filter(Boolean));
  }

  return Array.from(new Set(reasons));
}

function buildRecommendationLookup(
  metadata: TransportationRecommendationMetadata | undefined,
  recommendedDriverIds: string[],
): RecommendationLookup {
  const lookup: RecommendationLookup = new Map();

  if (!metadata) {
    return lookup;
  }

  const candidateArrays: unknown[] = [
    metadata.recommendations,
    metadata.drivers,
    metadata.suggestions,
  ];

  candidateArrays.forEach((maybeArray) => {
    if (!Array.isArray(maybeArray)) {
      return;
    }

    (maybeArray as TransportationRecommendationEntry[]).forEach((entry, index) => {
      const driverId = entry?.driver_id;
      if (!driverId || lookup.has(driverId)) {
        return;
      }

      const reasons = extractEntryReasonStrings(entry);
      const tags = Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [];
      const rankFromRecommendation =
        typeof entry.rank === 'number' ? entry.rank : recommendedDriverIds.indexOf(driverId);

      lookup.set(driverId, {
        score: entry.score,
        reasons,
        tags,
        rank: rankFromRecommendation >= 0 ? rankFromRecommendation : index,
        raw: entry,
      });
    });
  });

  return lookup;
}

export function SegmentDriverSuggestions({
  segment,
  drivers,
  allSegments,
  onSelectDriver,
  maxSuggestions = 3,
}: SegmentDriverSuggestionsProps) {
  const recommendedOrder = segment.recommended_driver_ids ?? [];

  const recommendationLookup = useMemo(
    () => buildRecommendationLookup(segment.recommendation_metadata, recommendedOrder),
    [segment.recommendation_metadata, recommendedOrder],
  );

  const suggestions = useMemo(() => {
    if (!segment.planned_start || !segment.planned_end) {
      return [] as Array<{
        driver: Staff;
        availability: ReturnType<typeof evaluateDriverAvailability>;
        recommendation?: RecommendationContext;
      }>;
    }

    const candidateDrivers = drivers.filter(driver => driver.status === 'active');

    const scoredDrivers = candidateDrivers
      .filter(driver => driver.id !== segment.driver_id)
      .map(driver => {
        const availability = evaluateDriverAvailability(driver.id, segment, allSegments);
        const recommendation = recommendationLookup.get(driver.id);
        return {
          driver,
          availability,
          recommendation,
          rank: recommendation?.rank ?? recommendedOrder.indexOf(driver.id),
        };
      })
      .filter(entry => entry.availability !== null) as Array<{
        driver: Staff;
        availability: NonNullable<ReturnType<typeof evaluateDriverAvailability>>;
        recommendation?: RecommendationContext;
        rank: number;
      }>;

    return scoredDrivers
      .sort((a, b) => {
        const aRank = a.rank >= 0 ? a.rank : Number.POSITIVE_INFINITY;
        const bRank = b.rank >= 0 ? b.rank : Number.POSITIVE_INFINITY;

        if (aRank !== bRank) {
          return aRank - bRank;
        }

        const aStatus = STATUS_PRIORITY[a.availability.status];
        const bStatus = STATUS_PRIORITY[b.availability.status];
        if (aStatus !== bStatus) {
          return aStatus - bStatus;
        }

        const aScore = a.recommendation?.score ?? -Infinity;
        const bScore = b.recommendation?.score ?? -Infinity;
        if (aScore !== bScore) {
          return bScore - aScore;
        }

        const aName = `${a.driver.first_name} ${a.driver.last_name}`.trim().toLowerCase();
        const bName = `${b.driver.first_name} ${b.driver.last_name}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      })
      .slice(0, maxSuggestions);
  }, [segment, drivers, allSegments, maxSuggestions, recommendationLookup, recommendedOrder]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h6 className="text-sm font-semibold text-gray-800">Suggested drivers</h6>
          <p className="text-xs text-gray-500">Based on scoring model and current schedule checks.</p>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.map(({ driver, availability, recommendation, rank }) => {
          const score = normaliseScore(recommendation?.score);
          const reasons = recommendation?.reasons ?? [];
          const tags = recommendation?.tags ?? [];
          const isTopRecommendation = rank === 0;

          return (
            <div key={driver.id} className="rounded-md border border-white bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">
                      {driver.first_name} {driver.last_name}
                    </div>
                    {isTopRecommendation && (
                      <Badge variant="success" className="uppercase tracking-wide">
                        Top Recommendation
                      </Badge>
                    )}
                    {rank > 0 && rank < Number.POSITIVE_INFINITY && (
                      <Badge variant="secondary" className="uppercase tracking-wide">
                        #{rank + 1}
                      </Badge>
                    )}
                    {score !== undefined && (
                      <Badge variant="outline" className="font-mono">
                        Score {score}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{availability.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectDriver(driver.id)}
                  className="rounded-md border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                >
                  Assign driver
                </button>
              </div>

              {(reasons.length > 0 || tags.length > 0) && (
                <div className="mt-2 space-y-2">
                  {reasons.length > 0 && (
                    <ul className="space-y-1 text-xs text-gray-600">
                      {reasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-gray-400">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DriverAvailabilityIndicator
                className="mt-3"
                driverId={driver.id}
                segment={segment}
                allSegments={allSegments}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
