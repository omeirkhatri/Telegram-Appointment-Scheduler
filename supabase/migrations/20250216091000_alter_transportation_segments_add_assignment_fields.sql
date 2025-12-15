-- Task 2.1: add assignment mode, priority, and recommendation fields to transportation_segments

-- Create assignment mode enum supporting assign-now and assign-later workflows
CREATE TYPE transportation_segment_assignment_mode_enum AS ENUM (
  'assign_now',
  'assign_later'
);

-- Add new columns to transportation_segments
ALTER TABLE transportation_segments
  ADD COLUMN assignment_mode transportation_segment_assignment_mode_enum NOT NULL DEFAULT 'assign_now',
  ADD COLUMN priority INTEGER,
  ADD COLUMN recommended_driver_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN recommendation_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD CONSTRAINT transportation_segments_priority_check CHECK (
    priority IS NULL OR priority >= 0
  );
