'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/Tabs';
import { useLeadDetail } from '@/hooks/useLeadDetail';
import {
    type Lead,
    type LeadPriority,
    type LeadStage,
    type UserProfile,
    getLeadDisplayPhone,
    getLeadPriorityColor,
    getLeadStageColor,
    getServiceTypeIcon,
    isStaleLead,
} from '@/types/lead';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    DollarSign,
    Edit,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Save,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LeadDetailTabs } from './LeadDetailTabs';
import { QuickActions } from './QuickActions';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onLeadUpdate: (lead: Lead) => void;
  onLeadDelete: (leadId: string) => void;
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onAssignment: (leadId: string, userId: string) => void;
  onAddNote: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onConvertToPatient: (leadId: string) => void;
  user?: UserProfile | null;
}

export function LeadDetailModal({
  isOpen,
  onClose,
  lead,
  onLeadUpdate,
  onLeadDelete,
  onStageChange,
  onAssignment,
  onAddNote,
  onScheduleFollowUp,
  onConvertToPatient,
  user,
}: LeadDetailModalProps) {

  const [activeTab, setActiveTab] = useState('overview');
  const [editedLead, setEditedLead] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      // Here you would call your API to update the lead
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
      minute: '2-digit',
    });
  };

  const isStale = isStaleLead(lead);
  const activityCount = activities.length;
  const notesCount = notes.length;
  const quotesCount = quotes.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">
                  {lead.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 mb-1">{lead.name}</DialogTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs font-medium ${getLeadStageColor(lead.stage)}`}>
                    {lead.stage.replace('_', ' ')}
                  </Badge>
                  {isStale && (
                    <Badge variant="destructive" className="text-xs font-medium">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Stale
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditedLead(lead);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 gap-2 rounded-lg bg-gray-100/80 p-1">
              <TabsTrigger
                value="overview"
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
              >
                <Activity className="h-4 w-4 text-blue-500" />
                Activity
                {activityCount > 0 && (
                  <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-semibold text-blue-700">
                    {activityCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
              >
                <MessageSquare className="h-4 w-4 text-purple-500" />
                Notes
                {notesCount > 0 && (
                  <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-purple-100 px-1.5 text-xs font-semibold text-purple-700">
                    {notesCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="quotes"
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
              >
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Quotes
                {quotesCount > 0 && (
                  <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-700">
                    {quotesCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                  Quick Actions
                </h3>
                <QuickActions
                  lead={lead}
                  onStageChange={onStageChange}
                  onAssignment={onAssignment}
                  onAddNote={onAddNote}
                  onScheduleFollowUp={onScheduleFollowUp}
                  onConvertToPatient={onConvertToPatient}
                  showLabels={true}
                />
              </div>

              {/* Lead Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  Lead Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <Label htmlFor="name" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={editedLead.name}
                        onChange={(e) => setEditedLead({...editedLead, name: e.target.value})}
                        className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="mt-1 text-sm font-medium text-gray-900">{lead.name}</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <Label htmlFor="phone" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Phone</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={editedLead.phone}
                        onChange={(e) => setEditedLead({...editedLead, phone: e.target.value})}
                        className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
                        <Phone className="h-4 w-4 mr-2 text-blue-500" />
                        {getLeadDisplayPhone(lead)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <Label htmlFor="email" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedLead.email || ''}
                      onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
                      <Mail className="h-4 w-4 mr-2 text-green-500" />
                      {lead.email || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <Label htmlFor="service" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Service Interested In</Label>
                  {isEditing ? (
                    <Input
                      id="service"
                      value={editedLead.service_interested_in || ''}
                      onChange={(e) => setEditedLead({...editedLead, service_interested_in: e.target.value})}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
                      <span className="mr-2 text-lg">{getServiceTypeIcon(lead.service_interested_in)}</span>
                      {lead.service_interested_in || 'Not specified'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <Label htmlFor="stage" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Stage</Label>
                    {isEditing ? (
                      <Select
                        value={editedLead.stage}
                        onValueChange={(value: LeadStage) => setEditedLead({...editedLead, stage: value})}
                      >
                        <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="quoted">Quoted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="not_qualified">Not Qualified</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`mt-1 font-medium ${getLeadStageColor(lead.stage)}`}>
                        {lead.stage.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <Label htmlFor="priority" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Priority</Label>
                    {isEditing ? (
                      <Select
                        value={editedLead.priority}
                        onValueChange={(value: LeadPriority) => setEditedLead({...editedLead, priority: value})}
                      >
                        <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`mt-1 font-medium ${getLeadPriorityColor(lead.priority)}`}>
                        {lead.priority || 'Not set'}
                      </Badge>
                    )}
                  </div>
                </div>

                {lead.address && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <Label htmlFor="address" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Address</Label>
                    {isEditing ? (
                      <Input
                        id="address"
                        value={editedLead.address || ''}
                        onChange={(e) => setEditedLead({...editedLead, address: e.target.value})}
                        className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        {lead.address}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                  Timeline
                </h3>
                <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">Lead Created</span>
                        <p className="text-xs text-gray-500">Initial lead entry</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600">{formatDate(lead.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">Last Updated</span>
                        <p className="text-xs text-gray-500">Most recent change</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600">{formatDate(lead.updated_at || lead.created_at)}</span>
                  </div>
                  {lead.stage !== 'new' && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-purple-600">
                            {lead.stage.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">Stage: {lead.stage.replace('_', ' ')}</span>
                          <p className="text-xs text-gray-500">Current pipeline stage</p>
                        </div>
                      </div>
                      <Badge className={`text-xs font-medium ${getLeadStageColor(lead.stage)}`}>
                        {lead.stage.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
                    <p className="text-gray-500">Loading activities...</p>
                  </div>
                </div>
              ) : detailError ? (
                <div className="py-8 text-center">
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                  <p className="mb-2 text-red-600">Error loading activities</p>
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
                  showTabHeaders={false}
                  activeTab="activities"
                />
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
                    <p className="text-gray-500">Loading notes...</p>
                  </div>
                </div>
              ) : detailError ? (
                <div className="py-8 text-center">
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                  <p className="mb-2 text-red-600">Error loading notes</p>
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
                  showTabHeaders={false}
                  activeTab="notes"
                />
              )}
            </TabsContent>

            <TabsContent value="quotes" className="mt-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
                    <p className="text-gray-500">Loading quotes...</p>
                  </div>
                </div>
              ) : detailError ? (
                <div className="py-8 text-center">
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                  <p className="mb-2 text-red-600">Error loading quotes</p>
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
                  showTabHeaders={false}
                  activeTab="quotes"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
