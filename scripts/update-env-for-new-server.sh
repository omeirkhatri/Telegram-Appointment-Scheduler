#!/bin/bash

# Script to update environment variables for new Supabase server
# This helps you quickly switch from local to new server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Updating Environment for New Server${NC}"
echo -e "${BLUE}=====================================${NC}"

# Function to backup current .env
backup_env() {
    if [ -f ".env" ]; then
        cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${GREEN}✅ Backed up current .env file${NC}"
    fi
}

# Function to get user input
get_server_details() {
    echo -e "${YELLOW}Please provide your new server details:${NC}"

    read -p "New server IP address: " NEW_SERVER_IP
    read -p "New server port (default 54321): " NEW_SERVER_PORT
    NEW_SERVER_PORT=${NEW_SERVER_PORT:-54321}

    read -p "New server database port (default 54322): " NEW_DB_PORT
    NEW_DB_PORT=${NEW_DB_PORT:-54322}

    read -p "New server app port (default 3000): " NEW_APP_PORT
    NEW_APP_PORT=${NEW_APP_PORT:-3000}

    echo -e "${YELLOW}Do you want to generate new JWT secrets? (y/n): ${NC}"
    read -p "" GENERATE_NEW_SECRETS
}

# Function to generate new JWT secrets
generate_secrets() {
    echo -e "${YELLOW}🔐 Generating new JWT secrets...${NC}"

    NEW_JWT_SECRET=$(openssl rand -base64 32)
    NEW_ANON_KEY=$(openssl rand -base64 32)
    NEW_SERVICE_KEY=$(openssl rand -base64 32)

    echo -e "${GREEN}✅ New secrets generated${NC}"
}

# Function to create new .env file
create_new_env() {
    echo -e "${YELLOW}📝 Creating new .env file...${NC}"

    cat > .env << EOF
# Updated environment for new Supabase server
# Generated on $(date)

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://${NEW_SERVER_IP}:${NEW_APP_PORT}
TZ=Asia/Dubai

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://${NEW_SERVER_IP}:${NEW_SERVER_PORT}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEW_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${NEW_SERVICE_KEY}
SUPABASE_JWT_SECRET=${NEW_JWT_SECRET}

# Database Configuration
DATABASE_URL=postgres://postgres:postgres@${NEW_SERVER_IP}:${NEW_DB_PORT}/postgres

# Auth Configuration
GOTRUE_SITE_URL=http://${NEW_SERVER_IP}:${NEW_APP_PORT}
API_EXTERNAL_URL=http://${NEW_SERVER_IP}:${NEW_SERVER_PORT}
GOTRUE_URI_ALLOW_LIST=http://${NEW_SERVER_IP}:${NEW_APP_PORT}

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

# Function to create server environment file
create_server_env() {
    echo -e "${YELLOW}📝 Creating server .env file...${NC}"

    cat > .env.server << EOF
# Server environment configuration
# Use this on your new server

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://${NEW_SERVER_IP}:${NEW_APP_PORT}
TZ=Asia/Dubai

# Supabase Configuration (internal Docker network)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEW_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${NEW_SERVICE_KEY}
SUPABASE_JWT_SECRET=${NEW_JWT_SECRET}

# Database Configuration
DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Auth Configuration
GOTRUE_SITE_URL=http://${NEW_SERVER_IP}:${NEW_APP_PORT}
API_EXTERNAL_URL=http://${NEW_SERVER_IP}:${NEW_SERVER_PORT}
GOTRUE_URI_ALLOW_LIST=http://${NEW_SERVER_IP}:${NEW_APP_PORT}

# Email Configuration (uncomment and configure if needed)
# GOTRUE_SMTP_HOST=your-smtp-host
# GOTRUE_SMTP_PORT=587
# GOTRUE_SMTP_USER=your-smtp-user
# GOTRUE_SMTP_PASS=your-smtp-password
# GOTRUE_SMTP_ADMIN_EMAIL=admin@your-domain.com
# GOTRUE_SMTP_SENDER_NAME=MediCare Scheduler

# Server Configuration
DEFAULT_ORGANIZATION_NAME=MediCare Organization
DEFAULT_PROJECT_NAME=MediCare Scheduler
SUPABASE_PUBLIC_URL=http://${NEW_SERVER_IP}:${NEW_SERVER_PORT}
EOF

    echo -e "${GREEN}✅ Server .env file created${NC}"
}

# Function to display next steps
show_next_steps() {
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "${YELLOW}1. Copy these files to your new server:${NC}"
    echo -e "   - .env.server (rename to .env on the server)"
    echo -e "   - docker-compose.yml"
    echo -e "   - All your application files"
    echo -e ""
    echo -e "${YELLOW}2. On your new server:${NC}"
    echo -e "   - Copy .env.server to .env"
    echo -e "   - Run: docker-compose up -d"
    echo -e "   - Import your data using the export script"
    echo -e ""
    echo -e "${YELLOW}3. Test the connection:${NC}"
    echo -e "   - Check Supabase Studio: http://${NEW_SERVER_IP}:54323"
    echo -e "   - Check API: http://${NEW_SERVER_IP}:${NEW_SERVER_PORT}"
    echo -e "   - Check your app: http://${NEW_SERVER_IP}:${NEW_APP_PORT}"
    echo -e ""
    echo -e "${GREEN}🎉 Environment update completed!${NC}"
}

# Main execution
main() {
    backup_env
    get_server_details

    if [[ $GENERATE_NEW_SECRETS =~ ^[Yy]$ ]]; then
        generate_secrets
    else
        echo -e "${YELLOW}Using existing secrets from current .env${NC}"
        # You can modify this to read from current .env if needed
        NEW_JWT_SECRET="your-new-jwt-secret-here"
        NEW_ANON_KEY="your-new-anon-key-here"
        NEW_SERVICE_KEY="your-new-service-key-here"
    fi

    create_new_env
    create_server_env
    show_next_steps
}

# Run main function
main "$@"
