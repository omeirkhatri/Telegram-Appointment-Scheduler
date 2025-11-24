-- Service Contracts Table
CREATE TYPE contract_type AS ENUM ('monthly', 'session_pack');
CREATE TYPE contract_status AS ENUM ('draft', 'active', 'completed', 'terminated');
-- Note: Using text for service_type to allow flexibility and matching existing types if needed, or we can define an enum.
-- The PRD mentions 'caregiver', 'physio', etc. which matches some appointment types.
-- Let's use text to avoid tight coupling with appointment_type enum if it changes.
CREATE TYPE finance_service_type AS ENUM ('caregiver', 'physiotherapy', 'nursing', 'doctor', 'other');

CREATE TABLE service_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    contract_type contract_type NOT NULL,
    service_type finance_service_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    total_sessions INTEGER,
    total_amount DECIMAL(10, 2) NOT NULL,
    status contract_status NOT NULL DEFAULT 'draft',
    staff_payment_rate DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Payments Table
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'cheque', 'other');

CREATE TABLE contract_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES service_contracts(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    method payment_method NOT NULL,
    reference TEXT,
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff Payouts Table
CREATE TABLE staff_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    payout_date DATE NOT NULL,
    notes TEXT,
    related_contract_id UUID REFERENCES service_contracts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add service_contract_id to appointments
ALTER TABLE appointments
ADD COLUMN service_contract_id UUID REFERENCES service_contracts(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_service_contracts_patient ON service_contracts(patient_id);
CREATE INDEX idx_service_contracts_status ON service_contracts(status);
CREATE INDEX idx_contract_payments_contract ON contract_payments(contract_id);
CREATE INDEX idx_staff_payouts_staff ON staff_payouts(staff_id);
CREATE INDEX idx_appointments_contract ON appointments(service_contract_id);

-- RLS Policies
ALTER TABLE service_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON service_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for authenticated users" ON service_contracts FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON contract_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for authenticated users" ON contract_payments FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON staff_payouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for authenticated users" ON staff_payouts FOR ALL TO authenticated USING (true);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_contracts_updated_at
    BEFORE UPDATE ON service_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
