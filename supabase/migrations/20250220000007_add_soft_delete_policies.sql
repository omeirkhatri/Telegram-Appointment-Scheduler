-- Add RLS policies for soft delete functionality
-- This migration updates RLS policies to handle soft delete

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON appointments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON appointments;

-- Create new policies that exclude deleted appointments from normal queries
CREATE POLICY "Enable read access for non-deleted appointments" ON appointments
    FOR SELECT USING (status != 'deleted');

CREATE POLICY "Enable insert access for authenticated users" ON appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON appointments
    FOR UPDATE USING (true);

-- Allow soft delete (updating status to deleted)
CREATE POLICY "Enable soft delete access for authenticated users" ON appointments
    FOR UPDATE USING (true) WITH CHECK (true);

