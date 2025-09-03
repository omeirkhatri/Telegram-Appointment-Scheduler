#!/bin/bash

# MediCare Scheduler - Migration Rollback Script
# This script rolls back a failed cloud migration

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

    print_success "Prerequisites check passed"
}

# Function to check if linked to cloud
check_cloud_link() {
    print_status "Checking cloud project link..."

    if supabase status --linked &> /dev/null; then
        local project_ref=$(supabase status --linked | grep "Project ref" | awk '{print $3}')
        if [ -n "$project_ref" ]; then
            print_warning "Currently linked to cloud project: $project_ref"
            return 0
        fi
    fi

    print_status "Not linked to any cloud project"
    return 1
}

# Function to backup current state
backup_current_state() {
    print_status "Creating backup of current state..."

    local backup_dir="./rollback-backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${backup_dir}/rollback_backup_${timestamp}.sql"

    mkdir -p "$backup_dir"

    # Check if local Supabase is running
    if supabase status &> /dev/null; then
        if supabase db dump --local > "$backup_file"; then
            print_success "Current state backed up to: $backup_file"
        else
            print_warning "Failed to backup current state"
        fi
    else
        print_warning "Local Supabase not running, skipping backup"
    fi
}

# Function to unlink from cloud
unlink_from_cloud() {
    print_status "Unlinking from cloud project..."

    if supabase unlink; then
        print_success "Successfully unlinked from cloud project"
    else
        print_error "Failed to unlink from cloud project"
        exit 1
    fi
}

# Function to restore local environment
restore_local_environment() {
    print_status "Restoring local environment configuration..."

    # Find the most recent backup of .env.local
    local env_backup=$(ls -t .env.local.backup.* 2>/dev/null | head -n1)

    if [ -n "$env_backup" ]; then
        if cp "$env_backup" .env.local; then
            print_success "Environment configuration restored from: $env_backup"
        else
            print_error "Failed to restore environment configuration"
            exit 1
        fi
    else
        print_warning "No environment backup found. Please restore manually."

        # Create a basic local environment file
        if [ ! -f ".env.local" ]; then
            print_status "Creating basic local environment file..."
            cat > .env.local << EOF
# Local Development Environment
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
TZ=Asia/Dubai
EOF
            print_success "Basic local environment file created"
        fi
    fi
}

# Function to restart local services
restart_local_services() {
    print_status "Restarting local services..."

    # Stop any running services
    if supabase stop &> /dev/null; then
        print_success "Local services stopped"
    fi

    # Start local services
    if supabase start; then
        print_success "Local services started"
    else
        print_error "Failed to start local services"
        exit 1
    fi
}

# Function to restore local database
restore_local_database() {
    print_status "Restoring local database..."

    # Check if we have a backup to restore from
    local backup_dir="./migration-backups"
    if [ -d "$backup_dir" ]; then
        local latest_backup=$(ls -t "$backup_dir"/local_backup_*.sql 2>/dev/null | head -n1)

        if [ -n "$latest_backup" ]; then
            print_status "Found backup: $latest_backup"
            read -p "Do you want to restore from this backup? (y/n): " restore_choice

            if [ "$restore_choice" = "y" ] || [ "$restore_choice" = "Y" ]; then
                if psql "postgresql://postgres:postgres@localhost:54322/postgres" < "$latest_backup"; then
                    print_success "Local database restored from backup"
                else
                    print_error "Failed to restore local database"
                    exit 1
                fi
            else
                print_status "Skipping database restore"
            fi
        else
            print_warning "No backup found in $backup_dir"
        fi
    else
        print_warning "No backup directory found"
    fi
}

