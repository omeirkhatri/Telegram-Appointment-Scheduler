# Dispatcher Training Materials: Transportation Segments

## Overview

This comprehensive training material is designed to help dispatchers learn and master the new Transportation Segments system with pickup location types and updated terminology.

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Pickup Location Types](#pickup-location-types)
3. [Step-by-Step Workflows](#step-by-step-workflows)
4. [Common Scenarios](#common-scenarios)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Best Practices](#best-practices)
7. [Assessment Quiz](#assessment-quiz)

## Quick Start Guide

### What You Need to Know

**New Terminology**:
- **Pickup Location**: Where the driver picks up the patient (was "origin")
- **Patient Location**: Where the patient is going (was "destination")
- **Pickup Location Type**: How you specify the pickup location

**Four Pickup Location Types**:
1. **From Office** - Driver starts from office
2. **From Previous Appointment** - Driver continues from previous appointment
3. **From Metro Station** - Driver picks up from metro station
4. **From Custom Location** - Driver picks up from any address

### 5-Minute Quick Start

1. **Create Transportation Segment**
   - Go to appointment details
   - Click "Add Transportation Segment"
   - Select segment type (pickup, dropoff, etc.)

2. **Choose Pickup Location Type**
   - **From Office**: Click and done
   - **From Previous Appointment**: Select from dropdown
   - **From Metro Station**: Select from dropdown
   - **From Custom Location**: Enter address

3. **Enter Patient Location**
   - Enter where the patient is going
   - Use address search for accuracy

4. **Review and Save**
   - Check calculated pickup time
   - Assign driver if needed
   - Save segment

## Pickup Location Types

### 1. From Office

**When to Use**:
- First appointment of the day
- Driver starting their shift
- Standard pickup from office

**How to Use**:
1. Select "From Office" in pickup location type
2. System automatically uses office address
3. No additional information needed

**Benefits**:
- Quick and easy
- Consistent starting point
- No confusion about location

**Example**:
```
Pickup Location Type: From Office
Pickup Location: 123 Main St, City, State (automatically filled)
Patient Location: 456 Patient Ave, City, State
```

### 2. From Previous Appointment

**When to Use**:
- Multiple appointments for same patient
- Driver continuing from previous location
- Chained appointments in same area

**How to Use**:
1. Select "From Previous Appointment"
2. Choose previous appointment from dropdown
3. System uses patient location from that appointment
4. Verify the location is correct

**Benefits**:
- Reduces travel time
- Better driver efficiency
- Seamless transitions

**Example**:
```
Pickup Location Type: From Previous Appointment
Previous Appointment: John Doe - 9:00 AM (456 Patient Ave)
Pickup Location: 456 Patient Ave, City, State (from previous appointment)
Patient Location: 789 New Location, City, State
```

### 3. From Metro Station

**When to Use**:
- Patient using public transportation
- Centralized pickup locations
- Integration with public transit

**How to Use**:
1. Select "From Metro Station"
2. Choose metro station from dropdown
3. System uses metro station address
4. Verify station is correct

**Benefits**:
- Standardized pickup points
- Easy coordination with public transit
- Reduces confusion about exact location

**Example**:
```
Pickup Location Type: From Metro Station
Metro Station: Central Station
Pickup Location: 123 Central Ave, City, State (metro station address)
Patient Location: 456 Patient Ave, City, State
```

### 4. From Custom Location

**When to Use**:
- Patient's home address
- Specific landmark or building
- Temporary pickup locations
- Special events

**How to Use**:
1. Select "From Custom Location"
2. Enter address in search field
3. Select correct address from results
4. Add landmark if helpful

**Benefits**:
- Maximum flexibility
- Handles any address
- Useful for special circumstances

**Example**:
```
Pickup Location Type: From Custom Location
Pickup Location: 123 Patient Home, City, State
Landmark: Blue house with white fence
Patient Location: 456 Appointment Location, City, State
```

## Step-by-Step Workflows

### Workflow 1: Standard Pickup from Office

**Scenario**: Driver starting first appointment of the day

**Steps**:
1. Open appointment details
2. Click "Add Transportation Segment"
3. Select segment type: "Pickup"
4. Choose pickup location type: "From Office"
5. Enter patient location address
6. Review calculated pickup time
7. Assign driver
8. Save segment

**Expected Result**: Segment created with office as pickup location

### Workflow 2: Continuing from Previous Appointment

**Scenario**: Driver has multiple appointments for same patient

**Steps**:
1. Open second appointment details
2. Click "Add Transportation Segment"
3. Select segment type: "Pickup"
4. Choose pickup location type: "From Previous Appointment"
5. Select previous appointment from dropdown
6. Verify pickup location is correct
7. Enter patient location for this appointment
8. Review calculated pickup time
9. Assign driver
10. Save segment

**Expected Result**: Segment created with previous appointment's patient location as pickup location

### Workflow 3: Metro Station Pickup

**Scenario**: Patient using public transportation

**Steps**:
1. Open appointment details
2. Click "Add Transportation Segment"
3. Select segment type: "Pickup"
4. Choose pickup location type: "From Metro Station"
5. Select metro station from dropdown
6. Enter patient location address
7. Review calculated pickup time
8. Assign driver
9. Save segment

**Expected Result**: Segment created with metro station as pickup location

### Workflow 4: Custom Location Pickup

**Scenario**: Patient's home address

**Steps**:
1. Open appointment details
2. Click "Add Transportation Segment"
3. Select segment type: "Pickup"
4. Choose pickup location type: "From Custom Location"
5. Enter patient's home address
6. Select correct address from search results
7. Add landmark if helpful
8. Enter patient location for appointment
9. Review calculated pickup time
10. Assign driver
11. Save segment

**Expected Result**: Segment created with custom address as pickup location

## Common Scenarios

### Scenario 1: First Appointment of the Day

**Situation**: Driver starting their shift with first appointment

**Solution**:
- Use "From Office" pickup location type
- System automatically uses office address
- No additional setup needed

**Time Calculation**:
- Pickup Time = Appointment Start Time - Travel Time - Buffer Time
- Example: 10:00 AM appointment, 30 min travel, 20 min buffer = 9:10 AM pickup

### Scenario 2: Multiple Appointments for Same Patient

**Situation**: Patient has 2 appointments in same day

**Solution**:
- First appointment: Use "From Office"
- Second appointment: Use "From Previous Appointment"
- Select first appointment from dropdown

**Benefits**:
- Reduces travel time
- Better driver efficiency
- Seamless transitions

### Scenario 3: Patient Using Public Transportation

**Situation**: Patient takes metro to central location

**Solution**:
- Use "From Metro Station" pickup location type
- Select appropriate metro station
- Coordinate with public transit schedule

**Considerations**:
- Check metro station hours
- Consider traffic to/from station
- Have backup plan if metro is delayed

### Scenario 4: Special Event or Location

**Situation**: Pickup from specific event or landmark

**Solution**:
- Use "From Custom Location" pickup location type
- Enter specific address
- Add landmark information for driver

**Tips**:
- Be specific with address
- Include helpful landmarks
- Consider parking availability

### Scenario 5: Emergency or Last-Minute Changes

**Situation**: Pickup location changes at last minute

**Solution**:
- Edit existing segment
- Change pickup location type if needed
- Update address information
- Notify driver of changes

**Important**:
- Update driver immediately
- Check if time calculations need adjustment
- Document reason for change

## Troubleshooting Guide

### Problem: "No previous appointments available"

**Possible Causes**:
- Patient has no completed appointments
- Previous appointment has no patient location
- Appointment is in the future

**Solutions**:
- Check patient's appointment history
- Verify previous appointment has patient location
- Use "From Office" or "From Custom Location" instead

### Problem: "Metro station not found"

**Possible Causes**:
- Metro station not configured in system
- Metro station is inactive
- Network connectivity issues

**Solutions**:
- Contact system administrator
- Use "From Custom Location" with metro station address
- Use "From Office" as fallback

### Problem: "Invalid address"

**Possible Causes**:
- Address format is incorrect
- Address is not geocodable
- Network connectivity issues

**Solutions**:
- Try more specific address format
- Include city and state/province
- Use landmarks or nearby businesses
- Contact patient for clarification

### Problem: "Pickup and patient locations are the same"

**Possible Causes**:
- Data entry error
- Wrong pickup location selected
- Should be "Stay with Staff" segment

**Solutions**:
- Verify patient location is correct
- Check if pickup location should be different
- Consider if this is actually a "Stay with Staff" segment

### Problem: "Time calculation incorrect"

**Possible Causes**:
- Buffer time too short
- Travel time estimate wrong
- Appointment time changed

**Solutions**:
- Check buffer time settings
- Verify travel time calculations
- Review appointment start times
- Check for manual overrides

## Best Practices

### 1. Choose the Right Pickup Type

**Priority Order**:
1. **From Previous Appointment** - If available and makes sense
2. **From Office** - Default choice for first appointments
3. **From Metro Station** - For public transit integration
4. **From Custom Location** - Only when others don't apply

### 2. Time Management

**Buffer Time Guidelines**:
- Standard appointments: 20 minutes
- Complex locations: 30 minutes
- Rush hour: 40 minutes
- Weather concerns: 30+ minutes

**Travel Time Considerations**:
- Use system estimates as starting point
- Adjust for traffic patterns
- Consider driver experience with area
- Factor in weather conditions

### 3. Location Accuracy

**Address Entry**:
- Use complete addresses
- Include city and state/province
- Verify with patient if unsure
- Use landmarks for reference

**Validation**:
- Check coordinates are reasonable
- Verify address exists
- Test with map view
- Confirm with patient

### 4. Driver Communication

**Clear Instructions**:
- Provide specific pickup location
- Include helpful landmarks
- Mention any special requirements
- Give contact information

**Timing**:
- Notify driver of pickup time
- Allow buffer for unexpected delays
- Confirm driver availability
- Update if changes occur

### 5. System Usage

**Efficiency Tips**:
- Use templates for common scenarios
- Batch similar appointments
- Leverage previous appointment data
- Monitor system performance

**Quality Control**:
- Double-check all information
- Verify time calculations
- Confirm driver assignments
- Review before saving

## Assessment Quiz

### Question 1: Pickup Location Types
Which pickup location type should you use when a driver is starting their first appointment of the day?

A) From Previous Appointment
B) From Office
C) From Metro Station
D) From Custom Location

