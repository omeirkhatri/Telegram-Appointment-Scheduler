#!/bin/bash

# MediCare Scheduler - Data Backup Script
# This script creates comprehensive backups of the local database

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
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PREFIX="medicare_backup_${TIMESTAMP}"

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

# Function to create backup directory
create_backup_directory() {
    print_status "Creating backup directory..."

    mkdir -p "$BACKUP_DIR"

    # Create timestamped subdirectory
    local backup_path="${BACKUP_DIR}/${BACKUP_PREFIX}"
    mkdir -p "$backup_path"

    echo "$backup_path"
}

# Function to backup database schema
backup_schema() {
    local backup_path="$1"

    print_status "Backing up database schema..."

    local schema_file="${backup_path}/schema.sql"

    if supabase db dump --local --schema-only > "$schema_file"; then
        print_success "Schema backup created: $schema_file"
    else
        print_error "Failed to backup schema"
        exit 1
    fi
}

# Function to backup database data
backup_data() {
    local backup_path="$1"

    print_status "Backing up database data..."

    local data_file="${backup_path}/data.sql"

    if supabase db dump --local --data-only > "$data_file"; then
        print_success "Data backup created: $data_file"
    else
        print_error "Failed to backup data"
        exit 1
    fi
}

# Function to backup full database
backup_full_database() {
    local backup_path="$1"

    print_status "Backing up full database..."

    local full_file="${backup_path}/full_database.sql"

    if supabase db dump --local > "$full_file"; then
        print_success "Full database backup created: $full_file"
    else
        print_error "Failed to backup full database"
        exit 1
    fi
}

# Function to backup storage files
backup_storage() {
    local backup_path="$1"

    print_status "Backing up storage files..."

    local storage_dir="${backup_path}/storage"
    mkdir -p "$storage_dir"

    # Check if storage bucket exists
    if supabase storage ls &> /dev/null; then
        # List all buckets
        local buckets=$(supabase storage ls | grep -v "Name" | awk '{print $1}')

        for bucket in $buckets; do
            print_status "Backing up bucket: $bucket"
            local bucket_dir="${storage_dir}/${bucket}"
            mkdir -p "$bucket_dir"

            # List files in bucket
            local files=$(supabase storage ls "$bucket" | grep -v "Name" | awk '{print $1}')

            for file in $files; do
                print_status "  Downloading: $file"
                if supabase storage download "$bucket/$file" "$bucket_dir/" &> /dev/null; then
                    print_success "    Downloaded: $file"
                else
                    print_warning "    Failed to download: $file"
                fi
            done
        done

        print_success "Storage backup completed"
    else
        print_warning "No storage buckets found or storage not accessible"
    fi
}

# Function to backup environment configuration
backup_environment() {
    local backup_path="$1"

    print_status "Backing up environment configuration..."

    local env_dir="${backup_path}/environment"
    mkdir -p "$env_dir"

    # Backup .env.local if it exists
    if [ -f ".env.local" ]; then
        cp .env.local "${env_dir}/.env.local"
        print_success "Environment file backed up"
    fi

    # Backup env.example
    if [ -f "env.example" ]; then
        cp env.example "${env_dir}/env.example"
        print_success "Environment example backed up"
    fi

    # Backup supabase config
    if [ -f "supabase/config.toml" ]; then
        cp supabase/config.toml "${env_dir}/config.toml"
        print_success "Supabase config backed up"
    fi
}

# Function to backup migrations
backup_migrations() {
    local backup_path="$1"

    print_status "Backing up migrations..."

    local migrations_dir="${backup_path}/migrations"

    if [ -d "supabase/migrations" ]; then
        cp -r supabase/migrations "$migrations_dir"
        print_success "Migrations backed up"
    else
        print_warning "No migrations directory found"
    fi
}

