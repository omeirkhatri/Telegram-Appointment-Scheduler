#!/bin/bash

# MediCare Scheduler - Migration Validation Script
# This script validates that the database is ready for cloud migration

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

# Function to validate database schema
validate_schema() {
    print_status "Validating database schema..."

    local db_url="postgresql://postgres:postgres@localhost:54322/postgres"
    local errors=0

    # Check if required tables exist
    local required_tables=("patients" "staff" "appointments" "appointment_staff")

    for table in "${required_tables[@]}"; do
        if psql "$db_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" | grep -q "1"; then
            print_success "Table '$table' exists"
        else
            print_error "Table '$table' is missing"
            errors=$((errors + 1))
        fi
    done

    # Check if required extensions are installed
    local required_extensions=("uuid-ossp" "pgcrypto")

    for extension in "${required_extensions[@]}"; do
        if psql "$db_url" -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = '$extension';" | grep -q "1"; then
            print_success "Extension '$extension' is installed"
        else
            print_error "Extension '$extension' is missing"
            errors=$((errors + 1))
        fi
    done

    # Check if required functions exist
    local required_functions=("update_updated_at_column" "generate_patient_document_path")

    for function in "${required_functions[@]}"; do
        if psql "$db_url" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = '$function';" | grep -q "1"; then
            print_success "Function '$function' exists"
        else
            print_error "Function '$function' is missing"
            errors=$((errors + 1))
        fi
    done

    # Check if required indexes exist
    local required_indexes=("idx_patients_phone" "idx_staff_email" "idx_appointments_patient_id")

    for index in "${required_indexes[@]}"; do
        if psql "$db_url" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname = '$index';" | grep -q "1"; then
            print_success "Index '$index' exists"
        else
            print_error "Index '$index' is missing"
            errors=$((errors + 1))
        fi
    done

    if [ $errors -eq 0 ]; then
        print_success "Schema validation passed"
        return 0
    else
        print_error "Schema validation failed with $errors errors"
        return 1
    fi
}

# Function to validate data integrity
validate_data_integrity() {
    print_status "Validating data integrity..."

    local db_url="postgresql://postgres:postgres@localhost:54322/postgres"
    local errors=0

    # Check for orphaned appointment_staff records
    local orphaned_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM appointment_staff WHERE appointment_id NOT IN (SELECT id FROM appointments);" | tr -d ' ')
    if [ "$orphaned_count" -eq 0 ]; then
        print_success "No orphaned appointment_staff records"
    else
        print_error "Found $orphaned_count orphaned appointment_staff records"
        errors=$((errors + 1))
    fi

    # Check for orphaned appointments
    local orphaned_appointments=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM appointments WHERE patient_id NOT IN (SELECT id FROM patients);" | tr -d ' ')
    if [ "$orphaned_appointments" -eq 0 ]; then
        print_success "No orphaned appointments"
    else
        print_error "Found $orphaned_appointments orphaned appointments"
        errors=$((errors + 1))
    fi

    # Check for invalid appointment types
    local invalid_types=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM appointments WHERE appointment_type NOT IN ('doctor_on_call', 'lab_test', 'teleconsultation', 'physiotherapy', 'caregiver', 'iv_therapy');" | tr -d ' ')
    if [ "$invalid_types" -eq 0 ]; then
        print_success "All appointment types are valid"
    else
        print_error "Found $invalid_types appointments with invalid types"
        errors=$((errors + 1))
    fi

    # Check for invalid staff types
    local invalid_staff_types=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM staff WHERE staff_type NOT IN ('doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician');" | tr -d ' ')
    if [ "$invalid_staff_types" -eq 0 ]; then
        print_success "All staff types are valid"
    else
        print_error "Found $invalid_staff_types staff with invalid types"
        errors=$((errors + 1))
    fi

    # Check for future appointments with past dates
    local past_future_appointments=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM appointments WHERE appointment_date < CURRENT_DATE AND status = 'scheduled';" | tr -d ' ')
    if [ "$past_future_appointments" -eq 0 ]; then
        print_success "No past appointments with scheduled status"
    else
        print_warning "Found $past_future_appointments past appointments with scheduled status"
    fi

    if [ $errors -eq 0 ]; then
        print_success "Data integrity validation passed"
        return 0
    else
        print_error "Data integrity validation failed with $errors errors"
        return 1
    fi
}

