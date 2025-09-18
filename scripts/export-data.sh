#!/bin/bash

# Simple data export script for Supabase migration
# This exports data from your current local Supabase to files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXPORT_DIR="./data-export"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_NAME="supabase_export_${TIMESTAMP}"

echo -e "${BLUE}📤 Exporting Supabase Data${NC}"
echo -e "${BLUE}==========================${NC}"

# Create export directory
mkdir -p "${EXPORT_DIR}/${EXPORT_NAME}"

echo -e "${YELLOW}📁 Creating export directory: ${EXPORT_DIR}/${EXPORT_NAME}${NC}"

# Function to check if database is running
check_database() {
    if ! docker ps | grep -q "supabase-db"; then
        echo -e "${YELLOW}⚠️  Database container not running. Starting it...${NC}"
        docker-compose up -d supabase-db
        sleep 10
    fi
}

# Function to export database schema and data
export_database() {
    echo -e "${YELLOW}🗄️  Exporting database...${NC}"

    # Export schema only
    docker exec supabase-db pg_dump -U postgres -d postgres --schema-only --clean --if-exists > "${EXPORT_DIR}/${EXPORT_NAME}/schema.sql"

    # Export data only (excluding system tables)
    docker exec supabase-db pg_dump -U postgres -d postgres --data-only --exclude-table=auth.* --exclude-table=storage.* --exclude-table=realtime.* --exclude-table=supabase_functions.* > "${EXPORT_DIR}/${EXPORT_NAME}/data.sql"

    # Export auth data separately
    docker exec supabase-db pg_dump -U postgres -d postgres --data-only --table=auth.* > "${EXPORT_DIR}/${EXPORT_NAME}/auth_data.sql" 2>/dev/null || true

    # Export storage data separately
    docker exec supabase-db pg_dump -U postgres -d postgres --data-only --table=storage.* > "${EXPORT_DIR}/${EXPORT_NAME}/storage_data.sql" 2>/dev/null || true

    echo -e "${GREEN}✅ Database export completed${NC}"
}

# Function to export specific tables (your app data)
export_app_data() {
    echo -e "${YELLOW}📊 Exporting application data...${NC}"

    # List of your main tables (adjust based on your schema)
    TABLES=(
        "patients"
        "staff"
        "appointments"
        "appointment_staff"
        "email_preferences"
        "email_delivery_logs"
        "appointment_copy_audit_trail"
        "external_edit_tracking"
        "google_event_integrity_checks"
    )

    for table in "${TABLES[@]}"; do
        echo -e "${YELLOW}  Exporting table: ${table}${NC}"
        docker exec supabase-db pg_dump -U postgres -d postgres --data-only --table="public.${table}" > "${EXPORT_DIR}/${EXPORT_NAME}/${table}.sql" 2>/dev/null || echo -e "${YELLOW}    Table ${table} not found or empty${NC}"
    done

    echo -e "${GREEN}✅ Application data export completed${NC}"
}

# Function to create import script for new server
create_import_script() {
    echo -e "${YELLOW}📝 Creating import script for new server...${NC}"

    cat > "${EXPORT_DIR}/${EXPORT_NAME}/import-to-new-server.sh" << 'EOF'
#!/bin/bash

# Import script for new Supabase server
# Run this on your new server after updating environment variables

set -e

echo "📥 Starting data import to new Supabase server..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found! Please create it first."
    exit 1
fi

# Load environment variables
source .env

# Check if database is accessible
echo "🔍 Testing database connection..."
if ! psql "${DATABASE_URL}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to database. Check your DATABASE_URL in .env"
    exit 1
fi

echo "✅ Database connection successful"

# Import schema first
echo "📋 Importing schema..."
psql "${DATABASE_URL}" -f schema.sql

# Import data
echo "📊 Importing application data..."
psql "${DATABASE_URL}" -f data.sql

# Import auth data if exists
if [ -f "auth_data.sql" ]; then
    echo "🔐 Importing auth data..."
    psql "${DATABASE_URL}" -f auth_data.sql
fi

# Import storage data if exists
if [ -f "storage_data.sql" ]; then
    echo "📦 Importing storage data..."
    psql "${DATABASE_URL}" -f storage_data.sql
fi

# Import individual tables
for file in *.sql; do
    if [[ "$file" != "schema.sql" && "$file" != "data.sql" && "$file" != "auth_data.sql" && "$file" != "storage_data.sql" && "$file" != "import-to-new-server.sh" ]]; then
        echo "📄 Importing $file..."
        psql "${DATABASE_URL}" -f "$file"
    fi
done

echo "✅ Data import completed successfully!"
echo "🌐 Your application should now be accessible with the migrated data."
EOF

    chmod +x "${EXPORT_DIR}/${EXPORT_NAME}/import-to-new-server.sh"
    echo -e "${GREEN}✅ Import script created${NC}"
}

# Function to create environment template for new server
create_env_template() {
    echo -e "${YELLOW}🔧 Creating environment template for new server...${NC}"

    cat > "${EXPORT_DIR}/${EXPORT_NAME}/.env.new-server" << 'EOF'
# Environment configuration for new Supabase server
# Update these values with your new server details

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://your-new-server-ip:3000
TZ=Asia/Dubai

# Supabase Configuration (update with your new server details)
NEXT_PUBLIC_SUPABASE_URL=http://your-new-server-ip:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
SUPABASE_JWT_SECRET=your-new-jwt-secret

# Database (update with your new server details)
DATABASE_URL=postgres://postgres:postgres@your-new-server-ip:54322/postgres

# Auth Configuration
GOTRUE_SITE_URL=http://your-new-server-ip:3000
API_EXTERNAL_URL=http://your-new-server-ip:54321
GOTRUE_URI_ALLOW_LIST=http://your-new-server-ip:3000

# Email Configuration (if using external SMTP)
# GOTRUE_SMTP_HOST=your-smtp-host
# GOTRUE_SMTP_PORT=587
# GOTRUE_SMTP_USER=your-smtp-user
# GOTRUE_SMTP_PASS=your-smtp-password
# GOTRUE_SMTP_ADMIN_EMAIL=admin@your-domain.com
# GOTRUE_SMTP_SENDER_NAME=MediCare Scheduler

# WhatsApp Configuration (if using)
# WHATSAPP_API_URL=your-whatsapp-api-url
# WHATSAPP_API_TOKEN=your-whatsapp-token

# Google Calendar Configuration (if using)
# GOOGLE_CALENDAR_CREDENTIALS=your-google-credentials
# GOOGLE_CALENDAR_CALENDAR_ID=your-calendar-id
EOF

    echo -e "${GREEN}✅ Environment template created${NC}"
}

# Function to create migration instructions
create_instructions() {
    echo -e "${YELLOW}📖 Creating migration instructions...${NC}"

    cat > "${EXPORT_DIR}/${EXPORT_NAME}/MIGRATION_INSTRUCTIONS.md" << 'EOF'
# Simple Supabase Migration Instructions

## Overview
This migration exports your current local Supabase data and provides scripts to import it to your new server.

## Files Included
- `schema.sql` - Database schema
- `data.sql` - Application data
- `auth_data.sql` - Authentication data (if any)
- `storage_data.sql` - Storage data (if any)
- `*.sql` - Individual table exports
- `import-to-new-server.sh` - Import script
- `.env.new-server` - Environment template

## Migration Steps

### 1. Set up your new Supabase server
- Deploy your Docker Compose stack on the new server
- Ensure all services are running
- Note down the server IP address

### 2. Update environment variables
```bash
# Copy the environment template
cp .env.new-server .env

# Edit with your new server details
nano .env
```

### 3. Import the data
```bash
# Make the import script executable
chmod +x import-to-new-server.sh

# Run the import
./import-to-new-server.sh
```

### 4. Update your application
- Update your application's environment variables to point to the new server
- Test the connection
- Verify all data is accessible

## Verification
After migration, check:
- [ ] Application loads correctly
- [ ] All patients are visible
- [ ] All staff members are visible
- [ ] All appointments are visible
- [ ] Authentication works
- [ ] File uploads work (if using storage)

## Troubleshooting
- If import fails, check database connection
- If data is missing, check individual table files
- If auth doesn't work, verify JWT secrets match
- If storage doesn't work, check storage configuration

## Rollback
If something goes wrong, you can always:
1. Stop the new server
2. Revert environment variables
3. Restart your local server
4. Your local data remains unchanged
EOF

    echo -e "${GREEN}✅ Migration instructions created${NC}"
}

# Main execution
main() {
    check_database
    export_database
    export_app_data
    create_import_script
    create_env_template
    create_instructions

    # Create archive
    echo -e "${YELLOW}📦 Creating migration archive...${NC}"
    cd "${EXPORT_DIR}"
    tar -czf "${EXPORT_NAME}.tar.gz" "${EXPORT_NAME}/"
    cd ..

    echo -e "${GREEN}🎉 Data export completed successfully!${NC}"
    echo -e "${GREEN}📁 Export location: ${EXPORT_DIR}/${EXPORT_NAME}${NC}"
    echo -e "${GREEN}📦 Archive: ${EXPORT_DIR}/${EXPORT_NAME}.tar.gz${NC}"
    echo -e "${BLUE}📖 Next steps:${NC}"
    echo -e "   1. Copy the archive to your new server"
    echo -e "   2. Extract the files"
    echo -e "   3. Follow the MIGRATION_INSTRUCTIONS.md"
    echo -e "   4. Update your app's environment variables"
}

# Run main function
main "$@"
