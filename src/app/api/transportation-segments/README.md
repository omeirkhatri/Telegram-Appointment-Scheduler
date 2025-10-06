# Transportation Segments API Documentation

## Overview

The Transportation Segments API provides endpoints for managing transportation segments in the home healthcare system. This API supports the new pickup/patient location terminology and pickup location type system.

## Base URL

```
/api/transportation-segments
```

## Authentication

All endpoints require authentication. Include the appropriate authentication headers in your requests.

## Endpoints

### GET /api/transportation-segments

Get all transportation segments with optional filtering.

#### Query Parameters

- `appointment_id` (string, optional): Filter by appointment ID
- `driver_id` (string, optional): Filter by driver ID
- `segment_type` (string, optional): Filter by segment type (`pickup`, `dropoff`, `stay_with_staff`, `metro_assist`, `custom`)
- `status` (string, optional): Filter by status (`draft`, `scheduled`, `in_progress`, `completed`, `cancelled`)
- `requires_follow_up` (boolean, optional): Filter by follow-up requirement

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "appointment_id": "string",
      "segment_type": "pickup",
      "title": "string",
      "planned_start": "2024-01-01T10:00:00Z",
      "planned_end": "2024-01-01T11:00:00Z",
      "driver_id": "string",
      "travel_mode": "driving",
      "pickup_location": {
        "lat": 40.7128,
        "lng": -74.0060,
        "address": "123 Main St, New York, NY",
        "landmark": "Central Park",
        "place_id": "ChIJ...",
        "formatted_address": "123 Main St, New York, NY 10001, USA",
        "city": "New York",
        "area": "Manhattan",
        "building_name": "Empire State Building"
      },
      "patient_location": {
        "lat": 40.7589,
        "lng": -73.9851,
        "address": "456 Broadway, New York, NY",
        "landmark": "Times Square"
      },
      "pickup_location_type": "office",
      "pickup_location_reference": "string",
      "estimated_travel_minutes": 30,
      "estimated_distance_km": 5.2,
      "buffer_minutes": 20,
      "instructions": "string",
      "requires_follow_up": false,
      "status": "scheduled",
      "manual_override": false,
      "google_event_id": "string",
      "created_at": "2024-01-01T09:00:00Z",
      "updated_at": "2024-01-01T09:00:00Z",
      "driver": {
        "id": "string",
        "first_name": "John",
        "last_name": "Doe",
        "staff_type": "driver",
        "specialization": "transportation",
        "phone": "+1234567890",
        "email": "john.doe@example.com"
      }
    }
  ],
  "count": 1
}
```

### POST /api/transportation-segments

Create a new transportation segment.

#### Request Body

```json
{
  "appointment_id": "string",
  "segment_type": "pickup",
  "title": "string",
  "planned_start": "2024-01-01T10:00:00Z",
  "planned_end": "2024-01-01T11:00:00Z",
  "driver_id": "string",
  "travel_mode": "driving",
  "pickup_location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "address": "123 Main St, New York, NY",
    "landmark": "Central Park"
  },
  "patient_location": {
    "lat": 40.7589,
    "lng": -73.9851,
    "address": "456 Broadway, New York, NY",
    "landmark": "Times Square"
  },
  "pickup_location_type": "office",
  "pickup_location_reference": "string",
  "estimated_travel_minutes": 30,
  "estimated_distance_km": 5.2,
  "buffer_minutes": 20,
  "instructions": "string",
  "requires_follow_up": false,
  "status": "draft",
  "manual_override": false
}
```

#### Pickup Location Types

- `office`: Pickup from office location
- `previous_appointment`: Pickup from previous appointment location
- `metro_station`: Pickup from metro station
- `custom`: Pickup from custom location

#### Validation Rules

**Required Fields**:
- `appointment_id`: Required, must be a valid appointment ID
- `segment_type`: Required, must be one of: `pickup`, `dropoff`, `stay_with_staff`, `metro_assist`, `custom`
- `pickup_location_type`: Required, must be one of: `office`, `previous_appointment`, `metro_station`, `custom`
- `pickup_location`: Required, must be a valid location object with lat/lng coordinates
- `patient_location`: Required, must be a valid location object with lat/lng coordinates

**Conditional Requirements**:
- `pickup_location_reference`: Required for `previous_appointment` and `metro_station` types
  - For `previous_appointment`: Must be a valid appointment ID that exists and has a patient location
  - For `metro_station`: Must be a valid metro station ID that is configured in the system

**Data Validation**:
- `planned_start` and `planned_end`: If provided, end must be after start
- `estimated_travel_minutes`: Must be between 0 and 1440 (0 to 24 hours)
- `estimated_distance_km`: Must be between 0 and 10000 (0 to 10,000 km)
- `buffer_minutes`: Must be between 0 and 360 (0 to 6 hours)
- `pickup_location` and `patient_location`: Must be different locations
- `pickup_location.lat` and `pickup_location.lng`: Must be valid coordinates (-90 to 90 for lat, -180 to 180 for lng)
- `patient_location.lat` and `patient_location.lng`: Must be valid coordinates (-90 to 90 for lat, -180 to 180 for lng)

**Business Logic Validation**:
- Previous appointment must exist and be accessible
- Metro station must be configured and active
- Custom location must be geocodable
- Office location must be configured in system settings

#### Response

```json
{
  "success": true,
  "data": {
    // Transportation segment object
  },
  "message": "Transportation segment created successfully"
}
```

### GET /api/transportation-segments/[id]

Get a single transportation segment by ID.

#### Response

```json
{
  "success": true,
  "data": {
    // Transportation segment object
  }
}
```

### PUT /api/transportation-segments/[id]

Update an existing transportation segment.

#### Request Body

Same as POST, but all fields are optional.

#### Response

```json
{
  "success": true,
  "data": {
    // Updated transportation segment object
  },
  "message": "Transportation segment updated successfully"
}
```

### DELETE /api/transportation-segments/[id]

Delete a transportation segment.

#### Response

```json
{
  "success": true,
  "message": "Transportation segment deleted successfully"
}
```

### POST /api/transportation-segments/calculate-route

Calculate route between pickup and patient locations.

#### Request Body

```json
{
  "pickup_location": "123 Main St, New York, NY",
  "patient_location": "456 Broadway, New York, NY"
}
```

#### Response

```json
{
  "duration": 30,
  "distance": 5.2,
  "durationText": "30 mins",
  "distanceText": "5.2 km"
}
```

## Backward Compatibility

The API maintains backward compatibility with the old field names:

- `origin` → `pickup_location`
- `destination` → `patient_location`

When using the old field names, the API will automatically map them to the new field names internally.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Validation error 1", "Validation error 2"]
}
```

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error
