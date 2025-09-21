# Product Requirements Document: Day Calendar Map View

## 1. Overview

### 1.1 Purpose
This PRD outlines the implementation of a map view for the Day Calendar in the Best DOC appointment scheduling system. The map view will display appointments geographically on a Google Maps interface, allowing caregivers and admins to visualize their daily schedule spatially and navigate between locations efficiently.

### 1.2 Scope
- **Feature**: Interactive map view for day calendar only (not week/month views)
- **Target Users**: Caregivers and Admins
- **Platform**: Web application (mobile-friendly for caregivers, desktop-friendly for admins)
- **Integration**: Google Maps JavaScript API with custom markers

### 1.3 Success Metrics
- Reduced travel time between appointments through spatial visualization
- Improved appointment scheduling efficiency
- Enhanced user experience for location-based appointment management
- 90%+ geocoding success rate for patient addresses

## 2. User Stories

### 2.1 Primary User Stories

**As a Caregiver, I want to:**
- View my daily appointments on a map so I can plan my travel route efficiently
- See appointment times and locations directly on map markers so I don't need to switch between views
- Navigate between different dates to see upcoming appointments geographically
- Click on map markers to see detailed appointment information
- Use this on my mobile device while traveling between appointments

**As an Admin, I want to:**
- View all daily appointments on a map to understand geographic distribution
- See appointment density in different areas to optimize scheduling
- Navigate between dates to review past and future appointment patterns
- Access detailed appointment information through map interactions

### 2.2 Secondary User Stories

**As a System, I want to:**
- Automatically geocode patient addresses to coordinates
- Handle cases where geocoding fails gracefully
- Cache geocoded coordinates to improve performance
- Display appropriate error messages when map data is unavailable

## 3. Functional Requirements

### 3.1 Map View Display

**FR-1: Map Initialization**
- The map view shall initialize with Google Maps JavaScript API
- The map shall be centered on Dubai, UAE (coordinates: 25.276987, 55.296249)
- The map shall have a default zoom level of 12
- The map shall be responsive and work on both desktop and mobile devices

**FR-2: Custom Markers**
- Each appointment shall be displayed as a custom marker on the map
- Markers shall display appointment time (e.g., "7:00 AM")
- Markers shall display location name (e.g., "Palm Jumeirah", "Barsha")
- Markers shall display patient name
- Markers shall be color-coded by appointment type:
  - Doctor on Call: Blue
  - Lab Test: Green
  - Teleconsultation: Purple
  - Physiotherapy: Orange
  - Caregiver: Red
  - IV Therapy: Yellow

**FR-3: Marker Interactions**
- Clicking a marker shall display an info window with:
  - Patient name and phone number
  - Appointment type and time
  - Full address
  - Notes (if available)
  - Action buttons (Edit, View Details, Navigate)
- Markers shall be accessible via keyboard navigation
- Markers shall have appropriate ARIA labels for screen readers

### 3.2 Date Navigation

**FR-4: Date Controls**
- The map view shall include left/right arrow buttons for date navigation
- The map view shall include a date picker for quick date selection
- The map view shall display the current selected date prominently
- Date navigation shall update the map markers to show appointments for the selected date

**FR-5: Map Updates**
- When changing dates, existing markers shall be cleared
- New markers shall be added for appointments on the selected date
- Map shall smoothly transition between different date views
- Loading states shall be shown during map updates

### 3.3 Geocoding and Location Services

**FR-6: Address Geocoding**
- Patient addresses shall be automatically converted to coordinates using Google Geocoding API
- The system shall prioritize existing Google Maps links from patient records
- Fallback geocoding shall use the full address string (flat_villa_no + building_street + area + city)
- Geocoded coordinates shall be cached to reduce API calls

**FR-7: Error Handling**
- If geocoding fails, a default marker shall be placed at a central location
- Error messages shall be displayed for failed geocoding attempts
- The system shall retry geocoding with simplified address if initial attempt fails

### 3.4 Integration with Existing System

**FR-8: Calendar View Switching**
- Map view shall be available only in Day view mode
- A "Map" button shall be added to the existing view switcher (Month, Week, Day, Map)
- Switching to Map view shall maintain the currently selected date
- Switching away from Map view shall return to the previous calendar view

**FR-9: Data Integration**
- Map view shall use existing appointment data structure
- Map view shall use existing patient data including addresses and Google Maps links
- Map view shall respect existing appointment filters (staff, type, date range)
- Map view shall integrate with existing appointment CRUD operations

## 4. Technical Requirements

### 4.1 Google Maps API Integration

**TR-1: API Configuration**
- Google Maps JavaScript API shall be loaded with required libraries:
  - Maps JavaScript API
  - Geocoding API
  - Advanced Markers API
- API key shall be stored in environment variables
- API shall be loaded only when Map view is accessed

**TR-2: Performance Optimization**
- Map markers shall be clustered when appointments are in close proximity
- Geocoded coordinates shall be cached in local storage
- Map shall use lazy loading for better performance
- API calls shall be rate-limited to prevent quota exhaustion

### 4.2 Component Architecture

**TR-3: React Components**
- `AppointmentMapView` - Main map container component
- `MapMarker` - Custom marker component with appointment details
- `MapDateNavigation` - Date navigation controls for map view
- `GeocodingService` - Service for address to coordinate conversion
- `MapErrorBoundary` - Error handling for map failures

