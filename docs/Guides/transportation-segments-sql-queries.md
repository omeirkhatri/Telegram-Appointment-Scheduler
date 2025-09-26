# Transportation Segments SQL Queries and BI Models

This document provides comprehensive SQL queries and BI models for transportation segment analytics and reporting. These queries are designed for operations teams to extract insights from the transportation segments feature.

## Table of Contents

1. [Core Tables and Relationships](#core-tables-and-relationships)
2. [Basic Analytics Queries](#basic-analytics-queries)
3. [Driver Performance Queries](#driver-performance-queries)
4. [Conflict Analysis Queries](#conflict-analysis-queries)
5. [Override and Audit Queries](#override-and-audit-queries)
6. [Trend Analysis Queries](#trend-analysis-queries)
7. [BI Dashboard Queries](#bi-dashboard-queries)
8. [Data Export Queries](#data-export-queries)

## Core Tables and Relationships

### Primary Tables

```sql
-- Transportation segments table
transportation_segments (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  segment_type transportation_segment_type_enum,
  title TEXT,
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  driver_id UUID REFERENCES staff(id),
  travel_mode TEXT,
  origin JSONB,
  destination JSONB,
  estimated_travel_minutes INTEGER,
  estimated_distance_km NUMERIC(6,2),
  buffer_minutes INTEGER,
  instructions TEXT,
  requires_follow_up BOOLEAN DEFAULT FALSE,
  status transportation_segment_status_enum DEFAULT 'draft',
  manual_override BOOLEAN DEFAULT FALSE,
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Override audit table
transportation_segment_override_audit (
  id UUID PRIMARY KEY,
  segment_id UUID REFERENCES transportation_segments(id),
  appointment_id UUID REFERENCES appointments(id),
  operation_type TEXT,
  override_reason TEXT,
  user_id UUID,
  user_name TEXT,
  original_driver_id UUID,
  new_driver_id UUID,
  original_planned_start TIMESTAMPTZ,
  new_planned_start TIMESTAMPTZ,
  original_planned_end TIMESTAMPTZ,
  new_planned_end TIMESTAMPTZ,
  conflict_details JSONB,
  override_justification TEXT,
  requires_follow_up BOOLEAN DEFAULT FALSE,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Relationships

- `transportation_segments.appointment_id` → `appointments.id`
- `transportation_segments.driver_id` → `staff.id` (where staff_type = 'driver')
- `transportation_segment_override_audit.segment_id` → `transportation_segments.id`
- `transportation_segment_override_audit.appointment_id` → `appointments.id`

## Basic Analytics Queries

### 1. Segment Utilization Overview

```sql
-- Get segment utilization metrics
SELECT
  COUNT(*) as total_segments,
  COUNT(driver_id) as segments_with_drivers,
  ROUND(COUNT(driver_id)::DECIMAL / COUNT(*) * 100, 2) as utilization_rate,
  COUNT(CASE WHEN manual_override = true THEN 1 END) as manual_overrides,
  ROUND(COUNT(CASE WHEN manual_override = true THEN 1 END)::DECIMAL / COUNT(*) * 100, 2) as override_rate
FROM transportation_segments
WHERE planned_start >= $1 AND planned_start <= $2;
```

### 2. Segment Distribution by Type

```sql
-- Segment distribution by type
SELECT
  segment_type,
  COUNT(*) as count,
  ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER() * 100, 2) as percentage
FROM transportation_segments
WHERE planned_start >= $1 AND planned_start <= $2
GROUP BY segment_type
ORDER BY count DESC;
```

### 3. Segment Status Distribution

```sql
-- Segment status distribution
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER() * 100, 2) as percentage
FROM transportation_segments
WHERE planned_start >= $1 AND planned_start <= $2
GROUP BY status
ORDER BY count DESC;
```

### 4. Average Travel Metrics

```sql
-- Average travel time and distance
SELECT
  ROUND(AVG(estimated_travel_minutes), 2) as avg_travel_minutes,
  ROUND(AVG(estimated_distance_km), 2) as avg_distance_km,
  ROUND(AVG(buffer_minutes), 2) as avg_buffer_minutes
FROM transportation_segments
WHERE planned_start >= $1
  AND planned_start <= $2
  AND estimated_travel_minutes IS NOT NULL
  AND estimated_distance_km IS NOT NULL;
```

## Driver Performance Queries

### 1. Driver Segment Assignment Summary

```sql
-- Driver performance summary
SELECT
  s.id as driver_id,
  s.first_name,
  s.last_name,
  COUNT(ts.id) as total_segments,
  COUNT(CASE WHEN ts.status = 'completed' THEN 1 END) as completed_segments,
  COUNT(CASE WHEN ts.status = 'cancelled' THEN 1 END) as cancelled_segments,
  ROUND(COUNT(CASE WHEN ts.status = 'completed' THEN 1 END)::DECIMAL / COUNT(ts.id) * 100, 2) as completion_rate,
  COUNT(CASE WHEN ts.manual_override = true THEN 1 END) as manual_overrides,
  ROUND(COUNT(CASE WHEN ts.manual_override = true THEN 1 END)::DECIMAL / COUNT(ts.id) * 100, 2) as override_rate,
  ROUND(AVG(ts.estimated_travel_minutes), 2) as avg_travel_time,
  ROUND(AVG(ts.estimated_distance_km), 2) as avg_distance
FROM staff s
LEFT JOIN transportation_segments ts ON s.id = ts.driver_id
  AND ts.planned_start >= $1
  AND ts.planned_start <= $2
WHERE s.staff_type = 'driver' AND s.status = 'active'
GROUP BY s.id, s.first_name, s.last_name
ORDER BY total_segments DESC;
```

### 2. Driver Workload Analysis

```sql
-- Driver workload by segment type
SELECT
  s.first_name || ' ' || s.last_name as driver_name,
  ts.segment_type,
  COUNT(*) as segment_count,
  ROUND(AVG(ts.estimated_travel_minutes), 2) as avg_travel_time,
  ROUND(SUM(ts.estimated_travel_minutes), 2) as total_travel_time
FROM staff s
JOIN transportation_segments ts ON s.id = ts.driver_id
WHERE ts.planned_start >= $1
  AND ts.planned_start <= $2
  AND s.staff_type = 'driver'
GROUP BY s.id, s.first_name, s.last_name, ts.segment_type
ORDER BY driver_name, segment_count DESC;
```

### 3. Driver Availability Analysis

```sql
-- Driver availability and conflicts
WITH driver_segments AS (
  SELECT
    driver_id,
    planned_start,
    planned_end,
    segment_type,
    status
  FROM transportation_segments
  WHERE planned_start >= $1 AND planned_start <= $2
    AND driver_id IS NOT NULL
),
conflict_analysis AS (
  SELECT
    ds1.driver_id,
    COUNT(*) as total_segments,
    COUNT(CASE WHEN ds2.id IS NOT NULL THEN 1 END) as conflicts
  FROM driver_segments ds1
  LEFT JOIN driver_segments ds2 ON ds1.driver_id = ds2.driver_id
    AND ds1.id != ds2.id
    AND ds1.planned_start < ds2.planned_end
    AND ds1.planned_end > ds2.planned_start
  GROUP BY ds1.driver_id
)
SELECT
  s.first_name || ' ' || s.last_name as driver_name,
  ca.total_segments,
  ca.conflicts,
  ROUND(ca.conflicts::DECIMAL / ca.total_segments * 100, 2) as conflict_rate
FROM staff s
JOIN conflict_analysis ca ON s.id = ca.driver_id
ORDER BY conflict_rate DESC;
```

## Conflict Analysis Queries

### 1. Segment Conflicts Detection

```sql
-- Detect overlapping segments for the same driver
WITH segment_conflicts AS (
  SELECT
    ts1.id as segment1_id,
    ts1.driver_id,
    ts1.planned_start as start1,
    ts1.planned_end as end1,
    ts2.id as segment2_id,
    ts2.planned_start as start2,
    ts2.planned_end as end2,
    CASE
      WHEN ts1.planned_start < ts2.planned_end AND ts1.planned_end > ts2.planned_start
      THEN true
      ELSE false
    END as has_conflict
  FROM transportation_segments ts1
  JOIN transportation_segments ts2 ON ts1.driver_id = ts2.driver_id
    AND ts1.id != ts2.id
    AND ts1.planned_start < ts2.planned_end
    AND ts1.planned_end > ts2.planned_start
)
SELECT
  sc.driver_id,
  s.first_name || ' ' || s.last_name as driver_name,
  COUNT(*) as conflict_count,
  COUNT(CASE WHEN ts1.manual_override = true THEN 1 END) as overridden_conflicts
FROM segment_conflicts sc
JOIN staff s ON sc.driver_id = s.id
JOIN transportation_segments ts1 ON sc.segment1_id = ts1.id
WHERE sc.has_conflict = true
GROUP BY sc.driver_id, s.first_name, s.last_name
ORDER BY conflict_count DESC;
```

### 2. Travel Buffer Analysis

```sql
-- Analyze travel buffer adequacy
WITH segment_gaps AS (
  SELECT
    ts1.id as segment_id,
    ts1.driver_id,
    ts1.planned_end,
    ts2.planned_start as next_start,
    EXTRACT(EPOCH FROM (ts2.planned_start - ts1.planned_end)) / 60 as gap_minutes,
    ts1.buffer_minutes,
    CASE
      WHEN EXTRACT(EPOCH FROM (ts2.planned_start - ts1.planned_end)) / 60 < ts1.buffer_minutes
      THEN true
      ELSE false
    END as insufficient_buffer
  FROM transportation_segments ts1
  JOIN transportation_segments ts2 ON ts1.driver_id = ts2.driver_id
    AND ts1.planned_end < ts2.planned_start
    AND ts1.id != ts2.id
  WHERE ts1.planned_start >= $1 AND ts1.planned_start <= $2
)
SELECT
  COUNT(*) as total_gaps,
  COUNT(CASE WHEN insufficient_buffer = true THEN 1 END) as insufficient_buffers,
  ROUND(COUNT(CASE WHEN insufficient_buffer = true THEN 1 END)::DECIMAL / COUNT(*) * 100, 2) as insufficient_buffer_rate,
  ROUND(AVG(gap_minutes), 2) as avg_gap_minutes,
  ROUND(AVG(buffer_minutes), 2) as avg_required_buffer
FROM segment_gaps;
```

## Override and Audit Queries

### 1. Override Statistics

```sql
-- Override statistics by reason
SELECT
  override_reason,
  COUNT(*) as count,
  ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER() * 100, 2) as percentage,
  COUNT(CASE WHEN requires_follow_up = true THEN 1 END) as requires_follow_up,
  COUNT(CASE WHEN follow_up_completed = true THEN 1 END) as follow_up_completed
FROM transportation_segment_override_audit
WHERE created_at >= $1 AND created_at <= $2
GROUP BY override_reason
ORDER BY count DESC;
```

### 2. Override Activity by User

```sql
-- Override activity by user
SELECT
  user_name,
  COUNT(*) as total_overrides,
  COUNT(CASE WHEN requires_follow_up = true THEN 1 END) as follow_up_required,
  COUNT(CASE WHEN follow_up_completed = true THEN 1 END) as follow_up_completed,
  ROUND(COUNT(CASE WHEN follow_up_completed = true THEN 1 END)::DECIMAL /
        NULLIF(COUNT(CASE WHEN requires_follow_up = true THEN 1 END), 0) * 100, 2) as follow_up_completion_rate
FROM transportation_segment_override_audit
WHERE created_at >= $1 AND created_at <= $2
GROUP BY user_name
ORDER BY total_overrides DESC;
```

### 3. Override Trends

```sql
-- Override trends over time
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_overrides,
  COUNT(CASE WHEN override_reason = 'driver_conflict' THEN 1 END) as driver_conflicts,
  COUNT(CASE WHEN override_reason = 'timing_conflict' THEN 1 END) as timing_conflicts,
  COUNT(CASE WHEN override_reason = 'travel_buffer_insufficient' THEN 1 END) as buffer_issues
FROM transportation_segment_override_audit
WHERE created_at >= $1 AND created_at <= $2
GROUP BY DATE(created_at)
ORDER BY date;
```

## Trend Analysis Queries

### 1. Daily Segment Trends

```sql
-- Daily segment creation trends
SELECT
  DATE(planned_start) as date,
  COUNT(*) as total_segments,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN manual_override = true THEN 1 END) as manual_overrides
FROM transportation_segments
WHERE planned_start >= $1 AND planned_start <= $2
GROUP BY DATE(planned_start)
ORDER BY date;
```

### 2. Weekly Performance Trends

```sql
-- Weekly performance trends
SELECT
  DATE_TRUNC('week', planned_start) as week_start,
  COUNT(*) as total_segments,
  ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*) * 100, 2) as completion_rate,
  ROUND(COUNT(CASE WHEN manual_override = true THEN 1 END)::DECIMAL / COUNT(*) * 100, 2) as override_rate,
  ROUND(AVG(estimated_travel_minutes), 2) as avg_travel_time
FROM transportation_segments
WHERE planned_start >= $1 AND planned_start <= $2
GROUP BY DATE_TRUNC('week', planned_start)
ORDER BY week_start;
```

### 3. Monthly Driver Performance

```sql
-- Monthly driver performance
SELECT
  DATE_TRUNC('month', ts.planned_start) as month,
  s.first_name || ' ' || s.last_name as driver_name,
  COUNT(ts.id) as segments_assigned,
  COUNT(CASE WHEN ts.status = 'completed' THEN 1 END) as segments_completed,
  ROUND(COUNT(CASE WHEN ts.status = 'completed' THEN 1 END)::DECIMAL / COUNT(ts.id) * 100, 2) as completion_rate,
  ROUND(AVG(ts.estimated_travel_minutes), 2) as avg_travel_time
FROM staff s
JOIN transportation_segments ts ON s.id = ts.driver_id
WHERE ts.planned_start >= $1 AND ts.planned_start <= $2
  AND s.staff_type = 'driver'
GROUP BY DATE_TRUNC('month', ts.planned_start), s.id, s.first_name, s.last_name
ORDER BY month DESC, segments_assigned DESC;
```

## BI Dashboard Queries

### 1. Executive Summary Dashboard

```sql
-- Executive summary for dashboard
WITH segment_metrics AS (
  SELECT
    COUNT(*) as total_segments,
    COUNT(driver_id) as segments_with_drivers,
    COUNT(CASE WHEN manual_override = true THEN 1 END) as manual_overrides,
    ROUND(AVG(estimated_travel_minutes), 2) as avg_travel_time,
    ROUND(AVG(estimated_distance_km), 2) as avg_distance
  FROM transportation_segments
  WHERE planned_start >= $1 AND planned_start <= $2
),
override_metrics AS (
  SELECT
    COUNT(*) as total_overrides,
    COUNT(CASE WHEN requires_follow_up = true THEN 1 END) as follow_up_required
  FROM transportation_segment_override_audit
  WHERE created_at >= $1 AND created_at <= $2
)
SELECT
  sm.*,
  om.*,
  ROUND(sm.segments_with_drivers::DECIMAL / sm.total_segments * 100, 2) as utilization_rate,
  ROUND(sm.manual_overrides::DECIMAL / sm.total_segments * 100, 2) as override_rate
FROM segment_metrics sm, override_metrics om;
```

### 2. Driver Performance Dashboard

```sql
-- Driver performance dashboard
SELECT
  s.id as driver_id,
  s.first_name || ' ' || s.last_name as driver_name,
  COUNT(ts.id) as total_segments,
  COUNT(CASE WHEN ts.status = 'completed' THEN 1 END) as completed_segments,
  COUNT(CASE WHEN ts.status = 'cancelled' THEN 1 END) as cancelled_segments,
  ROUND(COUNT(CASE WHEN ts.status = 'completed' THEN 1 END)::DECIMAL / COUNT(ts.id) * 100, 2) as completion_rate,
  COUNT(CASE WHEN ts.manual_override = true THEN 1 END) as manual_overrides,
  ROUND(COUNT(CASE WHEN ts.manual_override = true THEN 1 END)::DECIMAL / COUNT(ts.id) * 100, 2) as override_rate,
  ROUND(AVG(ts.estimated_travel_minutes), 2) as avg_travel_time,
  ROUND(AVG(ts.estimated_distance_km), 2) as avg_distance,
  COUNT(DISTINCT ts.segment_type) as segment_types_handled
FROM staff s
LEFT JOIN transportation_segments ts ON s.id = ts.driver_id
  AND ts.planned_start >= $1 AND ts.planned_start <= $2
WHERE s.staff_type = 'driver' AND s.status = 'active'
GROUP BY s.id, s.first_name, s.last_name
ORDER BY total_segments DESC;
```

### 3. Conflict Resolution Dashboard

```sql
-- Conflict resolution dashboard
SELECT
  'Total Conflicts' as metric,
  COUNT(*) as value
FROM transportation_segment_override_audit
WHERE created_at >= $1 AND created_at <= $2
UNION ALL
SELECT
  'Manual Overrides' as metric,
  COUNT(*) as value
FROM transportation_segment_override_audit
WHERE created_at >= $1 AND created_at <= $2
  AND operation_type LIKE '%override%'
UNION ALL
SELECT
  'Follow-up Required' as metric,
  COUNT(*) as value
FROM transportation_segment_override_audit
WHERE created_at >= $1 AND created_at <= $2
  AND requires_follow_up = true
UNION ALL
SELECT
  'Follow-up Completed' as metric,
  COUNT(*) as value
FROM transportation_segment_override_audit
WHERE created_at >= $1 AND created_at <= $2
  AND follow_up_completed = true;
```

## Data Export Queries

### 1. Complete Segment Export

```sql
-- Complete segment data for export
SELECT
  ts.id as segment_id,
  ts.title as segment_title,
  ts.segment_type,
  ts.status,
  ts.planned_start,
  ts.planned_end,
  ts.travel_mode,
  ts.estimated_travel_minutes,
  ts.estimated_distance_km,
  ts.buffer_minutes,
  ts.instructions,
  ts.requires_follow_up,
  ts.manual_override,
  ts.created_at,
  ts.updated_at,
  s.first_name || ' ' || s.last_name as driver_name,
  s.phone as driver_phone,
  s.email as driver_email,
  a.appointment_date,
  a.appointment_time,
  p.name as patient_name,
  p.phone as patient_phone,
  p.area as patient_area,
  p.city as patient_city,
  ts.origin->>'address' as origin_address,
  ts.origin->>'lat' as origin_lat,
  ts.origin->>'lng' as origin_lng,
  ts.destination->>'address' as destination_address,
  ts.destination->>'lat' as destination_lat,
  ts.destination->>'lng' as destination_lng
FROM transportation_segments ts
LEFT JOIN staff s ON ts.driver_id = s.id
LEFT JOIN appointments a ON ts.appointment_id = a.id
LEFT JOIN patients p ON a.patient_id = p.id
WHERE ts.planned_start >= $1 AND ts.planned_start <= $2
ORDER BY ts.planned_start;
```

### 2. Override History Export

```sql
-- Override history for export
SELECT
  tsoa.id as override_id,
  tsoa.segment_id,
  ts.title as segment_title,
  ts.segment_type,
  tsoa.operation_type,
  tsoa.override_reason,
  tsoa.user_name,
  tsoa.created_at as override_date,
  tsoa.original_driver_id,
  s1.first_name || ' ' || s1.last_name as original_driver_name,
  tsoa.new_driver_id,
  s2.first_name || ' ' || s2.last_name as new_driver_name,
  tsoa.original_planned_start,
  tsoa.new_planned_start,
  tsoa.original_planned_end,
  tsoa.new_planned_end,
  tsoa.conflict_details,
  tsoa.override_justification,
  tsoa.requires_follow_up,
  tsoa.follow_up_completed
FROM transportation_segment_override_audit tsoa
LEFT JOIN transportation_segments ts ON tsoa.segment_id = ts.id
LEFT JOIN staff s1 ON tsoa.original_driver_id = s1.id
LEFT JOIN staff s2 ON tsoa.new_driver_id = s2.id
WHERE tsoa.created_at >= $1 AND tsoa.created_at <= $2
ORDER BY tsoa.created_at DESC;
```

## Performance Optimization

### Indexes for Better Performance

```sql
-- Recommended indexes for transportation segments
CREATE INDEX CONCURRENTLY idx_transportation_segments_planned_start
ON transportation_segments(planned_start);

CREATE INDEX CONCURRENTLY idx_transportation_segments_driver_id
ON transportation_segments(driver_id);

CREATE INDEX CONCURRENTLY idx_transportation_segments_appointment_id
ON transportation_segments(appointment_id);

CREATE INDEX CONCURRENTLY idx_transportation_segments_status
ON transportation_segments(status);

CREATE INDEX CONCURRENTLY idx_transportation_segments_segment_type
ON transportation_segments(segment_type);

CREATE INDEX CONCURRENTLY idx_transportation_segments_manual_override
ON transportation_segments(manual_override);

-- Override audit indexes
CREATE INDEX CONCURRENTLY idx_override_audit_created_at
ON transportation_segment_override_audit(created_at);

CREATE INDEX CONCURRENTLY idx_override_audit_segment_id
ON transportation_segment_override_audit(segment_id);

CREATE INDEX CONCURRENTLY idx_override_audit_user_id
ON transportation_segment_override_audit(user_id);
```

## Usage Examples

### 1. Daily Operations Report

```sql
-- Generate daily operations report
SELECT
  'Daily Operations Report' as report_type,
  CURRENT_DATE as report_date,
  COUNT(*) as total_segments,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN manual_override = true THEN 1 END) as overrides,
  ROUND(AVG(estimated_travel_minutes), 2) as avg_travel_time
FROM transportation_segments
WHERE DATE(planned_start) = CURRENT_DATE;
```

### 2. Weekly Performance Summary

```sql
-- Weekly performance summary
SELECT
  'Weekly Performance Summary' as report_type,
  DATE_TRUNC('week', CURRENT_DATE) as week_start,
  COUNT(*) as total_segments,
  COUNT(DISTINCT driver_id) as active_drivers,
  ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*) * 100, 2) as completion_rate,
  ROUND(COUNT(CASE WHEN manual_override = true THEN 1 END)::DECIMAL / COUNT(*) * 100, 2) as override_rate
FROM transportation_segments
WHERE planned_start >= DATE_TRUNC('week', CURRENT_DATE)
  AND planned_start < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week';
```

## Notes for Operations Team

1. **Date Parameters**: All queries use `$1` and `$2` as date parameters. Replace with actual date values in your BI tools.

2. **Performance**: For large datasets, consider adding the recommended indexes and using `LIMIT` clauses for initial testing.

3. **Data Freshness**: These queries work with the current schema. If the schema changes, update the queries accordingly.

4. **Customization**: Modify the queries based on your specific reporting needs and add additional filters as required.

5. **Scheduling**: Consider running these queries on a schedule (daily, weekly, monthly) and storing results in summary tables for better performance.

6. **Monitoring**: Use these queries to monitor system performance and identify areas for improvement in transportation segment management.
