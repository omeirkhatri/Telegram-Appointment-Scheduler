# Tasks: Updated Transportation Segments for Home Healthcare

## Relevant Files

- `src/types/transportationSegment.ts` - Core type definitions for transportation segments
- `src/types/transportationSegment.test.ts` - Unit tests for transportation segment types
- `src/services/transportationSegmentService.ts` - Service layer for transportation segment operations
- `src/services/transportationSegmentService.test.ts` - Unit tests for transportation segment service
- `src/components/features/appointments/TransportationSegmentsDisplay.tsx` - UI component for displaying segments
- `src/components/features/appointments/TransportationSegmentsDisplay.test.tsx` - Unit tests for display component
- `src/components/features/appointments/AppointmentForm.tsx` - Form component for creating/editing appointments with segments
- `src/components/features/appointments/AppointmentForm.test.tsx` - Unit tests for appointment form
- `src/components/features/appointments/calendar/DriverSegmentsBoard.tsx` - Driver board for managing segments
- `src/components/features/appointments/calendar/DriverSegmentsBoard.test.tsx` - Unit tests for driver board
- `src/app/api/transportation-segments/route.ts` - API endpoints for transportation segments
- `src/app/api/transportation-segments/route.test.ts` - Unit tests for API endpoints
- `src/app/api/transportation-segments/calculate-route/route.ts` - Route calculation API
- `src/app/api/transportation-segments/calculate-route/route.test.ts` - Unit tests for route calculation
- `supabase/migrations/` - Database migration files for schema updates
- `src/lib/transportationSegmentsConfig.ts` - Configuration for transportation segments
- `src/lib/transportationSegmentsConfig.test.ts` - Unit tests for configuration
- `src/utils/transportationSegments.ts` - Utility functions for transportation segments
- `src/utils/transportationSegments.test.ts` - Unit tests for utility functions
- `src/utils/transportationSegmentsBackwardCompatibility.ts` - Backward compatibility utilities for API transition
- `src/app/api/transportation-segments/README.md` - Comprehensive API documentation
- `src/components/features/appointments/PickupLocationTypeSelector.tsx` - Component for selecting pickup location type
- `src/components/features/appointments/OfficeLocationSelector.tsx` - Component for office location selection
- `src/components/features/appointments/PreviousAppointmentSelector.tsx` - Component for previous appointment selection
- `src/components/features/appointments/MetroStationSelector.tsx` - Component for metro station selection
- `src/components/features/appointments/CustomLocationSelector.tsx` - Component for custom location selection
- `src/components/features/appointments/PickupLocationSelector.tsx` - Main pickup location selector component
- `src/utils/pickupLocationHelpers.ts` - Helper functions for pickup location data processing
- `src/utils/pickupLocationValidation.ts` - Validation utilities for pickup location requirements
- `src/hooks/usePickupLocationForm.ts` - Hook for managing pickup location form state
- `docs/Guides/dispatcher-pickup-location-guide.md` - User guide for dispatchers explaining pickup location types
- `docs/Guides/transportation-segments-migration-guide.md` - Migration guide for existing users
- `docs/Guides/transportation-segments-database-schema.md` - Database schema documentation
- `docs/Guides/dispatcher-training-materials.md` - Training materials for dispatchers
- `docs/Guides/transportation-segments-troubleshooting.md` - Troubleshooting guide for common issues

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Update Database Schema and Terminology
  - [x] 1.1 Create migration to rename `origin` column to `pickup_location` in transportation_segments table
  - [x] 1.2 Create migration to rename `destination` column to `patient_location` in transportation_segments table
  - [x] 1.3 Add new `pickup_location_type` column with enum values: 'office', 'previous_appointment', 'metro_station', 'custom'
  - [x] 1.4 Add new `pickup_location_reference` column to store reference ID for previous appointments or metro stations
  - [x] 1.5 Update existing data to map old origin/destination to new pickup/patient location structure
  - [x] 1.6 Add database constraints and indexes for new columns
  - [x] 1.7 Create rollback migration in case of issues

- [x] 2.0 Update Type Definitions and Service Layer
  - [x] 2.1 Update `TransportationSegmentLocation` interface to include new fields
  - [x] 2.2 Add `PickupLocationType` enum with values: 'office', 'previous_appointment', 'metro_station', 'custom'
  - [x] 2.3 Update `TransportationSegment` interface to use `pickup_location` and `patient_location` instead of `origin` and `destination`
  - [x] 2.4 Add `pickup_location_type` and `pickup_location_reference` fields to interfaces
  - [x] 2.5 Update `CreateTransportationSegment` and `UpdateTransportationSegment` interfaces
  - [x] 2.6 Update service methods in `TransportationSegmentService` to handle new field names
  - [x] 2.7 Add helper functions for pickup location type validation and processing
  - [x] 2.8 Update service methods to calculate pickup times based on appointment start time and travel time

