'use client';

import { Button } from '@/components/ui/Button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/Sheet';
import type { Lead, LeadStage, UserProfile } from '@/types/lead';
import {
    Calendar,
    Mail,
    MessageSquare,
    MoreHorizontal,
    Phone,
    SwipeLeft,
    SwipeRight,
    UserCheck
} from 'lucide-react';
import { useState } from 'react';

interface MobileLeadActionsProps {
  lead: Lead;
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onAssignment: (leadId: string, userId: string) => void;
  onAddNote: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onConvertToPatient: (leadId: string) => void;
  user?: UserProfile | null;
}

export function MobileLeadActions({
  lead,
  onStageChange,
  onAssignment,
  onAddNote,
  onScheduleFollowUp,
  onConvertToPatient,
  user,
}: MobileLeadActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSwipeAction = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      // Archive or mark as not qualified
      onStageChange(lead.id, 'not_qualified');
    } else {
      // Schedule follow-up
      onScheduleFollowUp(lead.id);
    }
  };

  return (
    <div className="lg:hidden">
      {/* Swipe Gestures */}
      <div className="relative">
        <div
          className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <div className="flex items-center space-x-2 text-green-600">
            <SwipeRight className="h-5 w-5" />
            <span className="text-sm font-medium">Follow-up</span>
          </div>
          <div className="flex items-center space-x-2 text-red-600">
            <span className="text-sm font-medium">Archive</span>
            <SwipeLeft className="h-5 w-5" />
          </div>
        </div>

        {/* Touch Area for Swipe Detection */}
        <div
          className="absolute inset-0"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            const startX = touch.clientX;
            const startY = touch.clientY;

            const handleTouchMove = (moveEvent: TouchEvent) => {
              const moveTouch = moveEvent.touches[0];
              const deltaX = moveTouch.clientX - startX;
              const deltaY = moveTouch.clientY - startY;

              // Only trigger if horizontal swipe is more significant than vertical
              if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                  handleSwipeAction('right');
                } else {
                  handleSwipeAction('left');
                }
              }
            };

            const handleTouchEnd = () => {
              document.removeEventListener('touchmove', handleTouchMove);
              document.removeEventListener('touchend', handleTouchEnd);
            };

            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
          }}
        />
      </div>

      {/* Bottom Action Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-12 text-base font-medium"
          >
            <MoreHorizontal className="h-5 w-5 mr-2" />
            Quick Actions
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="text-center">Quick Actions for {lead.name}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Primary Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-16 flex flex-col items-center justify-center space-y-1"
                asChild
              >
                <a href={`tel:${lead.phone}`}>
                  <Phone className="h-6 w-6" />
                  <span className="text-sm">Call</span>
                </a>
              </Button>

              {lead.has_whatsapp && lead.whatsapp_number && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center space-y-1"
                  asChild
                >
                  <a href={`https://wa.me/${lead.whatsapp_number}`} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-6 w-6" />
                    <span className="text-sm">WhatsApp</span>
                  </a>
                </Button>
              )}

              {lead.email && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center space-y-1"
                  asChild
                >
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-6 w-6" />
                    <span className="text-sm">Email</span>
                  </a>
                </Button>
              )}

              <Button
                size="lg"
                variant="outline"
                className="h-16 flex flex-col items-center justify-center space-y-1"
                onClick={() => {
                  onScheduleFollowUp(lead.id);
                  setIsOpen(false);
                }}
              >
                <Calendar className="h-6 w-6" />
                <span className="text-sm">Follow-up</span>
              </Button>
            </div>

            {/* Secondary Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 justify-start"
                onClick={() => {
                  onAddNote(lead.id);
                  setIsOpen(false);
                }}
              >
                <MessageSquare className="h-5 w-5 mr-3" />
                Add Note
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 justify-start"
                onClick={() => {
                  onAssignment(lead.id, user?.id || '');
                  setIsOpen(false);
                }}
              >
                <UserCheck className="h-5 w-5 mr-3" />
                Assign to Me
              </Button>

              {lead.stage === 'qualified' && (
                <Button
                  size="lg"
                  className="w-full h-12 justify-start bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    onConvertToPatient(lead.id);
                    setIsOpen(false);
                  }}
                >
                  <UserCheck className="h-5 w-5 mr-3" />
                  Convert to Patient
                </Button>
              )}
            </div>

            {/* Stage Change */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Change Stage</h4>
              <div className="grid grid-cols-2 gap-2">
                {['new', 'contacted', 'quoted', 'qualified'].map((stage) => (
                  <Button
                    key={stage}
                    variant={lead.stage === stage ? "default" : "outline"}
                    size="sm"
                    className="h-10 text-xs"
                    onClick={() => {
                      onStageChange(lead.id, stage as LeadStage);
                      setIsOpen(false);
                    }}
                  >
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
