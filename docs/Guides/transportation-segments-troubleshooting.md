# Transportation Segments Troubleshooting Guide

## Overview

This guide helps resolve common issues with the Transportation Segments feature, including the new pickup location type system and updated terminology.

## Common Issues and Solutions

### 1. Pickup Location Type Issues

#### Issue: "No previous appointments available"

**Symptoms**:
- Dropdown for previous appointments is empty
- Error message: "No previous appointments found"
- Cannot select "From Previous Appointment" type

**Possible Causes**:
- Patient has no completed appointments
- Previous appointment has no patient location
- Appointment is in the future
- Data synchronization issues

**Solutions**:
1. **Check patient's appointment history**:
   - Verify patient has completed appointments
   - Check if appointments have patient locations
   - Ensure appointments are in the past

2. **Use alternative pickup types**:
   - Use "From Office" for first appointments
   - Use "From Custom Location" with previous address
   - Use "From Metro Station" if applicable

3. **Data verification**:
   ```sql
   -- Check if patient has appointments with locations
   SELECT a.id, a.patient_id, a.appointment_date, a.patient_location
   FROM appointments a
   WHERE a.patient_id = 'patient_id'
   AND a.patient_location IS NOT NULL
   ORDER BY a.appointment_date DESC;
   ```

#### Issue: "Metro station not found"

**Symptoms**:
- Metro station dropdown is empty
- Error message: "Metro station not configured"
- Cannot select "From Metro Station" type

**Possible Causes**:
- Metro stations not configured in system
- Metro station is inactive
- Network connectivity issues
- Database synchronization problems

**Solutions**:
1. **Contact system administrator**:
   - Request metro station configuration
   - Verify metro station is active
   - Check system settings

2. **Use alternative pickup types**:
   - Use "From Custom Location" with metro station address
   - Use "From Office" as fallback
   - Use "From Previous Appointment" if applicable

3. **Manual configuration**:
   ```sql
   -- Add metro station manually (admin only)
   INSERT INTO metro_stations (name, address, lat, lng, is_active)
   VALUES ('Central Station', '123 Central Ave, City, State', 40.7128, -74.0060, true);
   ```

#### Issue: "Invalid address" for custom location

**Symptoms**:
- Address search returns no results
- Error message: "Address not found"
- Cannot geocode address

**Possible Causes**:
- Address format is incorrect
- Address is not geocodable
- Network connectivity issues
- Google Maps API issues

**Solutions**:
1. **Improve address format**:
   - Include city and state/province
   - Use complete street address
   - Add postal/zip code
   - Include country if needed

2. **Use landmarks**:
   - Try nearby businesses
   - Use well-known landmarks
   - Include cross streets
   - Add building names

3. **Alternative approaches**:
   - Use "From Office" if appropriate
   - Use "From Previous Appointment" if available
   - Contact patient for clarification
   - Use approximate coordinates

### 2. Time Calculation Issues

#### Issue: "Pickup time calculation incorrect"

**Symptoms**:
- Pickup time seems wrong
- Time calculations don't match expectations
- Buffer time not applied correctly

**Possible Causes**:
- Buffer time settings incorrect
- Travel time estimates wrong
- Appointment time changes
- Manual overrides

**Solutions**:
1. **Check buffer time settings**:
   - Verify buffer time is appropriate (default: 20 minutes)
   - Adjust for traffic conditions
   - Consider weather factors
   - Account for driver experience

2. **Verify travel time estimates**:
   - Use system estimates as starting point
   - Adjust for traffic patterns
   - Consider time of day
   - Factor in distance and route

3. **Review appointment times**:
   - Check if appointment time changed
   - Verify timezone settings
   - Confirm date and time accuracy
   - Check for manual overrides

#### Issue: "Buffer time insufficient"

**Symptoms**:
- Warning message about buffer time
- Pickup time too close to appointment
- Risk of being late

**Solutions**:
1. **Increase buffer time**:
   - Standard: 20 minutes
   - Complex locations: 30 minutes
   - Rush hour: 40 minutes
   - Weather concerns: 30+ minutes

2. **Adjust pickup time**:
   - Move pickup time earlier
   - Consider traffic patterns
   - Account for driver experience
   - Factor in location complexity

### 3. Location Validation Issues

#### Issue: "Pickup and patient locations are the same"

**Symptoms**:
- Error message: "Pickup and patient locations cannot be the same"
- Cannot save transportation segment
- Validation error

**Possible Causes**:
- Data entry error
- Wrong pickup location selected
- Should be "Stay with Staff" segment
- System bug

**Solutions**:
1. **Verify locations**:
   - Check if pickup location is correct
   - Verify patient location is accurate
   - Ensure locations are different
   - Review segment type

2. **Consider segment type**:
   - Use "Stay with Staff" if driver stays with patient
   - Use "Dropoff" if driver drops off patient
   - Use "Custom" for special situations

3. **Data correction**:
   - Update pickup location if wrong
   - Correct patient location if needed
   - Verify address accuracy
   - Check coordinates

#### Issue: "Location coordinates invalid"

**Symptoms**:
- Error message: "Invalid coordinates"
- Location not displaying on map
- Geocoding failures

**Possible Causes**:
- Invalid latitude/longitude values
- Coordinates out of range
- Data corruption
- API issues

**Solutions**:
1. **Validate coordinates**:
   - Latitude: -90 to 90
   - Longitude: -180 to 180
   - Check for reasonable values
   - Verify decimal places

2. **Re-enter location**:
   - Use address search again
   - Verify address format
   - Check for typos
   - Use landmarks

3. **System check**:
   - Verify Google Maps API key
   - Check API quota limits
   - Review error logs
   - Contact technical support