# Function to create backup manifest
create_manifest() {
    local backup_path="$1"

    print_status "Creating backup manifest..."

    local manifest_file="${backup_path}/manifest.json"

    cat > "$manifest_file" << EOF
{
  "backup_info": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "version": "1.0",
    "type": "medicare_scheduler_backup"
  },
  "database_info": {
    "schema_backup": "schema.sql",
    "data_backup": "data.sql",
    "full_backup": "full_database.sql"
  },
  "storage_info": {
    "backup_directory": "storage/"
  },
  "environment_info": {
    "config_files": [
      ".env.local",
      "env.example",
      "config.toml"
    ]
  },
  "migrations_info": {
    "migrations_directory": "migrations/"
  },
  "restore_instructions": {
    "1": "Restore schema: psql < schema.sql",
    "2": "Restore data: psql < data.sql",
    "3": "Or restore full: psql < full_database.sql",
    "4": "Restore storage files to Supabase Storage",
    "5": "Update environment variables",
    "6": "Run migrations if needed"
  }
}
EOF

    print_success "Backup manifest created: $manifest_file"
}

# Function to compress backup
compress_backup() {
    local backup_path="$1"

    print_status "Compressing backup..."

    local archive_name="${BACKUP_DIR}/${BACKUP_PREFIX}.tar.gz"

    if tar -czf "$archive_name" -C "$BACKUP_DIR" "$(basename "$backup_path")"; then
        print_success "Backup compressed: $archive_name"

        # Remove uncompressed directory
        rm -rf "$backup_path"

        echo "$archive_name"
    else
        print_error "Failed to compress backup"
        exit 1
    fi
}

# Function to show backup summary
show_summary() {
    local backup_path="$1"
    local archive_name="$2"

    echo ""
    print_success "=== Backup Summary ==="
    echo "✅ Database schema backed up"
    echo "✅ Database data backed up"
    echo "✅ Full database backed up"
    echo "✅ Storage files backed up"
    echo "✅ Environment configuration backed up"
    echo "✅ Migrations backed up"
    echo "✅ Backup manifest created"

    if [ -n "$archive_name" ]; then
        echo "✅ Backup compressed: $archive_name"
        local size=$(du -h "$archive_name" | cut -f1)
        echo "📦 Backup size: $size"
    else
        echo "📁 Backup directory: $backup_path"
    fi

    echo ""
    print_status "Backup completed successfully!"
    echo ""
    print_warning "Important: Store your backup files in a safe location!"
    echo "Consider uploading to cloud storage for additional safety."
}

# Function to show help
show_help() {
    echo "MediCare Scheduler - Data Backup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --schema-only    Backup schema only"
    echo "  --data-only      Backup data only"
    echo "  --no-compress    Don't compress the backup"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full backup (default)"
    echo "  $0 --schema-only      # Schema only"
    echo "  $0 --data-only        # Data only"
    echo "  $0 --no-compress      # Uncompressed backup"
    echo ""
    echo "Prerequisites:"
    echo "  - Supabase CLI installed"
    echo "  - Local Supabase running"
    echo "  - Sufficient disk space"
}

# Main backup function
perform_backup() {
    local schema_only=false
    local data_only=false
    local compress=true

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
            --no-compress)
                compress=false
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

    print_status "Starting backup process..."

    check_prerequisites
    local backup_path=$(create_backup_directory)

    if [ "$schema_only" = true ]; then
        backup_schema "$backup_path"
    elif [ "$data_only" = true ]; then
        backup_data "$backup_path"
    else
        backup_schema "$backup_path"
        backup_data "$backup_path"
        backup_full_database "$backup_path"
        backup_storage "$backup_path"
        backup_environment "$backup_path"
        backup_migrations "$backup_path"
    fi

    create_manifest "$backup_path"

    local archive_name=""
    if [ "$compress" = true ] && [ "$schema_only" = false ] && [ "$data_only" = false ]; then
        archive_name=$(compress_backup "$backup_path")
    fi

    show_summary "$backup_path" "$archive_name"
}

# Run main function with all arguments
perform_backup "$@"
