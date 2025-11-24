'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/Tabs';
import { useLeadDetail } from '@/hooks/useLeadDetail';
import type { Lead, LeadStage, UserProfile } from '@/types/lead';
import {
    getDaysSinceLastContact,
    getLeadDisplayPhone,
    getLeadFullAddress,
    getLeadPriorityColor,
    getLeadStageColor,
    getServiceTypeIcon,
    isStaleLead
} from '@/types/lead';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    Edit,
    FileText,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Trash2,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LeadDetailTabs } from './LeadDetailTabs';

interface EnhancedLeadDetailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onLeadUpdate: (lead: Lead) => void;
  onLeadDelete: (leadId: string) => void;
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onAssignment: (leadId: string, userId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onConvertToPatient: (leadId: string) => void;
  user?: UserProfile | null;
}

export function EnhancedLeadDetailSidebar({
  isOpen,
  onClose,
  lead,
  onLeadUpdate,
  onLeadDelete,
  onStageChange,
  onAssignment,
  onScheduleFollowUp,
  onConvertToPatient,
  user,
}: EnhancedLeadDetailSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editedLead, setEditedLead] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Use the lead detail hook for managing activities, notes, and quotes
  const {
    activities,
    notes,
    quotes,
    isLoading: detailLoading,
    error: detailError,
    createActivity,
    deleteActivity,
    createNote,
    updateNote,
    deleteNote,
    createQuote,
    updateQuote,
    deleteQuote,
  } = useLeadDetail(lead?.id || '', user?.id || 'unknown', user?.full_name || 'Unknown User');

  useEffect(() => {
    if (lead) {
      setEditedLead(lead);
      setIsEditing(false);
      setActiveTab('overview');
    }
  }, [lead]);

  if (!lead || !editedLead) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onLeadUpdate(editedLead);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save lead:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      onLeadDelete(lead.id);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const daysSinceContact = getDaysSinceLastContact(lead);
  const isStale = isStaleLead(lead);
  const fullAddress = getLeadFullAddress(lead);
  const displayPhone = getLeadDisplayPhone(lead);
  const serviceIcon = getServiceTypeIcon(lead.service_interested_in);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Lead Details
            {isStale && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">
                Details
                <Badge variant="secondary" className="ml-2">
                  {activities.length + notes.length + quotes.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Lead Status and Priority */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {serviceIcon} {lead.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getLeadStageColor(lead.stage)}>
                        {lead.stage.replace('_', ' ')}
                      </Badge>
                      <Badge className={getLeadPriorityColor(lead.priority)}>
                        {lead.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Information */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{displayPhone}</span>
                      {lead.has_whatsapp && (
                        <Badge variant="outline" className="text-xs">
                          WhatsApp
                        </Badge>
                      )}
                    </div>

                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{lead.email}</span>
                      </div>
                    )}

                    {fullAddress && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{fullAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Service Information */}
                  {lead.service_interested_in && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span>Interested in: {lead.service_interested_in}</span>
                    </div>
                  )}

                  {/* Timeline Information */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Created: {formatDate(lead.created_at)}</span>
                    </div>

                    {lead.last_contacted_at && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>Last contact: {formatDate(lead.last_contacted_at)}</span>
                        <Badge variant={isStale ? "destructive" : "secondary"}>
                          {daysSinceContact} days ago
                        </Badge>
                      </div>
                    )}

                    {lead.next_follow_up_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Next follow-up: {formatDate(lead.next_follow_up_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Assignment Information */}
                  {lead.assigned_to_user && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>Assigned to: {lead.assigned_to_user.full_name}</span>
                    </div>
                  )}

                  {/* Conversion Probability */}
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    <span>Conversion probability: {lead.conversion_probability}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStageChange(lead.id, 'contacted')}
                      disabled={lead.stage === 'contacted'}
                    >
                      Mark Contacted
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onScheduleFollowUp(lead.id)}
                    >
                      Schedule Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onConvertToPatient(lead.id)}
                      disabled={lead.stage === 'converted'}
                    >
                      Convert to Patient
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('details')}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Edit/Delete Actions */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel Edit' : 'Edit Lead'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading lead details...</p>
                  </div>
                </div>
              ) : detailError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-red-600 mb-2">Error loading details</p>
                  <p className="text-sm text-gray-500">{detailError}</p>
                </div>
              ) : (
                <LeadDetailTabs
                  lead={lead}
                  activities={activities}
                  notes={notes}
                  quotes={quotes}
                  onActivityCreate={createActivity}
                  onActivityDelete={deleteActivity}
                  onNoteCreate={createNote}
                  onNoteUpdate={updateNote}
                  onNoteDelete={deleteNote}
                  onQuoteCreate={createQuote}
                  onQuoteUpdate={updateQuote}
                  onQuoteDelete={deleteQuote}
                  currentUserId={user?.id || 'unknown'}
                  currentUserName={user?.full_name || 'Unknown User'}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
