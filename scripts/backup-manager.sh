#!/bin/bash

# Comprehensive backup management script
# This script provides various backup operations and utilities

set -e

# Configuration
BACKUP_DIR="data-export"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Functions
show_help() {
    echo -e "${BLUE}🗄️  Backup Manager for BestDOC Scheduler${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create [name]     Create a new backup (optional name)"
    echo "  list              List all available backups"
    echo "  restore <name>    Restore from a specific backup"
    echo "  latest            Restore from the latest backup"
    echo "  clean [days]      Clean backups older than N days (default: 30)"
    echo "  status            Show backup status and disk usage"
    echo "  help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create                    # Create backup with timestamp"
    echo "  $0 create before-migration  # Create named backup"
    echo "  $0 restore 20250120_143022  # Restore specific backup"
    echo "  $0 latest                   # Restore latest backup"
    echo "  $0 clean 7                  # Clean backups older than 7 days"
}

create_backup() {
    local backup_name="${1:-backup_${TIMESTAMP}}"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    echo -e "${YELLOW}🔄 Creating backup: ${backup_name}${NC}"

    # Create backup directory
    mkdir -p "${backup_path}"

    # Check if Supabase is running
    if ! docker ps | grep -q "supabase_db_bestdoc-scheduler"; then
        echo -e "${RED}❌ Supabase database is not running. Please start it first.${NC}"
        exit 1
    fi

    # Export database
    echo -e "${YELLOW}📋 Exporting database...${NC}"
    supabase db dump --local --role-only > "${backup_path}/roles.sql"
    supabase db dump --local -s public > "${backup_path}/schema.sql"
    supabase db dump --local --data-only > "${backup_path}/data.sql"

    # Export individual tables
    echo -e "${YELLOW}👥 Exporting individual tables...${NC}"
    for table in staff appointments appointment_staff patients; do
        # Create a temporary file with all tables except the target
        local exclude_tables=""
        for other_table in staff appointments appointment_staff patients; do
            if [ "$other_table" != "$table" ]; then
                if [ -n "$exclude_tables" ]; then
                    exclude_tables="${exclude_tables},"
                fi
                exclude_tables="${exclude_tables}public.${other_table}"
            fi
        done
        supabase db dump --local --data-only -x "$exclude_tables" > "${backup_path}/${table}_data.sql"
    done

    # Create full backup
    cat "${backup_path}/schema.sql" "${backup_path}/data.sql" > "${backup_path}/full_backup.sql"

    # Create restoration script
    cat > "${backup_path}/restore.sh" << 'EOF'
#!/bin/bash
set -e
echo "🔄 Restoring database from backup..."
if ! docker ps | grep -q "supabase_db_bestdoc-scheduler"; then
    echo "❌ Supabase database is not running. Please start it first."
    exit 1
fi
supabase db reset --no-seed
psql -h localhost -p 54322 -U postgres -d postgres -f full_backup.sql
echo "✅ Database restored successfully!"
EOF
    chmod +x "${backup_path}/restore.sh"

    # Create backup info
    cat > "${backup_path}/BACKUP_INFO.md" << EOF
# Backup: ${backup_name}

**Created:** $(date)
**Branch:** $(git branch --show-current 2>/dev/null || echo "unknown")
**Commit:** $(git rev-parse HEAD 2>/dev/null || echo "unknown")
**Commit Message:** $(git log -1 --pretty=%B 2>/dev/null || echo "unknown")

## Files
- \`schema.sql\` - Database schema
- \`data.sql\` - All data
- \`full_backup.sql\` - Complete backup
- \`*_data.sql\` - Individual table data
- \`restore.sh\` - Restoration script
EOF

    # Update latest symlink
    ln -sfn "${backup_name}" "${BACKUP_DIR}/latest_backup"

    echo -e "${GREEN}✅ Backup created: ${backup_path}${NC}"
    echo -e "${GREEN}📊 Size: $(du -sh "${backup_path}" | cut -f1)${NC}"
}

list_backups() {
    echo -e "${BLUE}📋 Available Backups:${NC}"
    echo ""

    if [ ! -d "${BACKUP_DIR}" ] || [ -z "$(ls -A "${BACKUP_DIR}" 2>/dev/null)" ]; then
        echo -e "${YELLOW}No backups found.${NC}"
        return
    fi

    # List backups with details
    for backup in "${BACKUP_DIR}"/*/; do
        if [ -d "$backup" ]; then
            backup_name=$(basename "$backup")
            backup_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d' ' -f1-2)
            backup_size=$(du -sh "$backup" | cut -f1)

            # Check if it's the latest
            if [ "$backup_name" = "$(readlink "${BACKUP_DIR}/latest_backup" 2>/dev/null || echo "")" ]; then
                echo -e "${GREEN}📁 ${backup_name} (LATEST) - ${backup_date} - ${backup_size}${NC}"
            else
                echo -e "📁 ${backup_name} - ${backup_date} - ${backup_size}"
            fi
        fi
    done
}

restore_backup() {
    local backup_name="$1"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    if [ -z "$backup_name" ]; then
        echo -e "${RED}❌ Please specify a backup name.${NC}"
        echo "Use '$0 list' to see available backups."
        exit 1
    fi

    if [ ! -d "$backup_path" ]; then
        echo -e "${RED}❌ Backup '${backup_name}' not found.${NC}"
        echo "Use '$0 list' to see available backups."
        exit 1
    fi

    echo -e "${YELLOW}⚠️  This will restore the database from backup: ${backup_name}${NC}"
    echo -e "${YELLOW}⚠️  Current data will be lost!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🔄 Restoring from backup...${NC}"
        cd "$backup_path"
        ./restore.sh
        echo -e "${GREEN}✅ Restore completed!${NC}"
    else
        echo -e "${BLUE}ℹ️  Restore cancelled.${NC}"
    fi
}

clean_backups() {
    local days="${1:-30}"
    echo -e "${YELLOW}🧹 Cleaning backups older than ${days} days...${NC}"

    if [ ! -d "${BACKUP_DIR}" ]; then
        echo -e "${YELLOW}No backup directory found.${NC}"
        return
    fi

    # Find and remove old backups
    find "${BACKUP_DIR}" -maxdepth 1 -type d -name "backup_*" -mtime +${days} -exec rm -rf {} \;
    find "${BACKUP_DIR}" -maxdepth 1 -type d -name "pre_commit_backup_*" -mtime +${days} -exec rm -rf {} \;

    echo -e "${GREEN}✅ Cleanup completed!${NC}"
}

show_status() {
    echo -e "${BLUE}📊 Backup Status:${NC}"
    echo ""

    if [ ! -d "${BACKUP_DIR}" ]; then
        echo -e "${YELLOW}No backup directory found.${NC}"
        return
    fi

    # Count backups
    local total_backups=$(find "${BACKUP_DIR}" -maxdepth 1 -type d | wc -l | tr -d ' ')
    local total_size=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1 || echo "0")

    echo -e "📁 Total backups: ${total_backups}"
    echo -e "💾 Total size: ${total_size}"
    echo ""

    # Show latest backup
    if [ -L "${BACKUP_DIR}/latest_backup" ]; then
        local latest=$(readlink "${BACKUP_DIR}/latest_backup")
        local latest_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "${BACKUP_DIR}/${latest}" 2>/dev/null || stat -c "%y" "${BACKUP_DIR}/${latest}" 2>/dev/null | cut -d' ' -f1-2)
        echo -e "🕒 Latest backup: ${latest} (${latest_date})"
    else
        echo -e "${YELLOW}No latest backup found.${NC}"
    fi
}

# Main script logic
case "${1:-help}" in
    create)
        create_backup "$2"
        ;;
    list)
        list_backups
        ;;
    restore)
        restore_backup "$2"
        ;;
    latest)
        if [ -L "${BACKUP_DIR}/latest_backup" ]; then
            restore_backup "$(readlink "${BACKUP_DIR}/latest_backup")"
        else
            echo -e "${RED}❌ No latest backup found.${NC}"
            exit 1
        fi
        ;;
    clean)
        clean_backups "$2"
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
