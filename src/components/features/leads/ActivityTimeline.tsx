'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { LeadActivity, LeadActivityType } from '@/types/lead';
import {
    Activity,
    ArrowRight,
    CheckCircle,
    Edit,
    MessageSquare,
    Plus,
    Send,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { useState } from 'react';

interface ActivityTimelineProps {
  leadId: string;
  activities: LeadActivity[];
  onActivityCreate: (activity: Omit<LeadActivity, 'id' | 'created_at'>) => Promise<void>;
  onActivityDelete?: (activityId: string) => Promise<void>;
  currentUserId: string;
  currentUserName: string;
  className?: string;
}

const ACTIVITY_TYPES: { value: LeadActivityType; label: string; icon: string }[] = [
  { value: 'created', label: 'Created', icon: 'Plus' },
  { value: 'stage_changed', label: 'Stage Changed', icon: 'ArrowRight' },
  { value: 'assigned', label: 'Assigned', icon: 'UserPlus' },
  { value: 'note_added', label: 'Note Added', icon: 'MessageSquare' },
  { value: 'quote_sent', label: 'Quote Sent', icon: 'Send' },
  { value: 'field_updated', label: 'Field Updated', icon: 'Edit' },
  { value: 'converted', label: 'Converted', icon: 'CheckCircle' },
];

const ACTIVITY_ICONS = {
  created: Plus,
  stage_changed: ArrowRight,
  assigned: UserPlus,
  note_added: MessageSquare,
  quote_sent: Send,
  field_updated: Edit,
  converted: CheckCircle,
};

export function ActivityTimeline({
  leadId,
  activities,
  onActivityCreate,
  onActivityDelete,
  currentUserId,
  currentUserName,
  className = '',
}: ActivityTimelineProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: 'note_added' as LeadActivityType,
    description: '',
    old_value: '',
    new_value: '',
    metadata: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateActivity = async () => {
    if (!newActivity.description.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const activityData = {
        lead_id: leadId,
        user_id: currentUserId,
        user_name: currentUserName,
        activity_type: newActivity.activity_type,
        description: newActivity.description.trim(),
        old_value: newActivity.old_value ? JSON.parse(newActivity.old_value) : null,
        new_value: newActivity.new_value ? JSON.parse(newActivity.new_value) : null,
        metadata: newActivity.metadata ? JSON.parse(newActivity.metadata) : {},
      };

      await onActivityCreate(activityData);

      // Reset form
      setNewActivity({
        activity_type: 'note_added',
        description: '',
        old_value: '',
        new_value: '',
        metadata: '',
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (activityType: LeadActivityType) => {
    const IconComponent = ACTIVITY_ICONS[activityType];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <Activity className="h-4 w-4" />;
  };

  const getActivityColor = (activityType: LeadActivityType) => {
    const colors = {
      created: 'bg-blue-100 text-blue-800',
      stage_changed: 'bg-purple-100 text-purple-800',
      assigned: 'bg-green-100 text-green-800',
      note_added: 'bg-yellow-100 text-yellow-800',
      quote_sent: 'bg-orange-100 text-orange-800',
      field_updated: 'bg-gray-100 text-gray-800',
      converted: 'bg-emerald-100 text-emerald-800',
    };
    return colors[activityType];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Timeline
          <Badge variant="secondary">{activities.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Activity Form */}
        {isCreating && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add New Activity</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activity_type">Activity Type</Label>
                <Select
                  value={newActivity.activity_type}
                  onValueChange={(value: LeadActivityType) =>
                    setNewActivity(prev => ({ ...prev, activity_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {getActivityIcon(type.value)}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what happened..."
                value={newActivity.description}
                onChange={(e) =>
                  setNewActivity(prev => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="old_value">Old Value (JSON)</Label>
                <Input
                  id="old_value"
                  placeholder='{"field": "value"}'
                  value={newActivity.old_value}
                  onChange={(e) =>
                    setNewActivity(prev => ({ ...prev, old_value: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="new_value">New Value (JSON)</Label>
                <Input
                  id="new_value"
                  placeholder='{"field": "value"}'
                  value={newActivity.new_value}
                  onChange={(e) =>
                    setNewActivity(prev => ({ ...prev, new_value: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="metadata">Metadata (JSON)</Label>
              <Input
                id="metadata"
                placeholder='{"key": "value"}'
                value={newActivity.metadata}
                onChange={(e) =>
                  setNewActivity(prev => ({ ...prev, metadata: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreating(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateActivity}
                disabled={isSubmitting || !newActivity.description.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Activity'}
              </Button>
            </div>
          </div>
        )}

        {/* Add Activity Button */}
        {!isCreating && (
          <Button
            variant="outline"
            onClick={() => setIsCreating(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        )}

        {/* Activities List */}
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities yet</p>
              <p className="text-sm">Start by adding an activity above</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getActivityColor(activity.activity_type)}>
                        {ACTIVITY_TYPES.find(t => t.value === activity.activity_type)?.label}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        by {activity.user_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {formatDate(activity.created_at)}
                      </span>
                      {onActivityDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onActivityDelete(activity.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">
                    {activity.description}
                  </p>

                  {(activity.old_value || activity.new_value) && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {activity.old_value && (
                        <div>
                          <span className="font-medium">From:</span>{' '}
                          <code className="bg-gray-100 px-1 rounded">
                            {JSON.stringify(activity.old_value)}
                          </code>
                        </div>
                      )}
                      {activity.new_value && (
                        <div>
                          <span className="font-medium">To:</span>{' '}
                          <code className="bg-gray-100 px-1 rounded">
                            {JSON.stringify(activity.new_value)}
                          </code>
                        </div>
                      )}
                    </div>
                  )}

                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Metadata:</span>{' '}
                      <code className="bg-gray-100 px-1 rounded">
                        {JSON.stringify(activity.metadata)}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
