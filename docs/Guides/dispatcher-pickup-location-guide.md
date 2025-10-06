# Dispatcher Guide: Pickup Location Types

## Overview

This guide explains how to use the new pickup location type system when creating transportation segments. The system provides four different ways to specify where a driver should pick up a patient, each designed for different scenarios.

## Pickup Location Types

### 1. From Office

**When to use**: When the driver should start from the main office location.

**How to use**:
1. Select "From Office" in the pickup location type selector
2. The system will automatically use the configured office address
3. No additional reference is needed

**Benefits**:
- Consistent starting point for all drivers
- Easy to track and manage
- Reduces confusion about pickup locations

**Example scenarios**:
- First appointment of the day
- Driver starting their shift
- Standard pickup from office

### 2. From Previous Appointment

**When to use**: When the driver should pick up the patient from where they were dropped off at a previous appointment.

**How to use**:
1. Select "From Previous Appointment" in the pickup location type selector
2. Choose the previous appointment from the dropdown list
3. The system will automatically use the patient location from that appointment
4. The pickup location reference will be set to the previous appointment ID

**Benefits**:
- Seamless transitions between appointments
- Reduces travel time and fuel costs
- Better driver efficiency

**Example scenarios**:
- Multiple appointments for the same patient
- Driver continuing from previous patient location
- Chained appointments in the same area

**Requirements**:
- Previous appointment must exist
- Previous appointment must have a patient location
- Previous appointment should be completed or in progress

### 3. From Metro Station

**When to use**: When the driver should pick up the patient from a designated metro station.

**How to use**:
1. Select "From Metro Station" in the pickup location type selector
2. Choose the metro station from the dropdown list
3. The system will use the metro station's address and coordinates
4. The pickup location reference will be set to the metro station ID

**Benefits**:
- Standardized pickup points
- Easy to coordinate with public transportation
- Reduces confusion about exact pickup locations

**Example scenarios**:
- Patient using public transportation to reach pickup point
- Centralized pickup locations for multiple patients
- Integration with public transit schedules

**Requirements**:
- Metro station must be configured in the system
- Metro station must have valid address and coordinates

### 4. From Custom Location

**When to use**: When the pickup location is a specific address or landmark not covered by the other types.

**How to use**:
1. Select "From Custom Location" in the pickup location type selector
2. Enter the address in the location search field
3. Select the correct address from the search results
4. Optionally add landmark information for easier identification

**Benefits**:
- Maximum flexibility for unique situations
- Can handle any address or location
- Useful for special circumstances

**Example scenarios**:
- Patient's home address
- Specific landmark or building
- Temporary pickup locations
- Special events or locations

**Requirements**:
- Valid address must be provided
- Address must be geocodable (have valid coordinates)
- Clear instructions should be provided if needed

## Best Practices

### Choosing the Right Pickup Type

1. **Start with the most specific type**: If you know the previous appointment, use "From Previous Appointment"
2. **Use office as default**: When in doubt, "From Office" is usually the safest choice
3. **Metro stations for public transit**: Use when patients are using public transportation
4. **Custom for unique situations**: Only use when other types don't apply

### Location Reference Requirements

- **From Office**: No reference needed
- **From Previous Appointment**: Must select a valid previous appointment
- **From Metro Station**: Must select a configured metro station
- **From Custom Location**: Must provide a valid address

### Validation Rules

The system will validate your selections:

- **Previous Appointment**: Must exist and have a patient location
- **Metro Station**: Must be configured in the system
- **Custom Location**: Must be a valid, geocodable address
- **All Types**: Pickup location must be different from patient location

## Common Issues and Solutions

### Issue: "No previous appointments available"
**Solution**:
- Check if the patient has any completed appointments
- Verify the previous appointment has a patient location
- Consider using "From Office" or "From Custom Location" instead

### Issue: "Metro station not found"
**Solution**:
- Contact system administrator to configure metro stations
- Use "From Custom Location" with the metro station address
- Use "From Office" as a fallback

### Issue: "Invalid address"
**Solution**:
- Try a more specific address format
- Include city and state/province
- Use landmarks or nearby businesses for reference
- Contact the patient for clarification

### Issue: "Pickup and patient locations are the same"
**Solution**:
- This usually indicates a data entry error
- Verify the patient location is correct
- Check if the pickup location should be different
- Consider if this is actually a "Stay with Staff" segment instead

## Training Checklist

- [ ] Understand the four pickup location types
- [ ] Know when to use each type
- [ ] Can select appropriate previous appointments
- [ ] Can search and select metro stations
- [ ] Can enter custom addresses correctly
- [ ] Understand validation requirements
- [ ] Know how to troubleshoot common issues
- [ ] Can explain the system to drivers

## Support

If you encounter issues not covered in this guide:

1. Check the system status and error messages
2. Contact your supervisor or system administrator
3. Use the fallback options (From Office or From Custom Location)
4. Document the issue for system improvement

## Updates

This guide will be updated as the system evolves. Check for updates regularly and provide feedback on any issues or improvements needed.

---

*Last updated: [Current Date]*
*Version: 1.0*

