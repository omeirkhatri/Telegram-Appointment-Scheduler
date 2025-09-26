# PRD: Updated Transportation Segments for Home Healthcare

## 1. Problem Statement
The current transportation segments implementation is overly complex for home healthcare operations. The existing system uses confusing "origin" and "destination" terminology that doesn't match how home healthcare actually works. Staff travel TO patient locations, not pick up patients. The current UI is confusing dispatchers and doesn't reflect the actual workflow.

## 2. Goals and Non-Goals
- **Goals**
  - Simplify transportation segments to match home healthcare workflow
  - Use clear terminology: "Pickup Location" (where staff starts) and "Patient Location" (where staff goes)
  - Provide simple pickup location options: Office, Previous Appointment, Metro Station, or Custom
  - Calculate travel time from pickup location to patient location
  - Maintain existing calendar, Telegram notifications, and driver assignment features
- **Non-Goals**
  - Complex multi-segment transportation workflows
  - Patient pickup scenarios (we provide care at patient locations)
  - Real-time GPS tracking or route optimization
  - Replacing manual dispatcher contact with drivers

## 3. Target Users
- **Dispatchers**: Create simple transportation segments with clear pickup locations and patient destinations
- **Drivers**: Receive accurate instructions for traveling to patient locations
- **Operations Managers**: Review driver utilization and travel efficiency

## 4. Current State Summary
- Transportation segments are implemented but use confusing "origin/destination" terminology
- UI shows "Origin Location" and "Destination Location" fields that don't match home healthcare workflow
- Staff travel TO patients, not pick up patients
- Existing calendar, Telegram, and driver assignment features work but need terminology updates

## 5. Proposed Solution Overview
Simplify the transportation segments to match home healthcare operations:
- Replace "Origin/Destination" with "Pickup Location/Patient Location"
- Provide simple pickup location options: Office, Previous Appointment, Metro Station, Custom
- Calculate travel time from pickup location to patient location
- Maintain existing backend functionality with updated terminology

## 6. Detailed Requirements

### 6.1 Terminology Updates
- **Pickup Location**: Where the staff member starts their journey
- **Patient Location**: Where the staff member goes (the appointment location)
- **Pickup Time**: When staff should leave pickup location
- **Arrival Time**: When staff should arrive at patient location (appointment start time)

### 6.2 Pickup Location Options
**Pickup Location Type** (radio buttons):
- **"From Office"**: Staff starts at office location
  - No additional location input needed (system knows office address)
  - Calculate travel time from office to patient location
- **"From Previous Appointment"**: Staff starts from previous appointment location
  - Show dropdown of previous appointments to select from
  - Calculate travel time from previous appointment to current patient location
- **"From Metro Station"**: Staff starts from metro station
  - Show metro station selector
  - Calculate travel time from metro station to patient location
- **"From Custom Location"**: Staff starts from custom location
  - Show location search field
  - Calculate travel time from custom location to patient location

### 6.3 Time Calculation Logic
- **Patient Location**: Pre-filled from appointment (read-only)
- **Appointment Start Time**: When staff should arrive at patient location
- **Travel Time**: Calculated from pickup location to patient location
- **Pickup Time**: Appointment Start Time - Travel Time - Buffer Time
- **Buffer Time**: Configurable buffer (default 20 minutes)

### 6.4 UI Updates
- Replace "Origin Location" → **"Pickup Location"**
- Replace "Destination Location" → **"Patient Location"** (pre-filled, read-only)
- Add **"Pickup Location Type"** radio buttons
- Show **"Calculated Pickup Time"** (read-only, calculated)
- Show **"Travel Time Estimate"** with recalculate button
- Show **"Buffer Warning"** if buffer is below recommended 20 minutes

### 6.5 Backend Updates
- Update database column names and UI labels
- Maintain existing API endpoints with updated field names
- Keep existing calendar and Telegram integration
- Update validation to use new terminology
- Maintain backward compatibility where possible

## 7. Implementation Plan

### Phase 1: Terminology Updates
1. Update database column names and UI labels
2. Update API endpoints with new field names
3. Update validation schemas
4. Update documentation

### Phase 2: UI Simplification
1. Replace origin/destination fields with pickup/patient location
2. Add pickup location type radio buttons
3. Add conditional fields based on pickup type
4. Update time calculation logic
5. Add buffer warnings

### Phase 3: Testing and Rollout
1. Test with existing data
2. Update user documentation
3. Train dispatchers on new terminology
4. Monitor for any issues

## 8. Success Metrics
- 90% of dispatchers understand the new terminology within one week
- 50% reduction in dispatcher questions about transportation segments
- 95% of transportation segments use the simplified pickup location options
- Positive feedback from dispatchers regarding clarity

## 9. Risks & Mitigations
- **Confusion during transition** → Provide clear documentation and training
- **Data migration issues** → Test thoroughly with existing data
- **User resistance** → Show benefits of simplified workflow
- **Backend compatibility** → Maintain API backward compatibility

## 10. Rollout Considerations
- Update terminology gradually to avoid confusion
- Provide training materials and documentation
- Test with small group of dispatchers first
- Monitor for any issues or confusion
- Gather feedback and make adjustments

## 11. Open Questions
- Should we maintain backward compatibility with old field names?
- How should we handle existing transportation segments with old terminology?
- Should we provide a migration tool for existing data?
- How long should we maintain both old and new terminology?

## 12. Next Steps
1. **Update Database Schema**: Rename columns and update constraints
2. **Update API Endpoints**: Change field names and validation
3. **Update UI Components**: Replace origin/destination with pickup/patient
4. **Update Documentation**: Create user guides with new terminology
5. **Test and Deploy**: Thorough testing before rollout
6. **Train Users**: Provide training materials and support

## 13. Progress Notes
*This PRD will be updated as implementation progresses and feedback is received from users.*
