# Dispatcher Training Materials: Driver Assignment Overhaul

## Overview

This comprehensive training material is designed to help dispatchers learn and master the new Driver Assignment Overhaul system, including assignment modes, capacity planning, assistive assignment engine, and enhanced transportation segments workflow.

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Assignment Modes](#assignment-modes)
3. [Capacity Planner Dashboard](#capacity-planner-dashboard)
4. [Assistive Assignment Engine](#assistive-assignment-engine)
5. [Pickup Location Types](#pickup-location-types)
6. [Step-by-Step Workflows](#step-by-step-workflows)
7. [Common Scenarios](#common-scenarios)
8. [Escalation Management](#escalation-management)
9. [Analytics and Reporting](#analytics-and-reporting)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Best Practices](#best-practices)
12. [Assessment Quiz](#assessment-quiz)

## Quick Start Guide

### What You Need to Know

**New Assignment Modes**:
- **Assign Now**: Driver must be selected immediately (traditional workflow)
- **Assign Later**: Driver can be assigned later, segment goes to unassigned queue

**Enhanced Terminology**:
- **Pickup Location**: Where the driver picks up the patient (was "origin")
- **Patient Location**: Where the patient is going (was "destination")
- **Pickup Location Type**: How you specify the pickup location
- **Unassigned Queue**: Segments waiting for driver assignment
- **Capacity Planner**: Dashboard for managing driver assignments and capacity

**Four Pickup Location Types**:
1. **From Office** - Driver starts from office
2. **From Previous Appointment** - Driver continues from previous appointment
3. **From Metro Station** - Driver picks up from metro station
4. **From Custom Location** - Driver picks up from any address

### 5-Minute Quick Start

1. **Create Appointment with Assignment Mode**
   - Go to appointment creation
   - Select transportation type as "driver"
   - Choose assignment mode: "Assign Now" or "Assign Later"
   - If "Assign Later", appointment can be saved without driver

2. **Create Transportation Segments**
   - System auto-creates pickup/dropoff segments for driver transportation
   - Segments inherit assignment mode from appointment
   - "Assign Now" segments require immediate driver selection
   - "Assign Later" segments go to unassigned queue

3. **Use Capacity Planner (for Assign Later)**
   - Access via navigation menu or dashboard
   - View unassigned queue with priority indicators
   - Drag segments to driver lanes for assignment
   - Use driver recommendations for optimal assignment

4. **Review and Save**
   - Check calculated pickup time
   - Review driver recommendations if available
   - Save appointment and segments

## Assignment Modes

### Assign Now Mode

**When to Use**:
- Immediate driver assignment required
- Same-day or urgent appointments
- When you know the driver availability
- Simple single-driver scenarios

**How It Works**:
1. Select "Assign Now" in appointment form
2. System requires driver selection before saving
3. Segments are created with "scheduled" status
4. Driver receives immediate notifications
5. Calendar events are created immediately

**Benefits**:
- Immediate confirmation of driver availability
- No backlog of unassigned segments
- Traditional workflow familiar to users
- Clear driver responsibility from start

### Assign Later Mode

**When to Use**:
- Future appointments (24+ hours ahead)
- Complex multi-driver scenarios
- When driver availability is uncertain
- Bulk appointment creation
- When you want to review options

**How It Works**:
1. Select "Assign Later" in appointment form
2. System allows saving without driver selection
3. Segments are created with "draft" status
4. Segments appear in unassigned queue
5. Drivers assigned later via capacity planner

**Benefits**:
- Flexible scheduling workflow
- Better capacity planning
- Reduced appointment creation time
- Ability to optimize assignments later
- Support for complex scenarios

### Assignment Mode Selection Guidelines

**Choose Assign Now When**:
- Appointment is today or tomorrow
- You have confirmed driver availability
- Simple pickup/dropoff scenario
- Patient requires immediate confirmation

**Choose Assign Later When**:
- Appointment is 24+ hours in future
- Multiple drivers might be involved
- You want to review driver options
- Creating multiple appointments at once
- Driver availability is uncertain

## Capacity Planner Dashboard

### Overview

The Capacity Planner Dashboard is your central hub for managing driver assignments and monitoring system capacity. It provides a comprehensive view of driver availability, unassigned segments, and system insights.

### Dashboard Layout

**Three-Pane Layout**:
1. **Driver Lanes** (Left) - Shows assigned segments per driver
2. **Unassigned Queue** (Center) - Shows segments waiting for assignment
3. **Insights Panel** (Right) - Shows metrics and analytics

### Driver Lanes

**What You See**:
- Each driver has a vertical timeline lane
- Segments appear as colored cards with timing
- Color coding indicates segment type and status
- Travel gaps between segments are visible
- Overtime warnings for overloaded drivers

**Actions Available**:
- Drag segments between drivers
- Click segments to edit or reassign
- View driver availability and conflicts
- Update segment status inline
- Access driver contact information

### Unassigned Queue

**Queue Organization**:
- Segments grouped by priority (Critical, High, Medium, Low)
- Time-based grouping (Today, Tomorrow, This Week)
- Escalation indicators for urgent segments
- Service line filtering options

**Queue Features**:
- Priority scoring based on urgency and escalation
- Visual indicators for segments approaching deadlines
- Filtering by transport mode, service line, or geography
- Search functionality for specific segments

**Drag-and-Drop Assignment**:
- Drag segments from queue to driver lanes
- Visual feedback during drag operations
- Automatic conflict detection
- Override options for scheduling conflicts

### Insights Panel

**Key Metrics**:
- Driver utilization percentages
- Assignment backlog counts
- Override rates and common reasons
- Cost and efficiency metrics
- Today's activity summary

**Performance Indicators**:
- Color-coded status indicators
- Performance targets tracking
- System health monitoring
- Actionable recommendations

### Time Window Controls

**Available Windows**:
- 12 hours (current shift)
- 24 hours (today)
- 48 hours (today + tomorrow)
- 72 hours (3-day view)
- 7 days (weekly view)
- Custom date range

**Window Selection**:
- Use dropdown to select time window
- View updates automatically
- Maintains current date context
- Supports future date navigation

## Assistive Assignment Engine

### Overview

The Assistive Assignment Engine provides intelligent driver recommendations based on multiple factors including travel feasibility, availability, specialization, and preferences.

### Driver Scoring Algorithm

**Scoring Factors**:
1. **Travel Feasibility (35%)** - Distance, time, and route efficiency
2. **Availability (30%)** - Schedule conflicts and buffer time
3. **Specialization (20%)** - Staff type and skill matching
4. **Preferences (15%)** - Working hours and historical performance

**Score Range**: 0-100 points
- 90-100: Excellent match
- 80-89: Good match
- 70-79: Acceptable match
- 60-69: Poor match
- Below 60: Not recommended

### Recommendation Display

**Driver Cards Show**:
- Overall score with color coding
- Individual factor scores
- Availability status
- Specialization match
- Travel time estimate
- Conflict warnings

**Recommendation Tags**:
- "Closest Next Leg" - Optimal for travel efficiency
- "Metro Feasible" - Public transport alternative available
- "No Buffer" - Tight scheduling, high risk
- "Specialized" - Perfect skill match
- "Preferred" - Matches driver preferences

### Override System

**When to Override**:
- Patient has specific driver preference
- Schedule conflict requires manual resolution
- Public transport chosen over driver
- Vehicle mismatch (size, accessibility)
- Other operational considerations

**Override Process**:
1. Select non-recommended driver
2. Choose override reason from predefined list
3. Add optional notes explaining decision
4. System records override for analytics
5. Assignment proceeds with override logged

**Override Reasons**:
- Patient preference
- Schedule conflict
- Public transport chosen
- Vehicle mismatch
- Driver request
- Operational requirement
- Other (with note)

### Recommendation Metadata

**What's Stored**:
- Original recommendation scores
- Override reason and notes
- Assignment decision timestamp
- User who made the decision
- Follow-up requirements

**Analytics Benefits**:
- Track override patterns
- Identify system improvement opportunities
- Monitor recommendation accuracy
- Support training and optimization

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

### Scenario G: Assign Later Workflow
- Create appointment with "Assign Later" mode
- System creates segments in "draft" status
- Segments appear in unassigned queue
- Use capacity planner to assign drivers later
- System sends notifications when drivers are assigned

### Scenario H: Driver Recommendation Override
- System suggests Driver A with 85% score
- Patient requests Driver B specifically
- Select Driver B and choose "Patient preference" override reason
- Add note: "Patient specifically requested Driver B"
- System logs override for analytics

### Scenario I: Escalation Alert
- Segment approaching 6-hour deadline
- System highlights segment in red in unassigned queue
- Dispatcher receives escalation alert
- Must assign driver or escalate to duty manager
- System tracks escalation response time

---

## Escalation Management

### Six-Hour Escalation Rule

**When Escalation Occurs**:
- Segments unassigned 6 hours before planned start time
- System automatically creates escalation alerts
- Visual indicators appear in capacity planner
- Duty manager receives notifications for critical escalations

**Escalation Severity Levels**:
- **Critical**: 2+ hours past deadline
- **High**: 1-2 hours past deadline
- **Medium**: 30 minutes to 1 hour past deadline
- **Low**: Approaching deadline (within 6 hours)

### Escalation Response Process

**Immediate Actions**:
1. Review escalated segment in capacity planner
2. Check driver availability and recommendations
3. Assign driver or find alternative solution
4. Acknowledge escalation alert
5. Update segment status

**If No Driver Available**:
1. Escalate to duty manager
2. Consider alternative transport modes
3. Contact patient to reschedule if necessary
4. Document resolution in system
5. Update escalation status

### Escalation Monitoring

**Dashboard Indicators**:
- Red highlighting for critical escalations
- Orange highlighting for high priority
- Yellow highlighting for medium priority
- Count badges showing escalation volume
- Response time tracking

**Duty Manager Notifications**:
- Telegram alerts for critical escalations
- Email summaries for escalation patterns
- Dashboard access for escalation management
- Escalation resolution tracking

### Escalation Analytics

**Key Metrics**:
- Total escalations by day/week/month
- Average response time to escalations
- Escalation resolution rate
- Common escalation causes
- Driver availability patterns

**Performance Targets**:
- < 5% of segments escalate
- < 30 minutes average response time
- > 95% escalation resolution rate
- < 2% critical escalations

## Analytics and Reporting

### Metrics Dashboard

**Real-Time Metrics**:
- Driver utilization percentages
- Assignment backlog counts
- Override rates and reasons
- Escalation volume and response times
- Cost and efficiency metrics

**Performance Indicators**:
- Color-coded status indicators (Green/Yellow/Red)
- Performance targets tracking
- System health monitoring
- Actionable recommendations

### Key Performance Indicators (KPIs)

**Assignment Efficiency**:
- Average time from creation to assignment
- Percentage of appointments saved without forced driver
- Assignment mode distribution (Assign Now vs Assign Later)
- Driver recommendation acceptance rate

**System Performance**:
- Override rate (target: < 30%)
- Escalation rate (target: < 5%)
- User satisfaction score (target: > 4.0/5.0)
- System uptime (target: > 99.9%)

**Cost and Efficiency**:
- Driver utilization percentage
- Public transport usage rate
- Cost savings from optimized assignments
- Travel time reduction

### Export and Reporting

**Export Formats**:
- CSV for spreadsheet analysis
- JSON for system integration
- PDF for leadership reports
- Real-time dashboard views

**Report Types**:
- Daily assignment summary
- Weekly performance report
- Monthly analytics overview
- Custom date range reports

**Leadership Summaries**:
- Executive dashboard with key metrics
- Performance target tracking
- System health status
- Actionable recommendations
- Trend analysis and insights

### Analytics Integration

**Data Sources**:
- Assignment decisions and timing
- Override reasons and patterns
- Escalation events and responses
- Driver performance metrics
- User interaction data

**Analytics Benefits**:
- Identify optimization opportunities
- Track system improvement over time
- Support data-driven decisions
- Monitor user adoption and satisfaction
- Guide future feature development

---

## Best Practices

### 1. Choose the Right Assignment Mode

**Assign Now Guidelines**:
- Use for same-day or urgent appointments
- When driver availability is confirmed
- For simple single-driver scenarios
- When patient requires immediate confirmation

**Assign Later Guidelines**:
- Use for future appointments (24+ hours ahead)
- When creating multiple appointments
- For complex multi-driver scenarios
- When you want to review driver options

### 2. Capacity Planner Best Practices

**Daily Workflow**:
- Start each day by reviewing unassigned queue
- Check escalation alerts and prioritize urgent segments
- Use driver recommendations as starting point
- Review driver utilization before assignments
- Monitor travel gaps and overtime warnings

**Assignment Strategy**:
- Drag segments to driver lanes for visual confirmation
- Use override reasons when deviating from recommendations
- Consider driver specialization and preferences
- Balance workload across all drivers
- Plan for travel time between segments

### 3. Driver Recommendation Usage

**When to Follow Recommendations**:
- High-scoring drivers (80+ points)
- No conflicts or special requirements
- Standard pickup/dropoff scenarios
- When efficiency is the primary goal

**When to Override Recommendations**:
- Patient has specific driver preference
- Driver has specialized skills needed
- Schedule conflicts require manual resolution
- Public transport is more appropriate
- Vehicle requirements (size, accessibility)

### 4. Escalation Management

**Prevention**:
- Monitor unassigned queue regularly
- Assign drivers well before 6-hour deadline
- Use capacity planner for proactive planning
- Set up alerts for approaching deadlines

**Response**:
- Acknowledge escalation alerts immediately
- Check driver availability and recommendations
- Escalate to duty manager if no solution
- Document resolution and lessons learned

### 5. Choose the Right Pickup Type

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

### Question 1: Assignment Modes
When should you use "Assign Later" mode for an appointment?

A) For same-day urgent appointments
B) For future appointments (24+ hours ahead)
C) When driver availability is confirmed
D) For simple single-driver scenarios

**Answer**: B) For future appointments (24+ hours ahead)

### Question 2: Capacity Planner
What does the unassigned queue show in the capacity planner?

A) All segments assigned to drivers
B) Segments waiting for driver assignment
C) Completed segments
D) Cancelled segments

