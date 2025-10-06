# Transportation Segments Migration Guide

## Overview

This guide helps existing users migrate from the old transportation segments system to the new pickup/patient location terminology and pickup location type system.

## What Changed

### Field Name Changes

| Old Field Name | New Field Name | Notes |
|----------------|----------------|-------|
| `origin` | `pickup_location` | Location where driver picks up patient |
| `destination` | `patient_location` | Location where patient is going |
| N/A | `pickup_location_type` | New field: office, previous_appointment, metro_station, custom |
| N/A | `pickup_location_reference` | New field: reference ID for previous appointments or metro stations |

### New Features

1. **Pickup Location Types**: Four different ways to specify pickup locations
2. **Automatic Time Calculation**: System calculates pickup times based on appointment start time
3. **Buffer Time Management**: Configurable buffer time with warnings
4. **Enhanced Validation**: Better validation for location types and references

## Migration Process

### For API Consumers

#### 1. Update API Calls

**Old API Call**:
```json
{
  "appointment_id": "123",
  "segment_type": "pickup",
  "origin": {
    "lat": 40.7128,
    "lng": -74.0060,
    "address": "123 Main St, New York, NY"
  },
  "destination": {
    "lat": 40.7589,
    "lng": -73.9851,
    "address": "456 Broadway, New York, NY"
  }
}
```

**New API Call**:
```json
{
  "appointment_id": "123",
  "segment_type": "pickup",
  "pickup_location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "address": "123 Main St, New York, NY"
  },
  "patient_location": {
    "lat": 40.7589,
    "lng": -73.9851,
    "address": "456 Broadway, New York, NY"
  },
  "pickup_location_type": "custom",
  "pickup_location_reference": null
}
```

#### 2. Backward Compatibility

The API maintains backward compatibility for a limited time:

- Old field names (`origin`, `destination`) are still accepted
- System automatically maps old fields to new fields
- Warning messages are logged for deprecated field usage
- **Important**: Update your code to use new field names as soon as possible

#### 3. Required Updates

**Immediate Updates Required**:
- Add `pickup_location_type` field to all API calls
- Add `pickup_location_reference` field when needed
- Update field names from `origin`/`destination` to `pickup_location`/`patient_location`

**Recommended Updates**:
- Implement pickup location type selection logic
- Add validation for pickup location references
- Update error handling for new validation rules

### For Dispatchers

#### 1. New Workflow

**Old Workflow**:
1. Create transportation segment
2. Enter origin and destination
3. Assign driver
4. Set times

**New Workflow**:
1. Create transportation segment
2. Select pickup location type
3. Enter pickup location details
4. Enter patient location
5. System calculates pickup time automatically
6. Assign driver
7. Review and adjust times if needed

#### 2. Pickup Location Type Selection

**From Office**:
- Use when driver starts from office
- No additional information needed
- System uses configured office address

**From Previous Appointment**:
- Use when continuing from previous appointment
- Select previous appointment from dropdown
- System uses patient location from that appointment

**From Metro Station**:
- Use when patient uses public transportation
- Select metro station from dropdown
- System uses metro station address

**From Custom Location**:
- Use for any other pickup location
- Enter address manually
- System validates and geocodes address

#### 3. Time Management

**Automatic Calculation**:
- System calculates pickup time: `Appointment Start Time - Travel Time - Buffer Time`
- Default buffer time: 20 minutes
- Configurable buffer time per segment

**Manual Override**:
- Can override calculated times if needed
- System logs override reasons
- Warnings for insufficient buffer time

### For System Administrators

#### 1. Database Migration

The migration is handled automatically, but verify:

```sql
-- Check that old columns are renamed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'transportation_segments'
AND column_name IN ('pickup_location', 'patient_location', 'pickup_location_type', 'pickup_location_reference');
```

#### 2. Configuration Updates

**Office Location**:
```bash
# Set office address in environment variables
OFFICE_ADDRESS="123 Main St, City, State"
OFFICE_LAT=40.7128
OFFICE_LNG=-74.0060
```

**Metro Stations**:
```sql
-- Add metro stations to the system
INSERT INTO metro_stations (id, name, address, lat, lng, is_active) VALUES
('metro_1', 'Central Station', '123 Central Ave, City, State', 40.7128, -74.0060, true);
```

#### 3. Feature Flags