# Function to validate storage
validate_storage() {
    print_status "Validating storage configuration..."

    local errors=0

    # Check if storage is accessible
    if supabase storage ls &> /dev/null; then
        print_success "Storage is accessible"
    else
        print_error "Storage is not accessible"
        errors=$((errors + 1))
    fi

    # Check if required buckets exist
    local required_buckets=("patient-documents")

    for bucket in "${required_buckets[@]}"; do
        if supabase storage ls | grep -q "$bucket"; then
            print_success "Bucket '$bucket' exists"
        else
            print_warning "Bucket '$bucket' does not exist"
        fi
    done

    if [ $errors -eq 0 ]; then
        print_success "Storage validation passed"
        return 0
    else
        print_error "Storage validation failed with $errors errors"
        return 1
    fi
}

# Function to validate environment configuration
validate_environment() {
    print_status "Validating environment configuration..."

    local errors=0

    # Check if .env.local exists
    if [ -f ".env.local" ]; then
        print_success ".env.local file exists"
    else
        print_error ".env.local file is missing"
        errors=$((errors + 1))
    fi

    # Check for required environment variables
    local required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")

    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env.local 2>/dev/null; then
            print_success "Environment variable '$var' is set"
        else
            print_error "Environment variable '$var' is missing"
            errors=$((errors + 1))
        fi
    done

    # Check if Supabase URL is local
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=.*127.0.0.1\|localhost" .env.local 2>/dev/null; then
        print_success "Using local Supabase URL"
    else
        print_warning "Not using local Supabase URL"
    fi

    if [ $errors -eq 0 ]; then
        print_success "Environment validation passed"
        return 0
    else
        print_error "Environment validation failed with $errors errors"
        return 1
    fi
}

# Function to validate migrations
validate_migrations() {
    print_status "Validating migrations..."

    local errors=0

    # Check if migrations directory exists
    if [ -d "supabase/migrations" ]; then
        print_success "Migrations directory exists"
    else
        print_error "Migrations directory is missing"
        errors=$((errors + 1))
    fi

    # Check if required migration files exist
    local required_migrations=(
        "20240901000000_initial_schema.sql"
        "20240902000000_update_patients_table.sql"
        "20240903000000_update_staff_table.sql"
        "20240904000000_update_appointments_table.sql"
        "20240905000000_create_appointment_staff_table.sql"
        "20240908000000_cloud_migration_setup.sql"
    )

    for migration in "${required_migrations[@]}"; do
        if [ -f "supabase/migrations/$migration" ]; then
            print_success "Migration '$migration' exists"
        else
            print_error "Migration '$migration' is missing"
            errors=$((errors + 1))
        fi
    done

    if [ $errors -eq 0 ]; then
        print_success "Migrations validation passed"
        return 0
    else
        print_error "Migrations validation failed with $errors errors"
        return 1
    fi
}

# Function to run database validation functions
run_database_validation() {
    print_status "Running database validation functions..."

    local db_url="postgresql://postgres:postgres@localhost:54322/postgres"

    # Check if validation functions exist
    if psql "$db_url" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = 'validate_cloud_migration';" | grep -q "1"; then
        print_success "Database validation functions exist"

        # Run the validation function
        print_status "Running cloud migration validation..."
        local validation_result=$(psql "$db_url" -t -c "SELECT * FROM validate_cloud_migration();" 2>/dev/null || echo "validation_failed")

        if [ "$validation_result" != "validation_failed" ]; then
            echo "$validation_result" | while IFS='|' read -r check_name status message; do
                check_name=$(echo "$check_name" | xargs)
                status=$(echo "$status" | xargs)
                message=$(echo "$message" | xargs)

                if [ "$status" = "PASSED" ]; then
                    print_success "$check_name: $message"
                else
                    print_error "$check_name: $message"
                fi
            done
        else
            print_warning "Could not run database validation functions"
        fi
    else
        print_warning "Database validation functions not found"
    fi
}

