# Capacity Planner Fix Guide

## Issue Identified

The Capacity Planner was showing "Capacity Planner Unavailable" because the required feature flags were not enabled.

## Root Cause

The capacity planner requires several feature flags to be enabled:
- `DRIVER_ASSIGNMENT_OVERHAUL_ENABLED=true`
- `DRIVER_ASSIGNMENT_OVERHAUL_UI_ENABLED=true`
- `DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER_ENABLED=true`
- `TRANSPORTATION_SEGMENTS_ENABLED=true`
- `TRANSPORTATION_SEGMENTS_UI_ENABLED=true`

## Solution

### Option 1: Use the Enable Script (Recommended)

1. Run the enable script:
   ```bash
   source enable-capacity-planner.sh
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

### Option 2: Manual Environment Setup

1. Copy the environment template:
   ```bash
   cp config/env.development.template .env.local
   ```

2. Edit `.env.local` and set these values to `true`:
   ```
   DRIVER_ASSIGNMENT_OVERHAUL_ENABLED=true
   DRIVER_ASSIGNMENT_OVERHAUL_UI_ENABLED=true
   DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER_ENABLED=true
   TRANSPORTATION_SEGMENTS_ENABLED=true
   TRANSPORTATION_SEGMENTS_UI_ENABLED=true
   TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED=true
   TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED=true
   TRANSPORTATION_SEGMENTS_MAPS_ENABLED=true
   TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED=true
   TRANSPORTATION_SEGMENTS_REPORTING_ENABLED=true
   TRANSPORTATION_SEGMENTS_OVERRIDES_ENABLED=true
   TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED=true
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

## Verification

After enabling the feature flags and restarting the server:

1. Navigate to `http://localhost:3000/capacity-planner`
2. You should see the Capacity Planner dashboard instead of the "unavailable" message
3. The dashboard should show:
   - Driver lanes
   - Transportation segments
   - Unassigned queue
   - Insights panel

## API Endpoints Verified

The following APIs are working correctly:
- ✅ `/api/transportation-segments` - Returns transportation segments data
- ✅ `/api/staff?staff_type=driver` - Returns driver staff data

## Database Schema

The required database tables exist and are properly configured:
- ✅ `transportation_segments` table exists
- ✅ Required migrations have been applied
- ✅ Proper indexes and constraints are in place

## Troubleshooting

If the capacity planner still doesn't work after enabling feature flags:

1. Check the browser console for any JavaScript errors
2. Verify the environment variables are loaded by checking the network tab
3. Ensure the development server was restarted after setting environment variables
4. Check that the database is running and accessible

## Feature Dependencies

The capacity planner depends on:
- Transportation segments system
- Staff management system
- Driver assignment overhaul system
- Google Maps integration (optional)

All these systems are properly implemented and functional.

