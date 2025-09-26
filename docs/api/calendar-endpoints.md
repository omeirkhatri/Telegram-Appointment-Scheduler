# Calendar API Endpoints Documentation

This document provides comprehensive documentation for all calendar-related API endpoints in the BestDOC Appointment Scheduler application.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Calendar Verification](#calendar-verification)
  - [Calendar Status](#calendar-status)
  - [Calendar Retry](#calendar-retry)
  - [Staff API Updates](#staff-api-updates)
- [Response Formats](#response-formats)
- [Error Codes](#error-codes)
- [Examples](#examples)

## Overview

The Calendar API provides endpoints for managing Google Calendar integration for staff members. This includes calendar creation, verification, status checking, and retry functionality for failed operations.

### Base URL
```
/api/calendar
```

### Features
- ✅ Calendar verification for staff members
- ✅ Comprehensive status checking
- ✅ Retry functionality for failed operations
- ✅ Bulk operations support
- ✅ Centralized error handling
- ✅ Request validation
- ✅ Detailed error descriptions

## Authentication

All calendar endpoints require authentication. The API uses the same authentication mechanism as other endpoints in the application.

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Error Handling

All endpoints use a centralized error handling system that provides:

- **Consistent error format** across all endpoints
- **Detailed error descriptions** with suggested actions
- **Retryable error indicators** for automatic retry logic
- **Request ID tracking** for debugging
- **Proper HTTP status codes**

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "error_description": "Detailed error description",
  "suggested_actions": ["Action 1", "Action 2"],
  "retryable": true,
  "details": {},
  "timestamp": "2025-01-22T10:30:00.000Z",
  "request_id": "req_1642852200000_abc123def"
}
```

## Endpoints

### Calendar Verification

#### POST /api/calendar/verify
Start calendar verification process for a staff member.

**Request Body:**
```json
{
  "staff_id": "uuid",
  "google_calendar_id": "calendar-id@group.calendar.google.com",
  "staff_email": "staff@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid",
    "verification_status": "pending",
    "verification_event_id": "event-id",
    "message": "Verification process started. Please check your email and accept the test event invitation."
  },
  "message": "Verification process started successfully",
  "meta": {
    "timestamp": "2025-01-22T10:30:00.000Z"
  }
}
```

#### GET /api/calendar/verify
Check verification status for a staff member.

**Query Parameters:**
- `staff_id` (required): Staff member UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid",
    "google_calendar_id": "calendar-id@group.calendar.google.com",
    "verification_status": "verified",
    "verification_date": "2025-01-22T10:30:00.000Z",
    "error_code": null,
    "error_message": null,
    "last_attempt": "2025-01-22T10:30:00.000Z",
    "attempts_remaining": 0,
    "message": "Calendar verification completed successfully."
  }
}
```

#### PUT /api/calendar/verify
Retry verification process for a staff member.

**Request Body:**
```json
{
  "staff_id": "uuid",
  "max_attempts": 3,
  "timeout_hours": 24,
  "send_email": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid",
    "verification_status": "pending",
    "verification_event_id": "event-id",
    "message": "Verification retry started. Please check your email for the new test event."
  },
  "message": "Verification retry completed successfully"
}
```

#### DELETE /api/calendar/verify
Cancel verification process for a staff member.

**Query Parameters:**
- `staff_id` (required): Staff member UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid",
    "message": "Verification process cancelled successfully"
  },
  "message": "Verification cancelled successfully"
}
```

### Calendar Status

#### GET /api/calendar/status
Get calendar status information.

**Query Parameters (choose one):**
- `staff_id`: Get status for a specific staff member
- `google_calendar_id`: Check health of a specific calendar
- `staff_ids`: Comma-separated list of staff IDs for bulk status check
- `include_verification`: Include verification status (default: true)
- `include_health`: Include health check (default: true)

**Single Staff Status Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid",
    "google_calendar_id": "calendar-id@group.calendar.google.com",
    "verification_status": "verified",
    "verification_date": "2025-01-22T10:30:00.000Z",
    "error_code": null,
    "error_message": null,
    "last_operation": "create_calendar",
    "last_operation_status": "success",
    "last_operation_date": "2025-01-22T10:30:00.000Z"
  }
}
```

**Calendar Health Response:**
```json
{
  "success": true,
  "data": {
    "google_calendar_id": "calendar-id@group.calendar.google.com",
    "exists": true,
    "accessible": true,
    "health_status": "healthy",
    "last_checked": "2025-01-22T10:30:00.000Z"
  }
}
```

**Bulk Status Response:**
```json
{
  "success": true,
  "data": {
    "staff_statuses": [
      {
        "staff_id": "uuid1",
        "google_calendar_id": "calendar1@group.calendar.google.com",
        "verification_status": "verified",
        "verification_date": "2025-01-22T10:30:00.000Z",
        "error_code": null,
        "error_message": null,
        "last_operation": "create_calendar",
        "last_operation_status": "success",
        "last_operation_date": "2025-01-22T10:30:00.000Z"
      }
    ],
    "summary": {
      "total": 1,
      "verified": 1,
      "pending": 0,
      "failed": 0,
      "not_required": 0,
      "healthy": 1,
      "unhealthy": 0
    }
  },
  "meta": {
    "total": 1,
    "checked_at": "2025-01-22T10:30:00.000Z",
    "timestamp": "2025-01-22T10:30:00.000Z"
  }
}
```

#### POST /api/calendar/status
Get bulk calendar status using POST method.

**Request Body:**
```json
{
  "staff_ids": ["uuid1", "uuid2", "uuid3"],
  "include_verification": true,
  "include_health": true
}
```

**Response:** Same as bulk status GET response.

### Calendar Retry

#### POST /api/calendar/retry
Retry failed calendar operations.

**Request Body Options:**

**1. Retry specific operation log:**
```json
{
  "operation_log_id": "uuid",
  "force_retry": false
}
```

**2. Retry staff operation:**
```json
{
  "staff_id": "uuid",
  "operation_type": "create_calendar",
  "force_retry": false,
  "max_retries": 3
}
```

**3. Bulk retry:**
```json
{
  "staff_ids": ["uuid1", "uuid2"],
  "operation_type": "create_calendar",
  "force_retry": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operation_log_id": "uuid",
    "new_status": "success",
    "retry_count": 1,
    "message": "Operation retry completed successfully"
  },
  "message": "Operation retry completed successfully"
}
```

#### GET /api/calendar/retry
Get retryable operations for a staff member.

**Query Parameters:**
- `staff_id` (required): Staff member UUID
- `operation_type` (optional): Filter by operation type

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid",
    "retryable_operations": [
      {
        "id": "operation-uuid",
        "operation_type": "create_calendar",
        "operation_status": "failed",
        "error_code": "GOOGLE_API_UNAVAILABLE",
        "retry_count": 0,
        "max_retries": 3,
        "created_at": "2025-01-22T10:30:00.000Z"
      }
    ],
    "total_count": 1,
    "operation_types": ["create_calendar"]
  }
}
```

### Staff API Updates

The existing staff API endpoints have been enhanced to include calendar status information.

#### GET /api/staff
Get all staff members with calendar status.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "staff_type": "doctor",
      "google_calendar_id": "calendar-id@group.calendar.google.com",
      "calendar_verification_status": "verified",
      "calendar_verification_date": "2025-01-22T10:30:00.000Z",
      "calendar_error_code": null,
      "calendar_status": {
        "staff_id": "uuid",
        "google_calendar_id": "calendar-id@group.calendar.google.com",
        "verification_status": "verified",
        "verification_date": "2025-01-22T10:30:00.000Z",
        "error_code": null,
        "error_message": null,
        "last_operation": "create_calendar",
        "last_operation_status": "success",
        "last_operation_date": "2025-01-22T10:30:00.000Z"
      }
    }
  ]
}
```

#### POST /api/staff
Create a new staff member with calendar status.

**Response:** Same format as GET with the new staff member data including calendar status.

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Optional success message",
  "meta": {
    "timestamp": "2025-01-22T10:30:00.000Z",
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "error_description": "Detailed error description",
  "suggested_actions": ["Action 1", "Action 2"],
  "retryable": true,
  "details": {},
  "timestamp": "2025-01-22T10:30:00.000Z",
  "request_id": "req_1642852200000_abc123def"
}
```

## Error Codes

### Calendar-Specific Error Codes

| Code | Description | Retryable | HTTP Status |
|------|-------------|-----------|-------------|
| `CALENDAR_CREATION_FAILED` | Failed to create calendar | Yes | 500 |
| `EMAIL_INVALID` | Invalid email format | No | 400 |
| `EMAIL_BOUNCE` | Email bounced | No | 400 |
| `GOOGLE_API_UNAVAILABLE` | Google API unavailable | Yes | 429 |
| `INVITE_SEND_FAILED` | Failed to send invite | Yes | 500 |
| `VERIFICATION_TIMEOUT` | Verification timed out | Yes | 400 |
| `PERMISSION_DENIED` | Insufficient permissions | No | 403 |
| `QUOTA_EXCEEDED` | API quota exceeded | Yes | 429 |
| `CALENDAR_NOT_FOUND` | Calendar not found | No | 404 |
| `STAFF_EMAIL_MISSING` | Staff email required | No | 400 |
| `CALENDAR_SHARE_FAILED` | Failed to share calendar | Yes | 500 |
| `EVENT_CREATION_FAILED` | Failed to create event | Yes | 500 |
| `VERIFICATION_EVENT_CREATION_FAILED` | Failed to create verification event | Yes | 500 |
| `RSVP_CHECK_FAILED` | Failed to check RSVP | Yes | 500 |

### General Error Codes

| Code | Description | Retryable | HTTP Status |
|------|-------------|-----------|-------------|
| `VALIDATION_ERROR` | Input validation failed | No | 400 |
| `AUTHENTICATION_ERROR` | Authentication required | No | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | No | 403 |
| `NOT_FOUND_ERROR` | Resource not found | No | 404 |
| `CONFLICT_ERROR` | Resource conflict | No | 409 |
| `RATE_LIMIT_ERROR` | Rate limit exceeded | Yes | 429 |
| `EXTERNAL_SERVICE_ERROR` | External service error | Yes | 502 |
| `INTERNAL_SERVER_ERROR` | Internal server error | Yes | 500 |

## Examples

### Complete Calendar Setup Flow

1. **Create staff member:**
```bash
POST /api/staff
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "staff_type": "doctor"
}
```

2. **Start verification:**
```bash
POST /api/calendar/verify
{
  "staff_id": "staff-uuid",
  "google_calendar_id": "calendar-id@group.calendar.google.com",
  "staff_email": "john@example.com"
}
```

3. **Check verification status:**
```bash
GET /api/calendar/verify?staff_id=staff-uuid
```

4. **Get comprehensive status:**
```bash
GET /api/calendar/status?staff_id=staff-uuid
```

### Bulk Operations

**Get status for multiple staff:**
```bash
GET /api/calendar/status?staff_ids=uuid1,uuid2,uuid3&include_verification=true&include_health=true
```

**Retry failed operations for multiple staff:**
```bash
POST /api/calendar/retry
{
  "staff_ids": ["uuid1", "uuid2"],
  "operation_type": "create_calendar",
  "force_retry": false
}
```

### Error Handling Example

**Request with validation error:**
```bash
POST /api/calendar/verify
{
  "staff_id": "invalid-uuid",
  "google_calendar_id": "invalid-id",
  "staff_email": "invalid-email"
}
```

**Error response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "error_code": "VALIDATION_ERROR",
  "error_description": "One or more validation errors occurred",
  "details": [
    {
      "field": "staff_id",
      "message": "Invalid staff ID format"
    },
    {
      "field": "google_calendar_id",
      "message": "Google Calendar ID is required"
    },
    {
      "field": "staff_email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2025-01-22T10:30:00.000Z",
  "request_id": "req_1642852200000_abc123def"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default limit:** 100 requests per minute per IP
- **Bulk operations:** 10 requests per minute per IP
- **Retry operations:** 20 requests per minute per IP

When rate limited, the API returns a 429 status with retry information:

```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 seconds",
  "error_code": "RATE_LIMIT_ERROR",
  "retryable": true,
  "details": {
    "retry_after": 60
  }
}
```

## Best Practices

1. **Always check the `success` field** in responses before processing data
2. **Use the `retryable` field** to determine if an operation should be retried
3. **Follow the `suggested_actions`** in error responses for troubleshooting
4. **Use request IDs** for debugging and support requests
5. **Implement exponential backoff** for retryable operations
6. **Validate input data** before making requests
7. **Handle rate limiting** gracefully with appropriate delays
8. **Use bulk operations** when processing multiple staff members
9. **Monitor error codes** to identify patterns and issues
10. **Cache status information** to reduce API calls

## Support

For technical support or questions about the Calendar API:

- **Documentation:** This file and inline code comments
- **Error logs:** Check application logs with request IDs
- **Debugging:** Use the comprehensive error details provided
- **Monitoring:** Monitor error rates and patterns in your application