- [x] 3.0 Update API Endpoints and Validation
  - [x] 3.1 Update POST `/api/transportation-segments` to accept new field names and pickup location types
  - [x] 3.2 Update PUT `/api/transportation-segments/[id]` to handle new field structure
  - [x] 3.3 Update GET endpoints to return data with new field names
  - [x] 3.4 Update validation functions to check pickup location type and reference fields
  - [x] 3.5 Update route calculation API to work with pickup/patient location terminology
  - [x] 3.6 Add validation for pickup location type-specific requirements (e.g., reference ID for previous appointments)
  - [x] 3.7 Update API response schemas and documentation
  - [x] 3.8 Add backward compatibility layer for existing API consumers

- [x] 4.0 Update UI Components for New Terminology
  - [x] 4.1 Update `TransportationSegmentsDisplay` component to show "Pickup Location" and "Patient Location" labels
  - [x] 4.2 Update `AppointmentForm` component to use new terminology in transportation segments section
  - [x] 4.3 Update `DriverSegmentsBoard` component to display new field names
  - [x] 4.4 Update `SegmentMarkers` component to use pickup/patient location terminology
  - [x] 4.5 Update all form labels and placeholders to use new terminology
  - [x] 4.6 Update status indicators and tooltips to reflect new workflow
  - [x] 4.7 Update error messages and validation feedback
  - [x] 4.8 Update component prop interfaces to use new field names

- [x] 5.0 Implement Pickup Location Type System
  - [x] 5.1 Create `PickupLocationTypeSelector` component with radio buttons for the four pickup types
  - [x] 5.2 Implement "From Office" option with office address lookup
  - [x] 5.3 Implement "From Previous Appointment" option with appointment dropdown
  - [x] 5.4 Implement "From Metro Station" option with metro station selector
  - [x] 5.5 Implement "From Custom Location" option with location search field
  - [x] 5.6 Add conditional rendering logic based on selected pickup type
  - [x] 5.7 Create helper functions to populate pickup location data based on type selection
  - [x] 5.8 Add validation for pickup location type-specific requirements
  - [x] 5.9 Update form state management to handle pickup location type changes

- [x] 6.0 Update Time Calculation Logic
  - [x] 6.1 Update travel time calculation to work with pickup location instead of origin
  - [x] 6.2 Implement pickup time calculation: Appointment Start Time - Travel Time - Buffer Time
  - [x] 6.3 Add configurable buffer time (default 20 minutes) with warning system
  - [x] 6.4 Update route calculation API calls to use pickup/patient location terminology
  - [x] 6.5 Add buffer time validation and warnings for insufficient buffer
  - [x] 6.6 Update time display components to show calculated pickup time
  - [x] 6.7 Add recalculate button for travel time estimates
  - [x] 6.8 Update calendar integration to use new time calculation logic

- [x] 7.0 Update Documentation and User Guides
  - [x] 7.1 Update technical documentation to reflect new terminology and field names
  - [x] 7.2 Create user guide for dispatchers explaining new pickup location types
  - [x] 7.3 Update API documentation with new field names and validation rules
  - [x] 7.4 Create migration guide for existing users
  - [x] 7.5 Update database schema documentation
  - [x] 7.6 Create training materials for dispatchers
  - [x] 7.7 Update inline help text and tooltips throughout the application
  - [x] 7.8 Create troubleshooting guide for common issues

- [x] 8.0 Testing and Quality Assurance
  - [x] 8.1 Write unit tests for updated type definitions and interfaces
  - [x] 8.2 Write unit tests for updated service methods and business logic
  - [x] 8.3 Write unit tests for new pickup location type system components
  - [x] 8.4 Write unit tests for updated API endpoints and validation
  - [x] 8.5 Write integration tests for complete transportation segment workflow
  - [x] 8.6 Write end-to-end tests for dispatcher workflow with new terminology
  - [x] 8.7 Test data migration with existing transportation segments
  - [x] 8.8 Test backward compatibility with existing API consumers
  - [x] 8.9 Performance testing for updated database queries
  - [x] 8.10 User acceptance testing with dispatchers
