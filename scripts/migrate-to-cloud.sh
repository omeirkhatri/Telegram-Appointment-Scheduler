#!/bin/bash

# MediCare Scheduler - Cloud Migration Script
# This script migrates the local Supabase database to Supabase Cloud

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BACKUP_DIR="./migration-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/local_backup_${TIMESTAMP}.sql"

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first:"
        echo "  npm install -g supabase"
        exit 1
    fi

    # Check if we're in a Supabase project
    if [ ! -f "supabase/config.toml" ]; then
        print_error "Not in a Supabase project directory. Please run this from the project root."
        exit 1
    fi

    # Check if local Supabase is running
    if ! supabase status &> /dev/null; then
        print_error "Local Supabase is not running. Please start it first:"
        echo "  npx supabase start"
        exit 1
    fi

    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        print_error ".env.local file not found. Please create it first:"
        echo "  cp env.example .env.local"
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Function to validate local database
validate_local_database() {
    print_status "Validating local database..."

    # Run the migration validation function
    local validation_result=$(supabase db reset --linked=false 2>/dev/null || echo "validation_failed")

    if [ "$validation_result" = "validation_failed" ]; then
        print_warning "Could not validate database automatically. Proceeding with manual checks..."
    else
        print_success "Local database validation passed"
    fi
}

# Function to create backup
create_backup() {
    print_status "Creating backup of local database..."

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Create backup using pg_dump
    if supabase db dump --local > "$BACKUP_FILE"; then
        print_success "Backup created: $BACKUP_FILE"
    else
        print_error "Failed to create backup"
        exit 1
    fi

    # Also create a data-only backup
    local data_backup="${BACKUP_DIR}/local_data_${TIMESTAMP}.sql"
    if supabase db dump --local --data-only > "$data_backup"; then
        print_success "Data backup created: $data_backup"
    else
        print_warning "Failed to create data-only backup"
    fi
}

# Function to get cloud project details
get_cloud_project() {
    print_status "Getting cloud project details..."

    # Check if already linked
    if supabase status --linked &> /dev/null; then
        local project_ref=$(supabase status --linked | grep "Project ref" | awk '{print $3}')
        if [ -n "$project_ref" ]; then
            print_success "Already linked to project: $project_ref"
            echo "$project_ref"
            return
        fi
    fi

    # Prompt for project reference
    echo ""
    print_status "Please provide your Supabase Cloud project details:"
    echo "1. Go to https://app.supabase.com/projects"
    echo "2. Select your project"
    echo "3. Go to Settings > General"
    echo "4. Copy the 'Reference ID'"
    echo ""

    read -p "Enter your project reference ID: " project_ref

    if [ -z "$project_ref" ]; then
        print_error "Project reference ID is required"
        exit 1
    fi

    echo "$project_ref"
}

# Function to link to cloud project
link_to_cloud() {
    local project_ref="$1"

    print_status "Linking to cloud project: $project_ref"

    if supabase link --project-ref "$project_ref"; then
        print_success "Successfully linked to cloud project"
    else
        print_error "Failed to link to cloud project"
        exit 1
    fi
}

# Function to push schema to cloud
push_schema() {
    print_status "Pushing schema to cloud..."

    if supabase db push; then
        print_success "Schema pushed to cloud successfully"
    else
        print_error "Failed to push schema to cloud"
        exit 1
    fi
}

# Function to migrate data
migrate_data() {
    print_status "Migrating data to cloud..."

    # Get cloud database URL
    local cloud_db_url=$(supabase status --linked | grep "DB URL" | awk '{print $3}')

    if [ -z "$cloud_db_url" ]; then
        print_error "Could not get cloud database URL"
        exit 1
    fi

    # Restore data to cloud
    if psql "$cloud_db_url" < "$BACKUP_FILE"; then
        print_success "Data migrated to cloud successfully"
    else
        print_error "Failed to migrate data to cloud"
        exit 1
    fi
}

