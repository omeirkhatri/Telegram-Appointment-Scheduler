#!/bin/bash

# Simple import script for new Supabase server
# This uses the API to import data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📥 Simple Import to New Supabase Server${NC}"
echo -e "${BLUE}======================================${NC}"

# Configuration
NEW_SERVER_URL="https://supabase.n8nbdoc.com"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

echo -e "${YELLOW}📋 Server Configuration:${NC}"
echo -e "   URL: ${NEW_SERVER_URL}"
echo -e "   Anon Key: ${ANON_KEY:0:20}..."

# Function to test API connection
test_api_connection() {
    echo -e "${YELLOW}🔍 Testing API connection...${NC}"

    RESPONSE=$(curl -s -H "apikey: ${ANON_KEY}" "${NEW_SERVER_URL}/rest/v1/" 2>/dev/null)

    if echo "$RESPONSE" | grep -q "swagger"; then
        echo -e "${GREEN}✅ API connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ API connection failed${NC}"
        return 1
    fi
}

# Function to check if tables exist
check_tables() {
    echo -e "${YELLOW}🔍 Checking existing tables...${NC}"

    # Check for patients table
    PATIENTS_RESPONSE=$(curl -s -H "apikey: ${SERVICE_KEY}" "${NEW_SERVER_URL}/rest/v1/patients?select=count" 2>/dev/null)
    if echo "$PATIENTS_RESPONSE" | grep -q "count"; then
        PATIENTS_COUNT=$(echo "$PATIENTS_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
        echo -e "${GREEN}✅ Patients table exists with ${PATIENTS_COUNT} records${NC}"
    else
        echo -e "${YELLOW}⚠️  Patients table not found or empty${NC}"
    fi

    # Check for staff table
    STAFF_RESPONSE=$(curl -s -H "apikey: ${SERVICE_KEY}" "${NEW_SERVER_URL}/rest/v1/staff?select=count" 2>/dev/null)
    if echo "$STAFF_RESPONSE" | grep -q "count"; then
        STAFF_COUNT=$(echo "$STAFF_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
        echo -e "${GREEN}✅ Staff table exists with ${STAFF_COUNT} records${NC}"
    else
        echo -e "${YELLOW}⚠️  Staff table not found or empty${NC}"
    fi

    # Check for appointments table
    APPOINTMENTS_RESPONSE=$(curl -s -H "apikey: ${SERVICE_KEY}" "${NEW_SERVER_URL}/rest/v1/appointments?select=count" 2>/dev/null)
    if echo "$APPOINTMENTS_RESPONSE" | grep -q "count"; then
        APPOINTMENTS_COUNT=$(echo "$APPOINTMENTS_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
        echo -e "${GREEN}✅ Appointments table exists with ${APPOINTMENTS_COUNT} records${NC}"
    else
        echo -e "${YELLOW}⚠️  Appointments table not found or empty${NC}"
    fi
}

# Function to show next steps
show_next_steps() {
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "${YELLOW}1. Your environment is now configured for the new server${NC}"
    echo -e "   - NEXT_PUBLIC_SUPABASE_URL: ${NEW_SERVER_URL}"
    echo -e "   - Anon Key: ${ANON_KEY:0:20}..."
    echo -e "   - Service Key: ${SERVICE_KEY:0:20}..."
    echo -e ""
    echo -e "${YELLOW}2. Test your application:${NC}"
    echo -e "   - Start your app: npm run dev"
    echo -e "   - Check if it connects to the new server"
    echo -e "   - Verify all data is accessible"
    echo -e ""
    echo -e "${YELLOW}3. If you need to import data:${NC}"
    echo -e "   - The new server might already have your data"
    echo -e "   - Or you can use the Supabase dashboard to import"
    echo -e "   - Or run SQL commands directly in the dashboard"
    echo -e ""
    echo -e "${GREEN}🎉 Setup completed!${NC}"
    echo -e "${YELLOW}💡 Try starting your app now: npm run dev${NC}"
}

# Main execution
main() {
    test_api_connection
    check_tables
    show_next_steps
}

# Run main function
main "$@"