**Answer**: B) Segments waiting for driver assignment

### Question 3: Driver Recommendations
What score range indicates an excellent driver match?

A) 60-69 points
B) 70-79 points
C) 80-89 points
D) 90-100 points

**Answer**: D) 90-100 points

### Question 4: Escalation Management
When do segments escalate to require urgent attention?

A) 12 hours before planned start time
B) 6 hours before planned start time
C) 2 hours before planned start time
D) 1 hour before planned start time

**Answer**: B) 6 hours before planned start time

### Question 5: Override System
When should you override a driver recommendation?

A) Never, always follow recommendations
B) When patient has specific driver preference
C) Only for high-scoring drivers
D) Only for same-day appointments

**Answer**: B) When patient has specific driver preference

### Question 6: Pickup Location Types
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
- [ ] Understand assignment modes (Assign Now vs Assign Later)
- [ ] Know when to use each assignment mode
- [ ] Understand capacity planner dashboard layout
- [ ] Know how driver scoring algorithm works
- [ ] Understand escalation management process
- [ ] Can explain the new terminology
- [ ] Understand time calculation logic

### Practical Skills
- [ ] Can create appointments with assignment modes
- [ ] Can use capacity planner dashboard
- [ ] Can drag and drop segments to driver lanes
- [ ] Can interpret driver recommendations
- [ ] Can override recommendations with proper reasons
- [ ] Can manage escalation alerts
- [ ] Can create transportation segments
- [ ] Can select appropriate pickup location types
- [ ] Can enter addresses correctly
- [ ] Can assign drivers
- [ ] Can review and save segments

