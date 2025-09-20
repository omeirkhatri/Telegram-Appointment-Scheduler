-- Add latitude and longitude fields to patients table
-- This migration adds coordinate fields for direct map rendering without geocoding

-- Add coordinate columns to patients table
ALTER TABLE patients
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add constraints for valid coordinate ranges
ALTER TABLE patients
ADD CONSTRAINT patients_latitude_check
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE patients
ADD CONSTRAINT patients_longitude_check
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Add indexes for coordinate-based queries
CREATE INDEX idx_patients_coordinates ON patients(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment explaining the coordinate fields
COMMENT ON COLUMN patients.latitude IS 'Latitude coordinate for direct map rendering (no geocoding needed)';
COMMENT ON COLUMN patients.longitude IS 'Longitude coordinate for direct map rendering (no geocoding needed)';

-- Update existing patients with coordinates from their google_maps_link if available
-- This is a one-time migration to extract coordinates from existing Google Maps links
UPDATE patients
SET
  latitude = CASE
    WHEN google_maps_link ~ 'q=([0-9.-]+),([0-9.-]+)' THEN
      CAST(REGEXP_REPLACE(google_maps_link, '.*q=([0-9.-]+),([0-9.-]+).*', '\1') AS DECIMAL(10, 8))
    ELSE NULL
  END,
  longitude = CASE
    WHEN google_maps_link ~ 'q=([0-9.-]+),([0-9.-]+)' THEN
      CAST(REGEXP_REPLACE(google_maps_link, '.*q=([0-9.-]+),([0-9.-]+).*', '\2') AS DECIMAL(11, 8))
    ELSE NULL
  END
WHERE google_maps_link IS NOT NULL
  AND google_maps_link ~ 'q=([0-9.-]+),([0-9.-]+)';
