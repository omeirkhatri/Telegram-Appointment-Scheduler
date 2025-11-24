'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import type { DriverRecommendation, DriverScore } from '@/services/driverScoringService';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    MapPin,
    Star,
    TrendingUp,
    User,
    Zap
} from 'lucide-react';
import { useMemo } from 'react';

interface DriverScoringDisplayProps {
  recommendations?: DriverRecommendation[];
  maxDisplay?: number;
  showDetailedScores?: boolean;
  onDriverSelect?: (driverId: string) => void;
  selectedDriverId?: string;
  className?: string;
}

export function DriverScoringDisplay({
  recommendations = [],
  maxDisplay = 3,
  showDetailedScores = false,
  onDriverSelect,
  selectedDriverId,
  className = ''
}: DriverScoringDisplayProps) {
  const topRecommendations = useMemo(() => {
    return recommendations
      .sort((a, b) => b.score.overallScore - a.score.overallScore)
      .slice(0, maxDisplay);
  }, [recommendations, maxDisplay]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTagIcon = (tag: string) => {
    if (tag.includes('closest') || tag.includes('nearby')) return <MapPin className="w-3 h-3" />;
    if (tag.includes('available') || tag.includes('free')) return <CheckCircle className="w-3 h-3" />;
    if (tag.includes('conflict') || tag.includes('busy')) return <AlertTriangle className="w-3 h-3" />;
    if (tag.includes('specialist') || tag.includes('expert')) return <Star className="w-3 h-3" />;
    if (tag.includes('fast') || tag.includes('quick')) return <Zap className="w-3 h-3" />;
    if (tag.includes('metro') || tag.includes('public')) return <TrendingUp className="w-3 h-3" />;
    return <User className="w-3 h-3" />;
  };

  const renderScoreBreakdown = (score: DriverScore) => {
    if (!showDetailedScores) return null;

    return (
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Travel:</span>
          <span className={getScoreColor(score.factors.travelFeasibility.score)}>
            {score.factors.travelFeasibility.score}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Availability:</span>
          <span className={getScoreColor(score.factors.availability.score)}>
            {score.factors.availability.score}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Specialization:</span>
          <span className={getScoreColor(score.factors.specialization.score)}>
            {score.factors.specialization.score}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Preferences:</span>
          <span className={getScoreColor(score.factors.preferences.score)}>
            {score.factors.preferences.score}%
          </span>
        </div>
      </div>
    );
  };

  if (topRecommendations.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-4 ${className}`}>
        <User className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">No driver recommendations available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {topRecommendations.map((rec, index) => {
        const isSelected = selectedDriverId === rec.driver.id;
        const score = rec.score;

        return (
          <Card
            key={rec.driver.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onDriverSelect?.(rec.driver.id)}
            data-testid={`driver-card-${rec.driver.id}`}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {rec.driver.first_name} {rec.driver.last_name}
                    </h4>
                    {index === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Top Pick
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getScoreColor(score.overallScore)}`}
                    >
                      {score.overallScore}%
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getConfidenceColor(rec.recommendation.confidence)}`}
                    >
                      {rec.recommendation.confidence} confidence
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-600 mb-2">
                    {rec.recommendation.primaryReason}
                  </p>

                  {score.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {score.tags.slice(0, 3).map((tag, tagIndex) => (
                        <Badge
                          key={tagIndex}
                          variant="secondary"
                          className="text-xs flex items-center space-x-1 px-2 py-0.5"
                          title={tag}
                        >
                          {getTagIcon(tag)}
                          <span className="truncate max-w-20">{tag}</span>
                        </Badge>
                      ))}
                      {score.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{score.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {renderScoreBreakdown(score)}
                </div>

                <div className="flex flex-col items-end space-y-1 ml-2">
                  {score.factors.travelFeasibility.estimatedMinutes && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{score.factors.travelFeasibility.estimatedMinutes}m</span>
                    </div>
                  )}
                  {score.factors.travelFeasibility.distanceKm && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>{score.factors.travelFeasibility.distanceKm.toFixed(1)}km</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