### 4. Driver Assignment Issues

#### Issue: "Driver not available"

**Symptoms**:
- Driver dropdown is empty
- Error message: "No drivers available"
- Cannot assign driver

**Possible Causes**:
- No drivers configured in system
- Driver is inactive
- Driver already assigned to conflicting segment
- System configuration issues

**Solutions**:
1. **Check driver availability**:
   - Verify driver is active
   - Check driver's schedule
   - Review existing assignments
   - Confirm driver availability

2. **System configuration**:
   - Contact administrator to add drivers
   - Verify driver permissions
   - Check system settings
   - Review user roles

3. **Alternative approaches**:
   - Assign driver later
   - Use different driver
   - Create segment without driver
   - Contact dispatch

#### Issue: "Driver conflict detected"

**Symptoms**:
- Warning about driver conflicts
- Driver already assigned to overlapping segment
- Scheduling conflicts

**Solutions**:
1. **Review driver schedule**:
   - Check existing assignments
   - Look for overlapping times
   - Verify segment durations
   - Consider travel time

2. **Resolve conflicts**:
   - Adjust segment times
   - Use different driver
   - Modify appointment schedule
   - Coordinate with dispatch

### 5. System Performance Issues

#### Issue: "Slow loading times"

**Symptoms**:
- Transportation segments load slowly
- UI becomes unresponsive
- Timeout errors

**Possible Causes**:
- Large number of segments
- Database performance issues
- Network connectivity problems
- System resource constraints

**Solutions**:
1. **Optimize queries**:
   - Use pagination for large datasets
   - Implement proper indexing
   - Optimize database queries
   - Cache frequently accessed data

2. **System monitoring**:
   - Check system resources
   - Monitor database performance
   - Review error logs
   - Contact technical support

3. **User optimization**:
   - Limit number of segments displayed
   - Use filters to reduce data
   - Refresh page if needed
   - Clear browser cache

#### Issue: "API errors"

**Symptoms**:
- API calls failing
- Error messages in console
- Data not saving

**Possible Causes**:
- Network connectivity issues
- API rate limiting
- Authentication problems
- Server errors

**Solutions**:
1. **Check connectivity**:
   - Verify internet connection
   - Test other system functions
   - Check network status
   - Try different network

2. **API troubleshooting**:
   - Check API status
   - Verify authentication
   - Review rate limits
   - Contact technical support

3. **System recovery**:
   - Refresh page
   - Clear browser cache
   - Restart application
   - Check system status

### 6. Data Migration Issues

#### Issue: "Old data not displaying correctly"

**Symptoms**:
- Existing segments show old field names
- Data appears corrupted
- Missing information

**Possible Causes**:
- Migration not completed
- Data corruption during migration
- Backward compatibility issues
- System configuration problems

**Solutions**:
1. **Verify migration**:
   - Check migration status
   - Review migration logs
   - Verify data integrity
   - Contact administrator

2. **Data recovery**:
   - Restore from backup
   - Re-run migration
   - Fix data corruption
   - Update system

3. **System check**:
   - Verify system configuration
   - Check feature flags
   - Review system settings
   - Contact technical support

## Diagnostic Commands

### Database Queries

```sql
-- Check transportation segments data
SELECT COUNT(*) FROM transportation_segments;

-- Check pickup location types
SELECT pickup_location_type, COUNT(*)
FROM transportation_segments
GROUP BY pickup_location_type;

-- Check for missing data
SELECT COUNT(*) FROM transportation_segments
WHERE pickup_location_type IS NULL;

-- Check segment status
SELECT status, COUNT(*)
FROM transportation_segments
GROUP BY status;
```

### System Checks

```bash
# Check system status
curl -X GET "http://localhost:3000/api/transportation-segments/status"

# Test API endpoints
curl -X GET "http://localhost:3000/api/transportation-segments"

# Check database connectivity
npx supabase db ping

# View application logs
tail -f logs/application.log
```

## Prevention Strategies

### 1. Data Validation

- Always verify pickup location types
- Check address accuracy
- Validate time calculations
- Review driver assignments

### 2. System Monitoring

- Monitor system performance
- Check error logs regularly
- Verify data integrity
- Update system components

### 3. User Training

- Provide comprehensive training
- Document common issues
- Create troubleshooting guides
- Regular system updates

### 4. Backup and Recovery

- Regular data backups
- Test recovery procedures
- Document rollback steps
- Maintain system health

## Escalation Procedures

### Level 1: User Issues
- Check this troubleshooting guide
- Verify system configuration
- Contact supervisor or administrator
- Document the issue

### Level 2: System Issues
- Contact technical support
- Provide error logs
- Describe the problem
- Include system information

### Level 3: Critical Issues
- Contact emergency support
- Implement rollback procedures
- Notify stakeholders
- Document incident

## Contact Information

### Technical Support
- **Email**: [technical-support@company.com]
- **Phone**: [Technical support phone]
- **Hours**: [Support hours]

### Emergency Escalation
- **Email**: [emergency@company.com]
- **Phone**: [Emergency phone]
- **Available**: 24/7 for critical issues

### System Administrator
- **Email**: [admin@company.com]
- **Phone**: [Admin phone]
- **Hours**: [Admin hours]

## Additional Resources

### Documentation
- [Dispatcher Guide](./dispatcher-pickup-location-guide.md)
- [API Documentation](./transportation-segments-api.md)
- [Migration Guide](./transportation-segments-migration-guide.md)
- [Training Materials](./dispatcher-training-materials.md)

### Training
- [Video Tutorials](#) - Coming soon
- [Interactive Training](#) - Coming soon
- [FAQ](#) - Coming soon

---

*Last updated: [Current Date]*
*Version: 1.0*

