'use client';

import { EnhancedLeadDetailSidebar } from '@/components/features/leads/EnhancedLeadDetailSidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { Lead, UserProfile } from '@/types/lead';
import { User } from 'lucide-react';
import { useState } from 'react';

// Mock data for demonstration
const mockUser: UserProfile = {
  id: 'user-1',
  full_name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockLead: Lead = {
  id: 'lead-1',
  name: 'Sarah Johnson',
  phone: '+971501234567',
  whatsapp_number: '+971501234567',
  has_whatsapp: true,
  email: 'sarah.johnson@example.com',
  service_interested_in: 'Physiotherapy',
  flat_villa_no: 'Villa 123',
  building_street: 'Al Wasl Road',
  area: 'Jumeirah',
  city: 'Dubai',
  google_maps_link: 'https://maps.google.com/example',
  stage: 'contacted',
  status: 'active',
  source: 'website',
  assigned_to_user_id: 'user-1',
  created_by_user_id: 'user-1',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-20T14:45:00Z',
  last_contacted_at: '2024-01-20T14:45:00Z',
  priority: 'high',
  tags: ['urgent', 'physiotherapy'],
  next_follow_up_at: '2024-01-25T10:00:00Z',
  response_time_minutes: 15,
  conversion_probability: 75,
  automation_metadata: {},
  assigned_to_user: {
    id: 'user-1',
    full_name: 'John Doe',
    email: 'john.doe@example.com',
  },
  created_by_user: {
    id: 'user-1',
    full_name: 'John Doe',
    email: 'john.doe@example.com',
  },
  notes_count: 3,
  quotes_count: 2,
  activities_count: 8,
};

export default function LeadDemoPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLeadUpdate = (updatedLead: Lead) => {
    console.log('Lead updated:', updatedLead);
  };

  const handleLeadDelete = (leadId: string) => {
    console.log('Lead deleted:', leadId);
    setIsSidebarOpen(false);
  };

  const handleStageChange = (leadId: string, newStage: any) => {
    console.log('Stage changed:', leadId, newStage);
  };

  const handleAssignment = (leadId: string, userId: string) => {
    console.log('Assignment changed:', leadId, userId);
  };

  const handleScheduleFollowUp = (leadId: string) => {
    console.log('Schedule follow-up:', leadId);
  };

  const handleConvertToPatient = (leadId: string) => {
    console.log('Convert to patient:', leadId);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Lead Management Features Demo</h1>
          <p className="text-gray-600 mb-6">
            This demo showcases the Activity Timeline, Notes Management, and Quote Management features
            integrated into the lead detail view.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Track all lead interactions with a comprehensive activity timeline including
                stage changes, notes, quotes, and field updates.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Real-time activity tracking</li>
                <li>• Activity type categorization</li>
                <li>• User attribution</li>
                <li>• Metadata support</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Notes Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Comprehensive notes system with pinning, editing, and rich text support
                for better lead communication tracking.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Pin important notes</li>
                <li>• Edit and delete notes</li>
                <li>• User attribution</li>
                <li>• Timestamp tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Quote Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Full quote lifecycle management from creation to acceptance with
                status tracking and automated activity logging.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Create and edit quotes</li>
                <li>• Status tracking (draft, sent, accepted, rejected)</li>
                <li>• Multi-currency support</li>
                <li>• Send tracking</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demo Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{mockLead.name}</h3>
                <p className="text-sm text-gray-600">{mockLead.service_interested_in}</p>
                <p className="text-sm text-gray-500">{mockLead.phone}</p>
              </div>
              <Button onClick={() => setIsSidebarOpen(true)}>
                View Lead Details
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">How to Test the Features:</h3>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Click "View Lead Details" to open the enhanced sidebar</li>
            <li>2. Switch to the "Details" tab to see all three features</li>
            <li>3. Try creating activities, notes, and quotes</li>
            <li>4. Test editing and deleting functionality</li>
            <li>5. Notice how all actions are automatically logged in the activity timeline</li>
          </ol>
        </div>
      </div>

      <EnhancedLeadDetailSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        lead={mockLead}
        onLeadUpdate={handleLeadUpdate}
        onLeadDelete={handleLeadDelete}
        onStageChange={handleStageChange}
        onAssignment={handleAssignment}
        onScheduleFollowUp={handleScheduleFollowUp}
        onConvertToPatient={handleConvertToPatient}
        user={mockUser}
      />
    </div>
  );
}