# Function to validate local setup
validate_local_setup() {
    print_status "Validating local setup..."

    # Check if local Supabase is running
    if ! supabase status &> /dev/null; then
        print_error "Local Supabase is not running"
        exit 1
    fi

    # Test database connection
    if psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT 1;" &> /dev/null; then
        print_success "Local database connection validated"
    else
        print_error "Local database connection failed"
        exit 1
    fi

    # Check if tables exist
    local tables=$(psql "postgresql://postgres:postgres@localhost:54322/postgres" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

    if [ "$tables" -gt 0 ]; then
        print_success "Local database tables validated ($tables tables found)"
    else
        print_warning "No tables found in local database"
    fi

    # Test environment variables
    if [ -f ".env.local" ]; then
        if grep -q "NEXT_PUBLIC_SUPABASE_URL=.*127.0.0.1\|localhost" .env.local; then
            print_success "Environment variables configured for local development"
        else
            print_warning "Environment variables may not be configured for local development"
        fi
    else
        print_error ".env.local file not found"
        exit 1
    fi
}

# Function to clean up migration artifacts
cleanup_migration_artifacts() {
    print_status "Cleaning up migration artifacts..."

    # Remove any temporary migration files
    rm -f .env.local.bak

    # Clean up any temporary directories
    rm -rf ./temp_restore_*

    print_success "Migration artifacts cleaned up"
}

# Function to show rollback summary
show_summary() {
    echo ""
    print_success "=== Rollback Summary ==="
    echo "✅ Unlinked from cloud project"
    echo "✅ Environment configuration restored"
    echo "✅ Local services restarted"
    echo "✅ Local database validated"
    echo "✅ Migration artifacts cleaned up"
    echo ""
    print_status "Rollback completed successfully!"
    echo ""
    print_warning "Important: You are now back to local development mode."
    echo "Your application should be accessible at: http://localhost:3000"
    echo ""
    print_status "Next steps:"
    echo "1. Test your application to ensure everything is working"
    echo "2. Review what went wrong with the migration"
    echo "3. Fix any issues before attempting migration again"
    echo "4. Consider creating a fresh backup before retrying"
}

# Function to show help
show_help() {
    echo "MediCare Scheduler - Migration Rollback Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --no-backup      Don't create backup of current state"
    echo "  --no-restore     Don't restore from backup"
    echo "  --force          Force rollback without confirmation"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full rollback (default)"
    echo "  $0 --no-backup        # Skip backup creation"
    echo "  $0 --no-restore       # Skip database restore"
    echo "  $0 --force            # Force rollback without confirmation"
    echo ""
    echo "Prerequisites:"
    echo "  - Supabase CLI installed"
    echo "  - Access to local development environment"
    echo ""
    echo "Warning: This script will:"
    echo "  - Unlink from cloud project"
    echo "  - Restore local environment configuration"
    echo "  - Restart local services"
    echo "  - Optionally restore local database from backup"
}

# Function to confirm rollback
confirm_rollback() {
    echo ""
    print_warning "This will rollback your cloud migration and return to local development."
    echo ""
    print_warning "The following actions will be performed:"
    echo "  - Unlink from cloud project"
    echo "  - Restore local environment configuration"
    echo "  - Restart local services"
    echo "  - Optionally restore local database from backup"
    echo ""

    read -p "Are you sure you want to proceed? (y/n): " confirm

    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_status "Rollback cancelled"
        exit 0
    fi
}

# Main rollback function
perform_rollback() {
    local no_backup=false
    local no_restore=false
    local force=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-backup)
                no_backup=true
                shift
                ;;
            --no-restore)
                no_restore=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    print_status "Starting migration rollback..."

    check_prerequisites

    if [ "$force" = false ]; then
        confirm_rollback
    fi

    if [ "$no_backup" = false ]; then
        backup_current_state
    fi

    if check_cloud_link; then
        unlink_from_cloud
    else
        print_status "Not linked to cloud, skipping unlink step"
    fi

    restore_local_environment
    restart_local_services

    if [ "$no_restore" = false ]; then
        restore_local_database
    fi

    validate_local_setup
    cleanup_migration_artifacts

    show_summary
}

# Run main function with all arguments
perform_rollback "$@"
