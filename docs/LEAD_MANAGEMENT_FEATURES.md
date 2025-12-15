# Lead Management Features

This document describes the three new lead management features implemented for the MediCare Scheduler application:

1. **Activity Timeline**
2. **Notes Management**
3. **Quote Management**

## Overview

These features provide comprehensive lead tracking and management capabilities, allowing users to maintain detailed records of all lead interactions, communications, and business processes.

## Features

### 1. Activity Timeline

The Activity Timeline provides a chronological view of all lead-related activities and changes.

#### Features:
- **Real-time Activity Tracking**: Automatically logs all lead interactions
- **Activity Types**: Supports multiple activity types including:
  - `created` - Lead creation
  - `stage_changed` - Lead stage transitions
  - `assigned` - Lead assignment changes
  - `note_added` - Note creation
  - `quote_sent` - Quote sending
  - `field_updated` - Field modifications
  - `converted` - Lead conversion to patient
- **User Attribution**: Tracks who performed each activity
- **Metadata Support**: Stores additional context and data
- **Rich Descriptions**: Detailed activity descriptions with old/new value tracking

#### API Endpoints:
- `GET /api/leads/[id]/activities` - Get all activities for a lead
- `POST /api/leads/[id]/activities` - Create a new activity

#### Components:
- `ActivityTimeline.tsx` - Main timeline component
- `LeadDetailTabs.tsx` - Tabbed interface integration

### 2. Notes Management

The Notes Management system allows users to create, edit, and organize notes for leads.

#### Features:
- **Note Creation**: Add detailed notes with rich text support
- **Note Editing**: Modify existing notes with full edit history
- **Note Pinning**: Pin important notes for quick access
- **User Attribution**: Track who created/modified each note
- **Timestamp Tracking**: Automatic creation and modification timestamps
- **Note Deletion**: Remove notes with confirmation
- **Activity Integration**: All note actions are logged in the activity timeline

#### API Endpoints:
- `GET /api/leads/[id]/notes` - Get all notes for a lead
- `POST /api/leads/[id]/notes` - Create a new note
- `PUT /api/leads/[id]/notes/[noteId]` - Update a note
- `DELETE /api/leads/[id]/notes/[noteId]` - Delete a note

#### Components:
- `NotesManagement.tsx` - Main notes management component
- `LeadDetailTabs.tsx` - Tabbed interface integration

### 3. Quote Management

The Quote Management system handles the complete quote lifecycle from creation to acceptance.

#### Features:
- **Quote Creation**: Create quotes with service details and pricing
- **Service Types**: Predefined service types (Doctor on Call, Nurse at Home, etc.)
- **Multi-currency Support**: Support for AED, USD, EUR, GBP
- **Status Tracking**: Track quote status (draft, sent, accepted, rejected)
- **Send Tracking**: Record when quotes are sent and by whom
- **Quote Editing**: Modify quotes before sending
- **Quote Deletion**: Remove quotes with confirmation
- **Activity Integration**: All quote actions are logged in the activity timeline

#### API Endpoints:
- `GET /api/leads/[id]/quotes` - Get all quotes for a lead
- `POST /api/leads/[id]/quotes` - Create a new quote
- `PUT /api/leads/[id]/quotes/[quoteId]` - Update a quote
- `DELETE /api/leads/[id]/quotes/[quoteId]` - Delete a quote

#### Components:
- `QuoteManagement.tsx` - Main quote management component
- `LeadDetailTabs.tsx` - Tabbed interface integration

## Database Schema

The features use the following database tables:

### lead_activities
```sql
CREATE TABLE lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    user_name TEXT NOT NULL,
    activity_type lead_activity_type_enum NOT NULL,
    description TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### lead_notes
```sql
CREATE TABLE lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    user_name TEXT NOT NULL,
    note TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### lead_quotes
