'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
    getDaysSinceLastContact,
    getLeadDisplayPhone,
    getLeadPriorityColor,
    getLeadStageColor,
    getServiceTypeIcon,
    isStaleLead,
} from '@/types/lead';
import {
    Activity,
    AlertTriangle,
    Calendar,
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
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LeadDetailTabs } from './LeadDetailTabs';
import { QuickActions } from './QuickActions';

interface LeadDetailSidebarProps {
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

export function LeadDetailSidebar({
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
}: LeadDetailSidebarProps) {
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

  const daysSinceContact = getDaysSinceLastContact(lead);
  const isStale = isStaleLead(lead);
  const activityCount = activities.length;
  const notesCount = notes.length;
  const quotesCount = quotes.length;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-full max-w-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:relative lg:shadow-none lg:border-l lg:border-gray-200
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">
                {lead.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{lead.name}</h2>
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
                  variant="ghost"
                  onClick={onClose}
                  className="lg:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-gray-50/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="mx-6 mt-6 grid w-auto grid-cols-4 gap-2 rounded-lg bg-white/80 p-1 shadow-sm">
              <TabsTrigger
                value="overview"
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
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
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
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
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
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

            <TabsContent value="overview" className="p-6 space-y-6">
              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mr-2" />
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
                  <span className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mr-2" />
                  Lead Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                    <Label htmlFor="name" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={editedLead.name}
                        onChange={(e) => setEditedLead({...editedLead, name: e.target.value})}
                        className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="mt-1 text-sm font-medium text-gray-900">{lead.name}</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                    <Label htmlFor="phone" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Phone</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={editedLead.phone}
                        onChange={(e) => setEditedLead({...editedLead, phone: e.target.value})}
                        className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
                        <Phone className="h-4 w-4 mr-2 text-blue-500" />
                        {getLeadDisplayPhone(lead)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                  <Label htmlFor="email" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedLead.email || ''}
                      onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                      className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
                      <Mail className="h-4 w-4 mr-2 text-green-500" />
                      {lead.email || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                  <Label htmlFor="service" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Service Interested In</Label>
                  {isEditing ? (
                    <Input
                      id="service"
                      value={editedLead.service_interested_in || ''}
                      onChange={(e) => setEditedLead({...editedLead, service_interested_in: e.target.value})}
                      className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
                      <span className="mr-2 text-lg">{getServiceTypeIcon(lead.service_interested_in)}</span>
                      {lead.service_interested_in || 'Not specified'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                    <Label htmlFor="stage" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Stage</Label>
                    {isEditing ? (
                      <Select
                        value={editedLead.stage}
                        onValueChange={(value: LeadStage) => setEditedLead({...editedLead, stage: value})}
                      >
                        <SelectTrigger className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
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

                  <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                    <Label htmlFor="priority" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Priority</Label>
                    {isEditing ? (
                      <Select
                        value={editedLead.priority}
                        onValueChange={(value: LeadPriority) => setEditedLead({...editedLead, priority: value})}
                      >
                        <SelectTrigger className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
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
                      <Badge variant="outline" className={`mt-1 ${getLeadPriorityColor(lead.priority)}`}>
                        {lead.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {(lead.flat_villa_no || lead.building_street || lead.area || lead.city) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Address</h3>
                  <div className="flex items-start text-sm text-gray-900">
                    <MapPin className="h-4 w-4 mr-1 text-gray-400 mt-0.5" />
                    <div>
                      {lead.flat_villa_no && <div>{lead.flat_villa_no}</div>}
                      {lead.building_street && <div>{lead.building_street}</div>}
                      {lead.area && <div>{lead.area}</div>}
                      {lead.city && <div>{lead.city}</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2 text-gray-900">{formatDate(lead.created_at)}</span>
                  </div>

                  {lead.last_contacted_at && (
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Last Contact:</span>
                      <span className="ml-2 text-gray-900">{formatDate(lead.last_contacted_at)}</span>
                      <span className="ml-2 text-xs text-gray-500">({daysSinceContact} days ago)</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Updated:</span>
                    <span className="ml-2 text-gray-900">{formatDate(lead.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Assignment */}
              {lead.assigned_to_user && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Assignment</h3>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {lead.assigned_to_user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {lead.assigned_to_user.full_name}
                      </p>
                      <p className="text-xs text-gray-500">{lead.assigned_to_user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversion Probability */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Conversion Score</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${lead.conversion_probability}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {lead.conversion_probability}%
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
                    <p className="text-gray-500">Loading activities...</p>
                  </div>
                </div>
              ) : detailError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-red-600 mb-2">Error loading activities</p>
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

            <TabsContent value="notes" className="p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
                    <p className="text-gray-500">Loading notes...</p>
                  </div>
                </div>
              ) : detailError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-red-600 mb-2">Error loading notes</p>
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

            <TabsContent value="quotes" className="p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
                    <p className="text-gray-500">Loading quotes...</p>
                  </div>
                </div>
              ) : detailError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-red-600 mb-2">Error loading quotes</p>
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

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Lead
            </Button>

            {lead.stage === 'qualified' && (
              <Button
                onClick={() => onConvertToPatient(lead.id)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Convert to Patient
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