```bash
# Enable new features gradually
TRANSPORTATION_SEGMENTS_ENABLED=true
TRANSPORTATION_SEGMENTS_UI_ENABLED=true
TRANSPORTATION_SEGMENTS_PICKUP_TYPES_ENABLED=true
```

## Testing Your Migration

### 1. API Testing

**Test Backward Compatibility**:
```bash
# Test old field names still work
curl -X POST "http://localhost:3000/api/transportation-segments" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "123",
    "segment_type": "pickup",
    "origin": {"lat": 40.7128, "lng": -74.0060, "address": "123 Main St"},
    "destination": {"lat": 40.7589, "lng": -73.9851, "address": "456 Broadway"}
  }'
```

**Test New Field Names**:
```bash
# Test new field names
curl -X POST "http://localhost:3000/api/transportation-segments" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "123",
    "segment_type": "pickup",
    "pickup_location": {"lat": 40.7128, "lng": -74.0060, "address": "123 Main St"},
    "patient_location": {"lat": 40.7589, "lng": -73.9851, "address": "456 Broadway"},
    "pickup_location_type": "custom"
  }'
```

### 2. UI Testing

**Test Pickup Location Types**:
1. Create new transportation segment
2. Test each pickup location type
3. Verify validation works correctly
4. Check time calculations

**Test Existing Data**:
1. View existing transportation segments
2. Verify data displays correctly
3. Test editing existing segments
4. Verify backward compatibility

### 3. Data Validation

**Check Data Integrity**:
```sql
-- Verify all segments have pickup location types
SELECT COUNT(*) FROM transportation_segments WHERE pickup_location_type IS NULL;

-- Check pickup location references
SELECT pickup_location_type, COUNT(*)
FROM transportation_segments
GROUP BY pickup_location_type;
```

## Common Issues and Solutions

### Issue: "Pickup location type is required"
**Solution**: Add `pickup_location_type` field to your API calls

### Issue: "Invalid pickup location reference"
**Solution**:
- For `previous_appointment`: Ensure the appointment exists and has a patient location
- For `metro_station`: Ensure the metro station is configured in the system

### Issue: "Old field names not working"
**Solution**:
- Update to new field names (`pickup_location`, `patient_location`)
- Check API version compatibility
- Verify backward compatibility is enabled

### Issue: "Time calculations incorrect"
**Solution**:
- Check buffer time settings
- Verify travel time calculations
- Review appointment start times
- Check for manual overrides

## Rollback Plan

If issues occur during migration:

### 1. Immediate Rollback
```bash
# Disable new features
TRANSPORTATION_SEGMENTS_PICKUP_TYPES_ENABLED=false
TRANSPORTATION_SEGMENTS_UI_ENABLED=false

# Restart application
systemctl restart your-app-service
```

### 2. Data Rollback
```sql
-- If needed, revert to old field names (not recommended)
-- This should only be done in extreme circumstances
-- Contact system administrator before proceeding
```

### 3. Gradual Rollback
```bash
# Disable specific features
TRANSPORTATION_SEGMENTS_PICKUP_TYPES_ENABLED=false
# Keep core functionality enabled
TRANSPORTATION_SEGMENTS_ENABLED=true
```

## Support and Resources

### Documentation
- [API Documentation](./transportation-segments-api.md)
- [Dispatcher Guide](./dispatcher-pickup-location-guide.md)
- [Technical Documentation](./transportation-segments.md)

### Contact Information
- **Technical Support**: [Your technical support contact]
- **Migration Support**: [Your migration support contact]
- **Emergency Escalation**: [Your emergency contact]

### Training Resources
- [Video Tutorials](#) - Coming soon
- [Interactive Training](#) - Coming soon
- [FAQ](#) - Coming soon

## Timeline

### Phase 1: Preparation (Week 1)
- Review this migration guide
- Test in development environment
- Update API consumers
- Train dispatchers

### Phase 2: Migration (Week 2)
- Deploy database changes
- Enable new features gradually
- Monitor system performance
- Provide user support

### Phase 3: Optimization (Week 3)
- Gather user feedback
- Optimize performance
- Fix any issues
- Complete training

### Phase 4: Completion (Week 4)
- Full feature rollout
- Remove backward compatibility warnings
- Update all documentation
- Celebrate success!

---

*Last updated: [Current Date]*
*Version: 1.0*

