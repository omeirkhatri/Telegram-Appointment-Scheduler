#!/bin/bash

# Import data to new Supabase server
# This script helps you import your exported data to the new server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📥 Importing Data to New Supabase Server${NC}"
echo -e "${BLUE}=========================================${NC}"

# Configuration
NEW_SERVER_URL="https://supabase.n8nbdoc.com"
EXPORT_DIR="./data-export/supabase_export_20250918_170520"

echo -e "${YELLOW}📋 Import Configuration:${NC}"
echo -e "   Server URL: ${NEW_SERVER_URL}"
echo -e "   Export Directory: ${EXPORT_DIR}"

# Function to check if export files exist
check_export_files() {
    if [ ! -d "$EXPORT_DIR" ]; then
        echo -e "${RED}❌ Export directory not found: ${EXPORT_DIR}${NC}"
        echo -e "${YELLOW}   Please run the export script first${NC}"
        exit 1
    fi

    if [ ! -f "${EXPORT_DIR}/full_dump.sql" ]; then
        echo -e "${RED}❌ Database dump not found${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Export files found${NC}"
}

# Function to test server connection
test_server_connection() {
    echo -e "${YELLOW}🔍 Testing server connection...${NC}"

    # Test if the server is reachable
    if curl -s -o /dev/null -w "%{http_code}" "${NEW_SERVER_URL}/rest/v1/" | grep -q "200"; then
        echo -e "${GREEN}✅ Server is reachable${NC}"
    else
        echo -e "${RED}❌ Cannot reach server at ${NEW_SERVER_URL}${NC}"
        echo -e "${YELLOW}   Please check if the server is running and accessible${NC}"
        exit 1
    fi
}

# Function to import data using Supabase CLI
import_data() {
    echo -e "${YELLOW}📊 Importing data to new server...${NC}"

    # Check if we have the database URL
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}Please provide the database connection string:${NC}"
        read -p "Database URL (e.g., postgres://user:pass@host:port/db): " DATABASE_URL
    fi

    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ Database URL is required!${NC}"
        exit 1
    fi

    # Test database connection
    echo -e "${YELLOW}🔍 Testing database connection...${NC}"
    if ! psql "${DATABASE_URL}" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${RED}❌ Cannot connect to database${NC}"
        echo -e "${YELLOW}   Please check your DATABASE_URL${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Database connection successful${NC}"

    # Import the full dump
    echo -e "${YELLOW}📥 Importing full database dump...${NC}"
    psql "${DATABASE_URL}" -f "${EXPORT_DIR}/full_dump.sql"

    echo -e "${GREEN}✅ Data import completed successfully!${NC}"
}

# Function to verify import
verify_import() {
    echo -e "${YELLOW}🔍 Verifying data import...${NC}"

    # Check if we can query some basic tables
    TABLES=("patients" "staff" "appointments")

    for table in "${TABLES[@]}"; do
        COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM public.${table};" 2>/dev/null | tr -d ' ' || echo "0")
        if [ "$COUNT" -gt 0 ]; then
            echo -e "${GREEN}✅ Table '${table}' has ${COUNT} records${NC}"
        else
            echo -e "${YELLOW}⚠️  Table '${table}' is empty or doesn't exist${NC}"
        fi
    done
}

# Function to show next steps
show_next_steps() {
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "${YELLOW}1. Update your application environment:${NC}"
    echo -e "   - Make sure your .env file points to the new server"
    echo -e "   - Update NEXT_PUBLIC_SUPABASE_URL to: ${NEW_SERVER_URL}"
    echo -e ""
    echo -e "${YELLOW}2. Test your application:${NC}"
    echo -e "   - Start your app: npm run dev"
    echo -e "   - Check if all data is visible"
    echo -e "   - Test authentication and other features"
    echo -e ""
    echo -e "${YELLOW}3. Verify everything works:${NC}"
    echo -e "   - Check patients list"
    echo -e "   - Check staff list"
    echo -e "   - Check appointments"
    echo -e "   - Test file uploads (if using storage)"
    echo -e ""
    echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
}

# Main execution
main() {
    check_export_files
    test_server_connection
    import_data
    verify_import
    show_next_steps
}

# Run main function
main "$@"