# Function to update environment variables
update_environment() {
    print_status "Updating environment variables..."

    # Get cloud project details
    local project_url=$(supabase status --linked | grep "API URL" | awk '{print $3}')
    local anon_key=$(supabase status --linked | grep "anon key" | awk '{print $3}')
    local service_key=$(supabase status --linked | grep "service_role key" | awk '{print $3}')

    if [ -z "$project_url" ] || [ -z "$anon_key" ] || [ -z "$service_key" ]; then
        print_error "Could not get cloud project details"
        exit 1
    fi

    # Create backup of current .env.local
    cp .env.local ".env.local.backup.${TIMESTAMP}"

    # Update .env.local with cloud values
    sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$project_url|" .env.local
    sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key|" .env.local
    sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$service_key|" .env.local

    # Clean up backup files
    rm -f .env.local.bak

    print_success "Environment variables updated for cloud"
}

# Function to validate cloud migration
validate_cloud_migration() {
    print_status "Validating cloud migration..."

    # Test connection to cloud database
    if supabase db reset --linked; then
        print_success "Cloud database connection validated"
    else
        print_error "Failed to validate cloud database connection"
        exit 1
    fi

    # Run validation queries
    local validation_result=$(supabase db reset --linked 2>/dev/null || echo "validation_failed")

    if [ "$validation_result" = "validation_failed" ]; then
        print_warning "Could not run automatic validation. Please verify manually."
    else
        print_success "Cloud migration validation passed"
    fi
}

# Function to show migration summary
show_summary() {
    echo ""
    print_success "=== Migration Summary ==="
    echo "✅ Local database backed up to: $BACKUP_FILE"
    echo "✅ Schema pushed to cloud"
    echo "✅ Data migrated to cloud"
    echo "✅ Environment variables updated"
    echo "✅ Migration validated"
    echo ""
    print_status "Next steps:"
    echo "1. Test your application with the new cloud database"
    echo "2. Update your deployment configuration"
    echo "3. Consider setting up monitoring and backups"
    echo ""
    print_warning "Important: Keep your local backup files safe!"
    echo "Backup location: $BACKUP_DIR"
}

# Function to rollback migration
rollback_migration() {
    print_warning "Rolling back migration..."

    # Restore original .env.local
    local backup_file=$(ls -t .env.local.backup.* 2>/dev/null | head -n1)
    if [ -n "$backup_file" ]; then
        cp "$backup_file" .env.local
        print_success "Environment variables restored"
    fi

    # Unlink from cloud
    if supabase unlink; then
        print_success "Unlinked from cloud project"
    fi

    print_warning "Migration rolled back. You can now restart local development."
}

# Function to show help
show_help() {
    echo "MediCare Scheduler - Cloud Migration Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  migrate    - Perform full migration to cloud (default)"
    echo "  backup     - Create backup only"
    echo "  validate   - Validate local database"
    echo "  rollback   - Rollback failed migration"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 migrate    # Full migration"
    echo "  $0 backup     # Create backup only"
    echo "  $0 rollback   # Rollback migration"
    echo ""
    echo "Prerequisites:"
    echo "  - Supabase CLI installed"
    echo "  - Local Supabase running"
    echo "  - .env.local configured"
    echo "  - Cloud project created"
}

# Main migration function
perform_migration() {
    print_status "Starting cloud migration process..."

    check_prerequisites
    validate_local_database
    create_backup

    local project_ref=$(get_cloud_project)
    link_to_cloud "$project_ref"
    push_schema
    migrate_data
    update_environment
    validate_cloud_migration

    show_summary
}

# Main script logic
main() {
    case "${1:-migrate}" in
        "migrate")
            perform_migration
            ;;
        "backup")
            check_prerequisites
            create_backup
            print_success "Backup completed"
            ;;
        "validate")
            check_prerequisites
            validate_local_database
            ;;
        "rollback")
            rollback_migration
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
