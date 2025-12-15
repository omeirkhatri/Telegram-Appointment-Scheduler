-- Create leads and related tables for lead management system

-- Create lead stage enum
CREATE TYPE lead_stage_enum AS ENUM (
    'new',
    'contacted',
    'quoted',
    'qualified',
    'not_qualified',
    'converted'
);

-- Create lead status enum
CREATE TYPE lead_status_enum AS ENUM (
    'active',
    'inactive',
    'converted'
);

-- Create leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp_number TEXT,
    has_whatsapp BOOLEAN DEFAULT true,
    email TEXT,
    service_interested_in TEXT,
    flat_villa_no TEXT,
    building_street TEXT,
    area TEXT,
    city TEXT,
    google_maps_link TEXT,
    stage lead_stage_enum NOT NULL DEFAULT 'new',
    status lead_status_enum NOT NULL DEFAULT 'active',
    source TEXT DEFAULT 'google_sheets',
    google_sheet_row_id TEXT,
    assigned_to_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    converted_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    created_by_user_id UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE leads
    ADD CONSTRAINT leads_name_check
    CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE leads
    ADD CONSTRAINT leads_phone_check
    CHECK (phone ~ '^[+]?[0-9\s\-\(\)]+$');

ALTER TABLE leads
    ADD CONSTRAINT leads_whatsapp_phone_check
    CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^[+]?[0-9\s\-\(\)]+$');

-- Create indexes for performance
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to_user_id ON leads(assigned_to_user_id);
CREATE INDEX idx_leads_google_sheet_row_id ON leads(google_sheet_row_id);
CREATE INDEX idx_leads_created_by_user_id ON leads(created_by_user_id);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Create updated_at trigger for leads
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leads
CREATE POLICY "Enable read access for all authenticated users" ON leads
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON leads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON leads
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for admin users only" ON leads
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create lead activity type enum
CREATE TYPE lead_activity_type_enum AS ENUM (
    'created',
    'stage_changed',
    'assigned',
    'note_added',
    'quote_sent',
    'field_updated',
    'converted'
);

-- Create lead activities table
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

-- Create indexes for lead activities
CREATE INDEX idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON lead_activities(created_at);
CREATE INDEX idx_lead_activities_user_id ON lead_activities(user_id);

-- Enable Row Level Security for lead activities
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead activities
CREATE POLICY "Enable read access for all authenticated users" ON lead_activities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON lead_activities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create lead notes table
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

-- Add constraints
ALTER TABLE lead_notes
    ADD CONSTRAINT lead_notes_note_check
    CHECK (LENGTH(TRIM(note)) > 0);

-- Create indexes for lead notes
CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX idx_lead_notes_created_at ON lead_notes(created_at);
CREATE INDEX idx_lead_notes_is_pinned ON lead_notes(is_pinned);

-- Create updated_at trigger for lead notes
CREATE TRIGGER update_lead_notes_updated_at
    BEFORE UPDATE ON lead_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for lead notes
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead notes
CREATE POLICY "Enable read access for all authenticated users" ON lead_notes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON lead_notes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for note creator" ON lead_notes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Enable delete for note creator or admin" ON lead_notes
    FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create quote status enum
CREATE TYPE quote_status_enum AS ENUM (
    'draft',
    'sent',
    'accepted',
    'rejected'
);

-- Create lead quotes table
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

-- Add constraints
ALTER TABLE lead_quotes
    ADD CONSTRAINT lead_quotes_service_type_check
    CHECK (LENGTH(TRIM(service_type)) > 0);

ALTER TABLE lead_quotes
    ADD CONSTRAINT lead_quotes_amount_check
    CHECK (amount IS NULL OR amount >= 0);

-- Create indexes for lead quotes
CREATE INDEX idx_lead_quotes_lead_id ON lead_quotes(lead_id);
CREATE INDEX idx_lead_quotes_status ON lead_quotes(status);
CREATE INDEX idx_lead_quotes_created_at ON lead_quotes(created_at);

-- Create updated_at trigger for lead quotes
CREATE TRIGGER update_lead_quotes_updated_at
    BEFORE UPDATE ON lead_quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for lead quotes
ALTER TABLE lead_quotes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead quotes
CREATE POLICY "Enable read access for all authenticated users" ON lead_quotes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON lead_quotes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON lead_quotes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for admin users only" ON lead_quotes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create sync status enum
CREATE TYPE sync_status_enum AS ENUM (
    'running',
    'completed',
    'failed'
);

-- Create google sheets sync log table
CREATE TABLE google_sheets_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_started_at TIMESTAMPTZ NOT NULL,
    sync_completed_at TIMESTAMPTZ,
    rows_processed INTEGER DEFAULT 0,
    new_leads_created INTEGER DEFAULT 0,
    errors JSONB,
    status sync_status_enum DEFAULT 'running',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for sync log
CREATE INDEX idx_google_sheets_sync_log_status ON google_sheets_sync_log(status);
CREATE INDEX idx_google_sheets_sync_log_created_at ON google_sheets_sync_log(created_at);

-- Enable Row Level Security for sync log
ALTER TABLE google_sheets_sync_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync log
CREATE POLICY "Enable read access for admin users only" ON google_sheets_sync_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Enable insert for admin users only" ON google_sheets_sync_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );



