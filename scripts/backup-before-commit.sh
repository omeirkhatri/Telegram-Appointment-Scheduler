#!/bin/bash

# Backup script to run before commits
# This script creates a timestamped backup of all critical data

set -e

# Configuration
BACKUP_DIR="data-export"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="pre_commit_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Creating pre-commit backup...${NC}"

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Check if Supabase is running
if ! docker ps | grep -q "supabase_db_bestdoc-scheduler"; then
    echo -e "${RED}❌ Supabase database is not running. Please start it first.${NC}"
    exit 1
fi

# Export database schema
echo -e "${YELLOW}📋 Exporting database schema...${NC}"
supabase db dump --local --role-only > "${BACKUP_PATH}/roles.sql"
supabase db dump --local -s public > "${BACKUP_PATH}/schema.sql"

# Export all data
echo -e "${YELLOW}📊 Exporting all data...${NC}"
supabase db dump --local --data-only > "${BACKUP_PATH}/data.sql"

# Export specific tables (for easier restoration)
echo -e "${YELLOW}👥 Exporting staff data...${NC}"
supabase db dump --local --data-only -x public.appointment_staff,public.appointments,public.patients > "${BACKUP_PATH}/staff_data.sql"

echo -e "${YELLOW}📅 Exporting appointments data...${NC}"
supabase db dump --local --data-only -x public.appointment_staff,public.staff,public.patients > "${BACKUP_PATH}/appointments_data.sql"

echo -e "${YELLOW}🔗 Exporting appointment_staff data...${NC}"
supabase db dump --local --data-only -x public.staff,public.appointments,public.patients > "${BACKUP_PATH}/appointment_staff_data.sql"

echo -e "${YELLOW}👤 Exporting patients data...${NC}"
supabase db dump --local --data-only -x public.staff,public.appointments,public.appointment_staff > "${BACKUP_PATH}/patients_data.sql"

# Create a comprehensive backup file
echo -e "${YELLOW}📦 Creating comprehensive backup...${NC}"
cat "${BACKUP_PATH}/schema.sql" "${BACKUP_PATH}/data.sql" > "${BACKUP_PATH}/full_backup.sql"

# Create restoration script
cat > "${BACKUP_PATH}/restore.sh" << 'EOF'
#!/bin/bash
# Restoration script for pre-commit backup

set -e

echo "🔄 Restoring database from backup..."

# Check if Supabase is running
if ! docker ps | grep -q "supabase_db_bestdoc-scheduler"; then
    echo "❌ Supabase database is not running. Please start it first."
    exit 1
fi

# Restore the full backup
echo "📥 Restoring full backup..."
supabase db reset --no-seed

# Apply the backup data
echo "📊 Applying backup data..."
psql -h localhost -p 54322 -U postgres -d postgres -f full_backup.sql

echo "✅ Database restored successfully!"
EOF

chmod +x "${BACKUP_PATH}/restore.sh"

# Create backup info file
cat > "${BACKUP_PATH}/BACKUP_INFO.md" << EOF
# Pre-Commit Backup

**Created:** $(date)
**Branch:** $(git branch --show-current)
**Commit:** $(git rev-parse HEAD)
**Commit Message:** $(git log -1 --pretty=%B)

## Files Included
- \`schema.sql\` - Database schema
- \`data.sql\` - All data
- \`full_backup.sql\` - Complete backup (schema + data)
- \`staff_data.sql\` - Staff table data only
- \`appointments_data.sql\` - Appointments table data only
- \`appointment_staff_data.sql\` - Appointment-staff relationships
- \`patients_data.sql\` - Patients table data only
- \`restore.sh\` - Restoration script

## How to Restore
\`\`\`bash
cd ${BACKUP_PATH}
./restore.sh
\`\`\`

## Manual Restoration
\`\`\`bash
# Reset database
supabase db reset --no-seed

# Apply backup
psql -h localhost -p 54322 -U postgres -d postgres -f full_backup.sql
\`\`\`
EOF

# Create symlink to latest backup
ln -sfn "${BACKUP_NAME}" "${BACKUP_DIR}/latest_backup"

echo -e "${GREEN}✅ Pre-commit backup created successfully!${NC}"
echo -e "${GREEN}📁 Backup location: ${BACKUP_PATH}${NC}"
echo -e "${GREEN}🔗 Latest backup: ${BACKUP_DIR}/latest_backup${NC}"

# Show backup size
BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
echo -e "${GREEN}📊 Backup size: ${BACKUP_SIZE}${NC}"
