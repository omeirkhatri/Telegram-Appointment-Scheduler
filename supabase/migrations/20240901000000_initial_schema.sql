-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    emergency_contact VARCHAR(255) NOT NULL,
    medical_history TEXT,
    id_document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff table
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    staff_type VARCHAR(20) NOT NULL CHECK (staff_type IN ('driver', 'medical')),
    google_calendar_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_type VARCHAR(20) NOT NULL CHECK (appointment_type IN ('consultation', 'follow_up', 'emergency', 'routine')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    recurring_rule JSONB,
    google_calendar_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointment_staff junction table
CREATE TABLE appointment_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'primary' CHECK (role IN ('primary', 'assistant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(appointment_id, staff_id)
);

-- Create indexes for performance
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_type ON staff(staff_type);
CREATE INDEX idx_staff_active ON staff(is_active);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_type ON appointments(appointment_type);
CREATE INDEX idx_appointment_staff_appointment_id ON appointment_staff(appointment_id);
CREATE INDEX idx_appointment_staff_staff_id ON appointment_staff(staff_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_staff ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (will be enhanced in future tasks)
CREATE POLICY "Enable read access for all users" ON patients FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON patients FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON staff FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON staff FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON appointments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON appointments FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON appointment_staff FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON appointment_staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON appointment_staff FOR UPDATE USING (true);