### Advanced Features
- [ ] Can use analytics dashboard
- [ ] Can export reports and metrics
- [ ] Can interpret performance indicators
- [ ] Can manage vendor notifications
- [ ] Can handle multi-leg transportation scenarios
- [ ] Can use time window controls effectively

### Troubleshooting
- [ ] Can identify common issues
- [ ] Knows how to resolve problems
- [ ] Can use fallback options
- [ ] Can handle escalation scenarios
- [ ] Can resolve driver conflicts
- [ ] Knows when to ask for help

### Best Practices
- [ ] Follows proper workflow
- [ ] Uses appropriate assignment modes
- [ ] Uses appropriate pickup types
- [ ] Validates information
- [ ] Communicates clearly
- [ ] Documents issues and overrides
- [ ] Monitors escalation alerts
- [ ] Balances driver workload

## Support Resources

### Documentation
- [Dispatcher Guide](./dispatcher-pickup-location-guide.md)
- [Driver Operations Guide](../Driver-Operations-Guide.md)
- [Rollout Strategy Guide](../DRIVER_ASSIGNMENT_OVERHAUL_ROLLOUT.md)
- [API Documentation](./transportation-segments-api.md)
- [Migration Guide](./transportation-segments-migration-guide.md)
- [Capacity Planner Guide](./capacity-planner-guide.md)
- [Analytics Dashboard Guide](./analytics-dashboard-guide.md)

### Training Materials
- [Video Tutorials](#) - Coming soon
- [Interactive Training](#) - Coming soon
- [FAQ](#) - Coming soon
- [Quick Reference Cards](#) - Coming soon

### Contact Information
- **Technical Support**: [Your technical support contact]
- **Training Support**: [Your training support contact]
- **Emergency Escalation**: [Your emergency contact]

---

*Last updated: [Current Date]*
*Version: 2.0 - Driver Assignment Overhaul*
