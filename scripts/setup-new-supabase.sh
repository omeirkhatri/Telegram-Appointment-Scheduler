#!/bin/bash

# Setup script for new Supabase server
# This helps you configure your app to connect to the new server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up connection to new Supabase server${NC}"
echo -e "${BLUE}===============================================${NC}"

# Configuration
NEW_SERVER_URL="https://supabase.n8nbdoc.com"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"

echo -e "${YELLOW}📋 New Server Details:${NC}"
echo -e "   URL: ${NEW_SERVER_URL}"
echo -e "   Anon Key: ${ANON_KEY:0:20}..."

# Function to backup current .env
backup_env() {
    if [ -f ".env" ]; then
        cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${GREEN}✅ Backed up current .env file${NC}"
    fi
}

# Function to generate JWT secret
generate_jwt_secret() {
    echo -e "${YELLOW}🔐 Generating JWT secret...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✅ JWT secret generated${NC}"
}

# Function to create new .env file
create_new_env() {
    echo -e "${YELLOW}📝 Creating new .env file...${NC}"

    cat > .env << EOF
# Updated environment for new Supabase server
# Generated on $(date)

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://supabase.n8nbdoc.com
TZ=Asia/Dubai

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${NEW_SERVER_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
SUPABASE_JWT_SECRET=${JWT_SECRET}

# Database Configuration
DATABASE_URL=postgres://postgres:postgres@supabase.n8nbdoc.com:54322/postgres

# Auth Configuration
GOTRUE_SITE_URL=${NEW_SERVER_URL}
API_EXTERNAL_URL=${NEW_SERVER_URL}
GOTRUE_URI_ALLOW_LIST=${NEW_SERVER_URL}

# Email Configuration (uncomment and configure if needed)
# GOTRUE_SMTP_HOST=your-smtp-host
# GOTRUE_SMTP_PORT=587
# GOTRUE_SMTP_USER=your-smtp-user
# GOTRUE_SMTP_PASS=your-smtp-password
# GOTRUE_SMTP_ADMIN_EMAIL=admin@your-domain.com
# GOTRUE_SMTP_SENDER_NAME=MediCare Scheduler

# WhatsApp Configuration (uncomment and configure if needed)
# WHATSAPP_API_URL=your-whatsapp-api-url
# WHATSAPP_API_TOKEN=your-whatsapp-token

# Google Calendar Configuration (uncomment and configure if needed)
# GOOGLE_CALENDAR_CREDENTIALS=your-google-credentials
# GOOGLE_CALENDAR_CALENDAR_ID=your-calendar-id
EOF

    echo -e "${GREEN}✅ New .env file created${NC}"
}

# Function to test connection
test_connection() {
    echo -e "${YELLOW}🔍 Testing connection to new server...${NC}"

    # Test if the server is reachable
    if curl -s -o /dev/null -w "%{http_code}" "${NEW_SERVER_URL}/rest/v1/" | grep -q "200"; then
        echo -e "${GREEN}✅ Server is reachable${NC}"
    else
        echo -e "${RED}❌ Cannot reach server at ${NEW_SERVER_URL}${NC}"
        echo -e "${YELLOW}   Please check if the server is running and accessible${NC}"
        return 1
    fi
}

# Function to show next steps
show_next_steps() {
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "${YELLOW}1. Get your Service Role Key:${NC}"
    echo -e "   - Go to your Supabase dashboard at ${NEW_SERVER_URL}"
    echo -e "   - Navigate to Settings → API"
    echo -e "   - Copy the 'service_role' key"
    echo -e "   - Update the SUPABASE_SERVICE_ROLE_KEY in your .env file"
    echo -e ""
    echo -e "${YELLOW}2. Import your data:${NC}"
    echo -e "   - Copy your data export to the new server"
    echo -e "   - Run the import script on the new server"
    echo -e ""
    echo -e "${YELLOW}3. Test your application:${NC}"
    echo -e "   - Start your app: npm run dev"
    echo -e "   - Check if it connects to the new server"
    echo -e "   - Verify all data is accessible"
    echo -e ""
    echo -e "${GREEN}🎉 Environment setup completed!${NC}"
    echo -e "${YELLOW}⚠️  Don't forget to get your Service Role Key!${NC}"
}

# Main execution
main() {
    backup_env
    generate_jwt_secret

    # Ask for service role key
    echo -e "${YELLOW}Please provide your Service Role Key from the Supabase dashboard:${NC}"
    read -p "Service Role Key: " SERVICE_KEY

    if [ -z "$SERVICE_KEY" ]; then
        echo -e "${RED}❌ Service Role Key is required!${NC}"
        echo -e "${YELLOW}   Please get it from your Supabase dashboard and run this script again${NC}"
        exit 1
    fi

    create_new_env
    test_connection
    show_next_steps
}

# Run main function
main "$@"
