'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { Lead, LeadStage } from '@/types/lead';
import {
    getDaysSinceLastContact,
    getLeadDisplayPhone,
    getServiceTypeIcon,
    isStaleLead
} from '@/types/lead';
import {
    AlertTriangle,
    Calendar,
    Clock,
    Mail,
    MessageSquare,
    MoreHorizontal,
    Phone,
    UserCheck
} from 'lucide-react';
import { useState } from 'react';

interface QuickActionsProps {
  lead: Lead;
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onAssignment: (leadId: string, userId: string) => void;
  onAddNote: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onConvertToPatient: (leadId: string) => void;
  compact?: boolean;
  showLabels?: boolean;
}

const STAGE_OPTIONS: Array<{ value: LeadStage; label: string; icon: string; color: string }> = [
  { value: 'new', label: 'New', icon: '✨', color: 'text-blue-600' },
  { value: 'contacted', label: 'Contacted', icon: '📞', color: 'text-amber-600' },
  { value: 'quoted', label: 'Quoted', icon: '💰', color: 'text-purple-600' },
  { value: 'qualified', label: 'Qualified', icon: '⭐', color: 'text-green-600' },
  { value: 'not_qualified', label: 'Not Qualified', icon: '❌', color: 'text-red-600' },
  { value: 'converted', label: 'Converted', icon: '🎉', color: 'text-emerald-600' },
];

export function QuickActions({
  lead,
  onStageChange,
  onAssignment,
  onAddNote,
  onScheduleFollowUp,
  onConvertToPatient,
  compact = false,
  showLabels = true,
}: QuickActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string, callback: () => void) => {
    setIsLoading(action);
    try {
      await callback();
    } finally {
      setIsLoading(null);
    }
  };

  const handleWhatsApp = () => {
    const phone = getLeadDisplayPhone(lead);
    const message = `Hi ${lead.name}! 👋

Thank you for your interest in our ${lead.service_interested_in || 'healthcare'} services.

I'm reaching out to discuss your requirements and answer any questions you might have.

When would be a good time to speak?`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCall = () => {
    const phone = getLeadDisplayPhone(lead);
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = () => {
    if (lead.email) {
      const subject = `Regarding your ${lead.service_interested_in || 'healthcare'} inquiry`;
      const body = `Hi ${lead.name},

Thank you for your interest in our ${lead.service_interested_in || 'healthcare'} services.

I wanted to follow up on your inquiry and discuss how we can help you.

Please let me know a convenient time to speak.

Best regards,
[Your Name]`;

      const mailtoUrl = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_self');
    }
  };

  const daysSinceContact = getDaysSinceLastContact(lead);
  const isStale = isStaleLead(lead);

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        {/* WhatsApp */}
        {lead.has_whatsapp && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleWhatsApp}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Send WhatsApp message"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}

        {/* Phone */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCall}
          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          title="Call lead"
        >
          <Phone className="h-4 w-4" />
        </Button>

        {/* Email */}
        {lead.email && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEmail}
            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            title="Send email"
          >
            <Mail className="h-4 w-4" />
          </Button>
        )}

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onAddNote(lead.id)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp(lead.id)}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Follow-up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onConvertToPatient(lead.id)}>
              <UserCheck className="h-4 w-4 mr-2" />
              Convert to Patient
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Lead Status Indicators */}
      <div className="flex items-center space-x-2">
        {isStale && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Stale ({daysSinceContact}d)
          </Badge>
        )}

        {daysSinceContact > 0 && !isStale && (
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {daysSinceContact}d ago
          </Badge>
        )}

        <Badge variant="outline" className="text-xs">
          {getServiceTypeIcon(lead.service_interested_in)} {lead.service_interested_in || 'General'}
        </Badge>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-2">
        {/* WhatsApp */}
        {lead.has_whatsapp && (
          <Button
            onClick={handleWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading === 'whatsapp'}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showLabels && 'WhatsApp'}
          </Button>
        )}

        {/* Phone */}
        <Button
          onClick={handleCall}
          variant="outline"
          className="border-blue-200 text-blue-600 hover:bg-blue-50"
          disabled={isLoading === 'call'}
        >
          <Phone className="h-4 w-4 mr-2" />
          {showLabels && 'Call'}
        </Button>

        {/* Email */}
        {lead.email && (
          <Button
            onClick={handleEmail}
            variant="outline"
            className="border-gray-200 text-gray-600 hover:bg-gray-50"
            disabled={isLoading === 'email'}
          >
            <Mail className="h-4 w-4 mr-2" />
            {showLabels && 'Email'}
          </Button>
        )}

        {/* Convert to Patient */}
        {lead.stage === 'qualified' && (
          <Button
            onClick={() => handleAction('convert', () => onConvertToPatient(lead.id))}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isLoading === 'convert'}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            {showLabels && 'Convert'}
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="flex space-x-2">
        <Button
          onClick={() => onAddNote(lead.id)}
          variant="ghost"
          size="sm"
          className="flex-1"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {showLabels && 'Add Note'}
        </Button>

        <Button
          onClick={() => onScheduleFollowUp(lead.id)}
          variant="ghost"
          size="sm"
          className="flex-1"
        >
          <Calendar className="h-4 w-4 mr-2" />
          {showLabels && 'Follow-up'}
        </Button>
      </div>

      {/* Stage Change Dropdown */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Change Stage
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center">
                <span className="mr-2">
                  {STAGE_OPTIONS.find(s => s.value === lead.stage)?.icon}
                </span>
                {STAGE_OPTIONS.find(s => s.value === lead.stage)?.label}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            {STAGE_OPTIONS.map((stage) => (
              <DropdownMenuItem
                key={stage.value}
                onClick={() => onStageChange(lead.id, stage.value)}
                disabled={stage.value === lead.stage}
                className="flex items-center"
              >
                <span className="mr-2">{stage.icon}</span>
                <span className={stage.color}>{stage.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
