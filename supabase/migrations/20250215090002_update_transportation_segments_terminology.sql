-- Task 1.0: Update Database Schema and Terminology
-- Migration to rename origin/destination columns and add pickup location type system

-- Create pickup location type enum
CREATE TYPE pickup_location_type_enum AS ENUM (
  'office',
  'previous_appointment', 
  'metro_station',
  'custom'
);

-- Add new columns to transportation_segments table (with existence check)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transportation_segments') THEN
    ALTER TABLE transportation_segments 
    ADD COLUMN IF NOT EXISTS pickup_location_type pickup_location_type_enum,
    ADD COLUMN IF NOT EXISTS pickup_location_reference UUID;
  END IF;
END $$;

-- Rename origin column to pickup_location
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transportation_segments') THEN
    ALTER TABLE transportation_segments 
    RENAME COLUMN origin TO pickup_location;
  END IF;
END $$;

-- Rename destination column to patient_location  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transportation_segments') THEN
    ALTER TABLE transportation_segments 
    RENAME COLUMN destination TO patient_location;
  END IF;
END $$;

-- Add constraints for pickup_location_reference
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transportation_segments') THEN
    ALTER TABLE transportation_segments 
    ADD CONSTRAINT transportation_segments_pickup_location_reference_check 
    CHECK (
      (pickup_location_type = 'previous_appointment' AND pickup_location_reference IS NOT NULL) OR
      (pickup_location_type = 'metro_station' AND pickup_location_reference IS NOT NULL) OR
      (pickup_location_type IN ('office', 'custom') AND pickup_location_reference IS NULL)
    );
  END IF;
END $$;

-- Add indexes for new columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transportation_segments') THEN
    CREATE INDEX IF NOT EXISTS idx_transportation_segments_pickup_location_type 
    ON transportation_segments(pickup_location_type) 
    WHERE pickup_location_type IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_transportation_segments_pickup_location_reference 
    ON transportation_segments(pickup_location_reference) 
    WHERE pickup_location_reference IS NOT NULL;
  END IF;
END $$;

-- Update existing data to set default pickup_location_type as 'custom' for existing records
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transportation_segments') THEN
    UPDATE transportation_segments 
    SET pickup_location_type = 'custom' 
    WHERE pickup_location_type IS NULL;
  END IF;
END $$;

-- Add NOT NULL constraint after setting defaults
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transportation_segments') THEN
    ALTER TABLE transportation_segments 
    ALTER COLUMN pickup_location_type SET NOT NULL;
  END IF;
END $$;

-- Add comment to document the new structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transportation_segments') THEN
    COMMENT ON COLUMN transportation_segments.pickup_location IS 'Location where the driver picks up the patient (renamed from origin)';
    COMMENT ON COLUMN transportation_segments.patient_location IS 'Location where the patient is located (renamed from destination)';
    COMMENT ON COLUMN transportation_segments.pickup_location_type IS 'Type of pickup location: office, previous_appointment, metro_station, or custom';
    COMMENT ON COLUMN transportation_segments.pickup_location_reference IS 'Reference ID for previous appointments or metro stations when applicable';
  END IF;
END $$;

-- Down Migration (rollback)
-- Note: This migration is designed to be reversible
/*
-- Remove new columns
ALTER TABLE transportation_segments DROP COLUMN IF EXISTS pickup_location_type;
ALTER TABLE transportation_segments DROP COLUMN IF EXISTS pickup_location_reference;

-- Rename columns back to original names
ALTER TABLE transportation_segments RENAME COLUMN pickup_location TO origin;
ALTER TABLE transportation_segments RENAME COLUMN patient_location TO destination;

-- Drop indexes
DROP INDEX IF EXISTS idx_transportation_segments_pickup_location_type;
DROP INDEX IF EXISTS idx_transportation_segments_pickup_location_reference;

-- Drop enum type
DROP TYPE IF EXISTS pickup_location_type_enum;
*/