**TR-4: State Management**
- Map view shall use React hooks for state management
- Appointment data shall be fetched using existing services
- Geocoded coordinates shall be stored in component state
- Map view shall integrate with existing calendar state management

### 4.3 Data Flow

**TR-5: Data Processing**
- Appointments shall be filtered by selected date
- Patient addresses shall be geocoded in parallel
- Markers shall be created after successful geocoding
- Map shall update when appointment data changes

## 5. User Interface Requirements

### 5.1 Layout and Design

**UI-1: Map Container**
- Map shall occupy full available space in the calendar area
- Map shall be responsive and adapt to different screen sizes
- Map shall maintain aspect ratio on different devices

**UI-2: Navigation Controls**
- Date navigation shall be positioned at the top of the map
- Controls shall match existing calendar UI design
- Controls shall be accessible on both desktop and mobile

**UI-3: Marker Styling**
- Markers shall be visually distinct and easy to identify
- Marker text shall be readable at all zoom levels
- Markers shall have hover effects for better interactivity
- Markers shall be appropriately sized for mobile touch interaction

### 5.2 Responsive Design

**UI-4: Mobile Optimization**
- Map shall be touch-friendly on mobile devices
- Markers shall be appropriately sized for finger interaction
- Navigation controls shall be accessible on small screens
- Map shall work with mobile browser limitations

**UI-5: Desktop Enhancement**
- Map shall utilize full desktop screen real estate
- Additional information panels may be displayed on larger screens
- Keyboard shortcuts shall be available for power users

## 6. Non-Functional Requirements

### 6.1 Performance

**NFR-1: Load Time**
- Map view shall load within 3 seconds on average connection
- Initial map rendering shall complete within 1 second
- Marker updates shall complete within 500ms

**NFR-2: Scalability**
- Map shall handle up to 50 appointments per day without performance degradation
- Geocoding shall be batched to handle multiple addresses efficiently
- Caching shall reduce API calls by 80% after initial load

### 6.2 Reliability

**NFR-3: Error Handling**
- Map shall gracefully handle Google Maps API failures
- Geocoding failures shall not prevent map display
- Network connectivity issues shall be handled appropriately

**NFR-4: Data Consistency**
- Map data shall always reflect current appointment data
- Geocoded coordinates shall be validated before use
- Cache invalidation shall occur when patient addresses are updated

### 6.3 Accessibility

**NFR-5: Screen Reader Support**
- Map markers shall have appropriate ARIA labels
- Navigation controls shall be keyboard accessible
- Alternative text shall be provided for map elements

**NFR-6: Keyboard Navigation**
- All map interactions shall be accessible via keyboard
- Tab order shall be logical and intuitive
- Focus indicators shall be clearly visible

## 7. Dependencies

### 7.1 External Dependencies
- Google Maps JavaScript API
- Google Geocoding API
- React Google Maps API library (optional)

### 7.2 Internal Dependencies
- Existing appointment data structure
- Existing patient data structure
- Existing calendar component architecture
- Existing authentication and authorization system

## 8. Constraints

### 8.1 Technical Constraints
- Must work within existing Next.js 14 framework
- Must use existing Supabase database structure
- Must maintain existing TypeScript type safety
- Must follow existing Tailwind CSS design system

### 8.2 Business Constraints
- Google Maps API usage must stay within quota limits
- Feature must not impact existing calendar functionality
- Implementation must be completed within existing project timeline
- Must maintain existing user experience standards

## 9. Assumptions

### 9.1 Data Assumptions
- Patient addresses are generally accurate and geocodable
- Google Maps links in patient records are valid and current
- Appointment data includes all necessary location information

### 9.2 User Assumptions
- Users have basic familiarity with map interfaces
- Users primarily use the feature for daily appointment planning
- Mobile users will primarily use the feature while traveling

## 10. Risks and Mitigation

### 10.1 Technical Risks
- **Risk**: Google Maps API quota exhaustion
  - **Mitigation**: Implement caching and rate limiting
- **Risk**: Geocoding failures for some addresses
  - **Mitigation**: Implement fallback mechanisms and error handling
- **Risk**: Performance issues with many appointments
  - **Mitigation**: Implement marker clustering and lazy loading

### 10.2 User Experience Risks
- **Risk**: Users may find map view confusing
  - **Mitigation**: Provide clear navigation and help documentation
- **Risk**: Mobile performance may be poor
  - **Mitigation**: Optimize for mobile and test on various devices

## 11. Future Enhancements

### 11.1 Phase 2 Features
- Route optimization between appointments
- Real-time traffic integration
- Appointment clustering by location
- Export map view as image

### 11.2 Advanced Features
- Heat map visualization of appointment density
- Integration with navigation apps
- Real-time location tracking for caregivers
- Predictive scheduling based on location patterns

## 12. Acceptance Criteria

### 12.1 Functional Acceptance
- [ ] Map view displays appointments for selected date
- [ ] Custom markers show appointment time, location, and patient name
- [ ] Date navigation updates map markers correctly
- [ ] Geocoding works for 90%+ of patient addresses
- [ ] Map view integrates seamlessly with existing calendar

### 12.2 Performance Acceptance
- [ ] Map loads within 3 seconds
- [ ] Marker updates complete within 500ms
- [ ] Mobile performance is acceptable on standard devices
- [ ] API usage stays within quota limits

### 12.3 User Experience Acceptance
- [ ] Map view is intuitive for both caregivers and admins
- [ ] Mobile experience is fully functional
- [ ] Accessibility requirements are met
- [ ] Error handling provides clear feedback to users
