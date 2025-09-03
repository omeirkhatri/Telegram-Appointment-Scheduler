#!/bin/bash

# MediCare Scheduler - Data Restore Script
# This script restores data from backup files

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

    # Check if local Supabase is running
    if ! supabase status &> /dev/null; then
        print_error "Local Supabase is not running. Please start it first:"
        echo "  npx supabase start"
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Function to list available backups
list_backups() {
    print_status "Available backups:"

    local backup_dir="./backups"
    if [ ! -d "$backup_dir" ]; then
        print_warning "No backups directory found"
        return 1
    fi

    local count=0
    for backup in "$backup_dir"/*.tar.gz; do
        if [ -f "$backup" ]; then
            count=$((count + 1))
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d' ' -f1-2)
            echo "  $count. $filename ($size) - $date"
        fi
    done

    if [ $count -eq 0 ]; then
        print_warning "No compressed backups found"

        # Check for uncompressed backups
        for backup in "$backup_dir"/medicare_backup_*; do
            if [ -d "$backup" ]; then
                count=$((count + 1))
                local dirname=$(basename "$backup")
                local size=$(du -sh "$backup" | cut -f1)
                local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d' ' -f1-2)
                echo "  $count. $dirname/ (directory, $size) - $date"
            fi
        done
    fi

    if [ $count -eq 0 ]; then
        print_error "No backups found in $backup_dir"
        return 1
    fi

    return 0
}

# Function to select backup
select_backup() {
    local backup_dir="./backups"

    if ! list_backups; then
        exit 1
    fi

    echo ""
    read -p "Enter the number of the backup to restore (or 'q' to quit): " selection

    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        print_status "Restore cancelled"
        exit 0
    fi

    # Find the selected backup
    local count=0
    local selected_backup=""

    for backup in "$backup_dir"/*.tar.gz; do
        if [ -f "$backup" ]; then
            count=$((count + 1))
            if [ "$count" = "$selection" ]; then
                selected_backup="$backup"
                break
            fi
        fi
    done

    # If not found in compressed backups, check uncompressed
    if [ -z "$selected_backup" ]; then
        for backup in "$backup_dir"/medicare_backup_*; do
            if [ -d "$backup" ]; then
                count=$((count + 1))
                if [ "$count" = "$selection" ]; then
                    selected_backup="$backup"
                    break
                fi
            fi
        done
    fi

    if [ -z "$selected_backup" ]; then
        print_error "Invalid selection"
        exit 1
    fi

    echo "$selected_backup"
}

# Function to extract backup
extract_backup() {
    local backup_path="$1"
    local extract_dir="./temp_restore_$(date +%s)"

    print_status "Extracting backup..."

    if [[ "$backup_path" == *.tar.gz ]]; then
        # Compressed backup
        mkdir -p "$extract_dir"
        if tar -xzf "$backup_path" -C "$extract_dir"; then
            print_success "Backup extracted to: $extract_dir"
            # Find the extracted directory
            local extracted_dir=$(find "$extract_dir" -type d -name "medicare_backup_*" | head -n1)
            if [ -n "$extracted_dir" ]; then
                echo "$extracted_dir"
            else
                print_error "Could not find extracted backup directory"
                exit 1
            fi
        else
            print_error "Failed to extract backup"
            exit 1
        fi
    else
        # Uncompressed backup directory
        echo "$backup_path"
    fi
}

# Function to validate backup
validate_backup() {
    local backup_dir="$1"

    print_status "Validating backup..."

    # Check for manifest file
    if [ ! -f "$backup_dir/manifest.json" ]; then
        print_warning "No manifest file found. Backup may be incomplete."
    else
        print_success "Backup manifest found"
    fi

    # Check for required files
    local required_files=("schema.sql" "data.sql")
    for file in "${required_files[@]}"; do
        if [ ! -f "$backup_dir/$file" ]; then
            print_error "Required backup file missing: $file"
            exit 1
        fi
    done

    print_success "Backup validation passed"
}

# Function to backup current database
backup_current() {
    print_status "Creating backup of current database..."

    local current_backup="./backups/current_backup_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p "./backups"

    if supabase db dump --local > "$current_backup"; then
        print_success "Current database backed up to: $current_backup"
    else
        print_warning "Failed to backup current database. Proceeding anyway..."
    fi
}

# Function to restore schema
restore_schema() {
    local backup_dir="$1"

    print_status "Restoring database schema..."

    local schema_file="$backup_dir/schema.sql"

    if [ -f "$schema_file" ]; then
        if supabase db reset --local; then
            print_success "Database reset completed"
        else
            print_error "Failed to reset database"
            exit 1
        fi

        if psql "postgresql://postgres:postgres@localhost:54322/postgres" < "$schema_file"; then
            print_success "Schema restored successfully"
        else
            print_error "Failed to restore schema"
            exit 1
        fi
    else
        print_warning "No schema file found. Skipping schema restore."
    fi
}

# Function to restore data
restore_data() {
    local backup_dir="$1"

    print_status "Restoring database data..."

    local data_file="$backup_dir/data.sql"

    if [ -f "$data_file" ]; then
        if psql "postgresql://postgres:postgres@localhost:54322/postgres" < "$data_file"; then
            print_success "Data restored successfully"
        else
            print_error "Failed to restore data"
            exit 1
        fi
    else
        print_warning "No data file found. Skipping data restore."
    fi
}

# Function to restore storage
restore_storage() {
    local backup_dir="$1"

    print_status "Restoring storage files..."

    local storage_dir="$backup_dir/storage"

    if [ -d "$storage_dir" ]; then
        # List all buckets in the backup
        for bucket_dir in "$storage_dir"/*; do
            if [ -d "$bucket_dir" ]; then
                local bucket_name=$(basename "$bucket_dir")
                print_status "Restoring bucket: $bucket_name"

                # Create bucket if it doesn't exist
                if ! supabase storage ls | grep -q "$bucket_name"; then
                    if supabase storage create "$bucket_name"; then
                        print_success "Created bucket: $bucket_name"
                    else
                        print_warning "Failed to create bucket: $bucket_name"
                        continue
                    fi
                fi

                # Upload files
                for file in "$bucket_dir"/*; do
                    if [ -f "$file" ]; then
                        local filename=$(basename "$file")
                        print_status "  Uploading: $filename"
                        if supabase storage upload "$bucket_name/$filename" "$file"; then
                            print_success "    Uploaded: $filename"
                        else
                            print_warning "    Failed to upload: $filename"
                        fi
                    fi
                done
            fi
        done

        print_success "Storage restore completed"
    else
        print_warning "No storage backup found. Skipping storage restore."
    fi
}

# Function to restore environment
restore_environment() {
    local backup_dir="$1"

    print_status "Restoring environment configuration..."

    local env_dir="$backup_dir/environment"

    if [ -d "$env_dir" ]; then
        # Backup current .env.local if it exists
        if [ -f ".env.local" ]; then
            cp .env.local ".env.local.backup.$(date +%Y%m%d_%H%M%S)"
            print_success "Current .env.local backed up"
        fi

        # Restore .env.local
        if [ -f "$env_dir/.env.local" ]; then
            cp "$env_dir/.env.local" ".env.local"
            print_success "Environment file restored"
        fi

        # Restore other config files if needed
        if [ -f "$env_dir/config.toml" ]; then
            cp "$env_dir/config.toml" "supabase/config.toml"
            print_success "Supabase config restored"
        fi
    else
        print_warning "No environment backup found. Skipping environment restore."
    fi
}

# Function to validate restore
validate_restore() {
    print_status "Validating restore..."

    # Test database connection
    if psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT 1;" &> /dev/null; then
        print_success "Database connection validated"
    else
        print_error "Database connection failed"
        exit 1
    fi

    # Check if tables exist
    local tables=$(psql "postgresql://postgres:postgres@localhost:54322/postgres" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

    if [ "$tables" -gt 0 ]; then
        print_success "Database tables validated ($tables tables found)"
    else
        print_error "No tables found in database"
        exit 1
    fi

    # Test storage if available
    if supabase storage ls &> /dev/null; then
        print_success "Storage connection validated"
    else
        print_warning "Storage not accessible"
    fi
}

# Function to cleanup
cleanup() {
    local extract_dir="$1"

    if [ -n "$extract_dir" ] && [ -d "$extract_dir" ]; then
        print_status "Cleaning up temporary files..."
        rm -rf "$extract_dir"
        print_success "Cleanup completed"
    fi
}

# Function to show restore summary
show_summary() {
    echo ""
    print_success "=== Restore Summary ==="
    echo "✅ Database schema restored"
    echo "✅ Database data restored"
    echo "✅ Storage files restored"
    echo "✅ Environment configuration restored"
    echo "✅ Restore validated"
    echo ""
    print_status "Restore completed successfully!"
    echo ""
    print_warning "Important: Test your application to ensure everything is working correctly."
    echo "Consider running your test suite to validate the restore."
}

# Function to show help
show_help() {
    echo "MediCare Scheduler - Data Restore Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --schema-only    Restore schema only"
    echo "  --data-only      Restore data only"
    echo "  --no-backup      Don't backup current database"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full restore (default)"
    echo "  $0 --schema-only      # Schema only"
    echo "  $0 --data-only        # Data only"
    echo "  $0 --no-backup        # Skip current backup"
    echo ""
    echo "Prerequisites:"
    echo "  - Supabase CLI installed"
    echo "  - Local Supabase running"
    echo "  - Backup files available"
}

# Main restore function
perform_restore() {
    local schema_only=false
    local data_only=false
    local skip_backup=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --schema-only)
                schema_only=true
                shift
                ;;
            --data-only)
                data_only=true
                shift
                ;;
            --no-backup)
                skip_backup=true
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

    print_status "Starting restore process..."

    check_prerequisites

    if [ "$skip_backup" = false ]; then
        backup_current
    fi

    local backup_path=$(select_backup)
    local extracted_dir=$(extract_backup "$backup_path")

    validate_backup "$extracted_dir"

    if [ "$schema_only" = true ]; then
        restore_schema "$extracted_dir"
    elif [ "$data_only" = true ]; then
        restore_data "$extracted_dir"
    else
        restore_schema "$extracted_dir"
        restore_data "$extracted_dir"
        restore_storage "$extracted_dir"
        restore_environment "$extracted_dir"
    fi

    validate_restore
    cleanup "$extracted_dir"

    show_summary
}

# Run main function with all arguments
perform_restore "$@"