**Answer**: B) From Office

### Question 2: Previous Appointment
When using "From Previous Appointment", what information do you need to provide?

A) Just select the previous appointment
B) Enter the previous appointment's address manually
C) Select the previous appointment and verify the location
D) Contact the patient for the address

**Answer**: C) Select the previous appointment and verify the location

### Question 3: Time Calculation
How is the pickup time calculated?

A) Appointment start time + travel time
B) Appointment start time - travel time - buffer time
C) Appointment start time + buffer time
D) Travel time + buffer time

**Answer**: B) Appointment start time - travel time - buffer time

### Question 4: Custom Location
When should you use "From Custom Location"?

A) For any pickup location
B) Only when other types don't apply
C) For metro station pickups
D) For office pickups

**Answer**: B) Only when other types don't apply

### Question 5: Validation
What happens if you select "From Previous Appointment" but no previous appointments are available?

A) System creates the segment anyway
B) System shows an error message
C) System automatically uses "From Office"
D) System requires manual address entry

**Answer**: B) System shows an error message

## Training Checklist

### Basic Understanding
- [ ] Understand the four pickup location types
- [ ] Know when to use each type
- [ ] Can explain the new terminology
- [ ] Understand time calculation logic

### Practical Skills
- [ ] Can create transportation segments
- [ ] Can select appropriate pickup location types
- [ ] Can enter addresses correctly
- [ ] Can assign drivers
- [ ] Can review and save segments

### Troubleshooting
- [ ] Can identify common issues
- [ ] Knows how to resolve problems
- [ ] Can use fallback options
- [ ] Knows when to ask for help

### Best Practices
- [ ] Follows proper workflow
- [ ] Uses appropriate pickup types
- [ ] Validates information
- [ ] Communicates clearly
- [ ] Documents issues

## Support Resources

### Documentation
- [Dispatcher Guide](./dispatcher-pickup-location-guide.md)
- [API Documentation](./transportation-segments-api.md)
- [Migration Guide](./transportation-segments-migration-guide.md)

### Contact Information
- **Technical Support**: [Your technical support contact]
- **Training Support**: [Your training support contact]
- **Emergency Escalation**: [Your emergency contact]

### Additional Resources
- [Video Tutorials](#) - Coming soon
- [Interactive Training](#) - Coming soon
- [FAQ](#) - Coming soon

---

*Last updated: [Current Date]*
*Version: 1.0*