```sql
CREATE TABLE lead_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'AED',
    status quote_status_enum DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    sent_by_user_id UUID REFERENCES user_profiles(id),
    sent_by_user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Integration

### Enhanced Lead Detail Sidebar

The `EnhancedLeadDetailSidebar` component integrates all three features into a comprehensive lead management interface:

- **Overview Tab**: Basic lead information and quick actions
- **Details Tab**: Integrated tabs for Activities, Notes, and Quotes
- **Real-time Updates**: All changes are reflected immediately
- **Responsive Design**: Works on desktop and mobile devices

### Custom Hook

The `useLeadDetail` hook provides a clean interface for managing all lead detail data:

```typescript
const {
  activities,
  notes,
  quotes,
  isLoading,
  error,
  createActivity,
  deleteActivity,
  createNote,
  updateNote,
  deleteNote,
  createQuote,
  updateQuote,
  deleteQuote,
} = useLeadDetail(leadId);
```

### Service Layer

The `LeadDetailService` handles all API communications:

- Centralized API calls
- Error handling
- Type safety
- Bulk operations for initial data loading

## Usage

### Basic Integration

```tsx
import { EnhancedLeadDetailSidebar } from '@/components/features/leads/EnhancedLeadDetailSidebar';

function LeadManagement() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <EnhancedLeadDetailSidebar
      isOpen={isSidebarOpen}
      onClose={() => setIsSidebarOpen(false)}
      lead={selectedLead}
      onLeadUpdate={handleLeadUpdate}
      onLeadDelete={handleLeadDelete}
      onStageChange={handleStageChange}
      onAssignment={handleAssignment}
      onScheduleFollowUp={handleScheduleFollowUp}
      onConvertToPatient={handleConvertToPatient}
      user={currentUser}
    />
  );
}
```

### Standalone Components

Each feature can also be used independently:

```tsx
import { ActivityTimeline } from '@/components/features/leads/ActivityTimeline';
import { NotesManagement } from '@/components/features/leads/NotesManagement';
import { QuoteManagement } from '@/components/features/leads/QuoteManagement';

function CustomLeadView() {
  return (
    <div>
      <ActivityTimeline
        leadId={lead.id}
        activities={activities}
        onActivityCreate={createActivity}
        currentUserId={user.id}
        currentUserName={user.name}
      />
      <NotesManagement
        leadId={lead.id}
        notes={notes}
        onNoteCreate={createNote}
        onNoteUpdate={updateNote}
        onNoteDelete={deleteNote}
        currentUserId={user.id}
        currentUserName={user.name}
      />
      <QuoteManagement
        leadId={lead.id}
        quotes={quotes}
        onQuoteCreate={createQuote}
        onQuoteUpdate={updateQuote}
        onQuoteDelete={deleteQuote}
        currentUserId={user.id}
        currentUserName={user.name}
      />
    </div>
  );
}
```

## Demo

A demo page is available at `/leads/demo` that showcases all three features with mock data. This allows users to test the functionality without affecting real data.

## Future Enhancements

Potential future enhancements include:

1. **File Attachments**: Support for file uploads in notes and quotes
2. **Email Integration**: Send quotes via email directly from the system
3. **Template System**: Predefined quote templates for common services
4. **Advanced Filtering**: Filter activities, notes, and quotes by various criteria
5. **Export Functionality**: Export lead data including all activities, notes, and quotes
6. **Real-time Notifications**: WebSocket integration for real-time updates
7. **Advanced Analytics**: Detailed reporting on lead interactions and conversion rates

## Security

All features implement proper security measures:

- **Row Level Security (RLS)**: Database-level access control
- **User Authentication**: All operations require authenticated users
- **Input Validation**: Comprehensive validation of all user inputs
- **Error Handling**: Graceful error handling with user-friendly messages
- **Audit Trail**: Complete audit trail of all operations

## Performance

The features are optimized for performance:

- **Efficient Queries**: Optimized database queries with proper indexing
- **Lazy Loading**: Data is loaded only when needed
- **Caching**: Appropriate caching strategies for frequently accessed data
- **Pagination**: Support for pagination in large datasets
- **Real-time Updates**: Efficient real-time updates without full page refreshes