# Function to generate validation report
generate_report() {
    local schema_result="$1"
    local data_result="$2"
    local storage_result="$3"
    local env_result="$4"
    local migrations_result="$5"

    echo ""
    print_status "=== Migration Validation Report ==="
    echo ""

    # Schema validation
    if [ "$schema_result" -eq 0 ]; then
        print_success "✅ Schema Validation: PASSED"
    else
        print_error "❌ Schema Validation: FAILED"
    fi

    # Data integrity validation
    if [ "$data_result" -eq 0 ]; then
        print_success "✅ Data Integrity: PASSED"
    else
        print_error "❌ Data Integrity: FAILED"
    fi

    # Storage validation
    if [ "$storage_result" -eq 0 ]; then
        print_success "✅ Storage Validation: PASSED"
    else
        print_error "❌ Storage Validation: FAILED"
    fi

    # Environment validation
    if [ "$env_result" -eq 0 ]; then
        print_success "✅ Environment Validation: PASSED"
    else
        print_error "❌ Environment Validation: FAILED"
    fi

    # Migrations validation
    if [ "$migrations_result" -eq 0 ]; then
        print_success "✅ Migrations Validation: PASSED"
    else
        print_error "❌ Migrations Validation: FAILED"
    fi

    echo ""

    # Overall result
    local total_errors=$((schema_result + data_result + storage_result + env_result + migrations_result))

    if [ $total_errors -eq 0 ]; then
        print_success "🎉 Overall Result: READY FOR CLOUD MIGRATION"
        echo ""
        print_status "Your database is ready for cloud migration!"
        echo "You can now run: ./scripts/migrate-to-cloud.sh"
    else
        print_error "❌ Overall Result: NOT READY FOR CLOUD MIGRATION"
        echo ""
        print_warning "Please fix the $total_errors validation errors before migrating to cloud."
        echo "Review the errors above and address them before proceeding."
    fi

    echo ""
}

# Function to show help
show_help() {
    echo "MediCare Scheduler - Migration Validation Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --schema-only    Validate schema only"
    echo "  --data-only      Validate data integrity only"
    echo "  --storage-only   Validate storage only"
    echo "  --env-only       Validate environment only"
    echo "  --migrations-only Validate migrations only"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full validation (default)"
    echo "  $0 --schema-only      # Schema validation only"
    echo "  $0 --data-only        # Data integrity validation only"
    echo ""
    echo "Prerequisites:"
    echo "  - Supabase CLI installed"
    echo "  - Local Supabase running"
    echo "  - Database populated with data"
}

# Main validation function
perform_validation() {
    local schema_only=false
    local data_only=false
    local storage_only=false
    local env_only=false
    local migrations_only=false

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
            --storage-only)
                storage_only=true
                shift
                ;;
            --env-only)
                env_only=true
                shift
                ;;
            --migrations-only)
                migrations_only=true
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

    print_status "Starting migration validation..."

    check_prerequisites

    local schema_result=0
    local data_result=0
    local storage_result=0
    local env_result=0
    local migrations_result=0

    if [ "$schema_only" = true ]; then
        validate_schema
        schema_result=$?
    elif [ "$data_only" = true ]; then
        validate_data_integrity
        data_result=$?
    elif [ "$storage_only" = true ]; then
        validate_storage
        storage_result=$?
    elif [ "$env_only" = true ]; then
        validate_environment
        env_result=$?
    elif [ "$migrations_only" = true ]; then
        validate_migrations
        migrations_result=$?
    else
        # Full validation
        validate_schema
        schema_result=$?

        validate_data_integrity
        data_result=$?

        validate_storage
        storage_result=$?

        validate_environment
        env_result=$?

        validate_migrations
        migrations_result=$?

        run_database_validation
    fi

    generate_report "$schema_result" "$data_result" "$storage_result" "$env_result" "$migrations_result"

    # Exit with error code if any validation failed
    local total_errors=$((schema_result + data_result + storage_result + env_result + migrations_result))
    exit $total_errors
}

# Run main function with all arguments
perform_validation "$@"
