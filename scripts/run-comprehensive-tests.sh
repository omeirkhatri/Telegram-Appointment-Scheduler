#!/bin/bash

# Comprehensive Test Runner for MediCare Scheduler
# This script runs all types of tests: unit, integration, e2e, and API tests

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    if ! command_exists node; then
        print_error "Node.js is not installed"
        exit 1
    fi

    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi

    if ! command_exists npx; then
        print_error "npx is not installed"
        exit 1
    fi

    print_success "All prerequisites are installed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."

    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_status "Dependencies already installed"
    fi

    print_success "Dependencies are ready"
}

# Function to check environment
check_environment() {
    print_status "Checking environment..."

    if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
        print_warning "No environment file found. Please ensure your environment is configured."
    fi

    # Check if database is accessible
    print_status "Checking database connection..."
    # Add database connection check here if needed

    print_success "Environment check completed"
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."

    if npx jest --testPathPatterns="src/.*\.test\.(ts|tsx)$"; then
        print_success "Unit tests passed"
        return 0
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."

    if npx jest --testPathPatterns="src/.*\.integration\.(ts|tsx)$"; then
        print_success "Integration tests passed"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run API tests
run_api_tests() {
    print_status "Running API tests..."

    # Start the development server in background
    print_status "Starting development server..."
    npm run dev &
    SERVER_PID=$!

    # Wait for server to start
    sleep 10

    # Run API tests
    if npx playwright test tests/e2e/api/ --project=chromium; then
        print_success "API tests passed"
        API_TEST_RESULT=0
    else
        print_error "API tests failed"
        API_TEST_RESULT=1
    fi

    # Stop the development server
    kill $SERVER_PID 2>/dev/null || true

    return $API_TEST_RESULT
}

# Function to run form submission tests
run_form_tests() {
    print_status "Running form submission tests..."

    # Start the development server in background
    print_status "Starting development server..."
    npm run dev &
    SERVER_PID=$!

    # Wait for server to start
    sleep 10

    # Run form tests
    if npx playwright test tests/e2e/forms/ --project=chromium; then
        print_success "Form submission tests passed"
        FORM_TEST_RESULT=0
    else
        print_error "Form submission tests failed"
        FORM_TEST_RESULT=1
    fi

    # Stop the development server
    kill $SERVER_PID 2>/dev/null || true

    return $FORM_TEST_RESULT
}

# Function to run button interaction tests
run_button_tests() {
    print_status "Running button interaction tests..."

    # Start the development server in background
    print_status "Starting development server..."
    npm run dev &
    SERVER_PID=$!

    # Wait for server to start
    sleep 10

    # Run button tests
    if npx playwright test tests/e2e/interactions/ --project=chromium; then
        print_success "Button interaction tests passed"
        BUTTON_TEST_RESULT=0
    else
        print_error "Button interaction tests failed"
        BUTTON_TEST_RESULT=1
    fi

    # Stop the development server
    kill $SERVER_PID 2>/dev/null || true

    return $BUTTON_TEST_RESULT
}

# Function to run accessibility tests
run_accessibility_tests() {
    print_status "Running accessibility tests..."

    # Start the development server in background
    print_status "Starting development server..."
    npm run dev &
    SERVER_PID=$!

    # Wait for server to start
    sleep 10

    # Run accessibility tests
    if npx playwright test --project=accessibility; then
        print_success "Accessibility tests passed"
        ACCESSIBILITY_TEST_RESULT=0
    else
        print_error "Accessibility tests failed"
        ACCESSIBILITY_TEST_RESULT=1
    fi

    # Stop the development server
    kill $SERVER_PID 2>/dev/null || true

    return $ACCESSIBILITY_TEST_RESULT
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."

    # Start the development server in background
    print_status "Starting development server..."
    npm run dev &
    SERVER_PID=$!

    # Wait for server to start
    sleep 10

    # Run performance tests
    if npx playwright test --project=performance; then
        print_success "Performance tests passed"
        PERFORMANCE_TEST_RESULT=0
    else
        print_error "Performance tests failed"
        PERFORMANCE_TEST_RESULT=1
    fi

    # Stop the development server
    kill $SERVER_PID 2>/dev/null || true

    return $PERFORMANCE_TEST_RESULT
}

# Function to run all e2e tests
run_e2e_tests() {
    print_status "Running end-to-end tests..."

    # Start the development server in background
    print_status "Starting development server..."
    npm run dev &
    SERVER_PID=$!

    # Wait for server to start
    sleep 10

    # Run all e2e tests
    if npx playwright test tests/e2e/critical-flows/ --project=chromium; then
        print_success "End-to-end tests passed"
        E2E_TEST_RESULT=0
    else
        print_error "End-to-end tests failed"
        E2E_TEST_RESULT=1
    fi

    # Stop the development server
    kill $SERVER_PID 2>/dev/null || true

    return $E2E_TEST_RESULT
}

# Function to generate test report
generate_test_report() {
    print_status "Generating test report..."

    # Create reports directory if it doesn't exist
    mkdir -p test-reports

    # Generate HTML report
    if [ -f "test-results/results.json" ]; then
        npx playwright show-report test-results/
        print_success "Test report generated at test-results/"
    else
        print_warning "No test results found to generate report"
    fi
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."

    # Kill any remaining server processes
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    print_success "Cleanup completed"
}

# Main function
main() {
    print_status "Starting comprehensive test suite for MediCare Scheduler"
    print_status "=================================================="

    # Initialize counters
    TOTAL_TESTS=0
    PASSED_TESTS=0
    FAILED_TESTS=0

    # Check prerequisites
    check_prerequisites

    # Install dependencies
    install_dependencies

    # Check environment
    check_environment

    # Parse command line arguments
    RUN_UNIT=false
    RUN_INTEGRATION=false
    RUN_API=false
    RUN_FORMS=false
    RUN_BUTTONS=false
    RUN_ACCESSIBILITY=false
    RUN_PERFORMANCE=false
    RUN_E2E=false
    RUN_ALL=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit)
                RUN_UNIT=true
                shift
                ;;
            --integration)
                RUN_INTEGRATION=true
                shift
                ;;
            --api)
                RUN_API=true
                shift
                ;;
            --forms)
                RUN_FORMS=true
                shift
                ;;
            --buttons)
                RUN_BUTTONS=true
                shift
                ;;
            --accessibility)
                RUN_ACCESSIBILITY=true
                shift
                ;;
            --performance)
                RUN_PERFORMANCE=true
                shift
                ;;
            --e2e)
                RUN_E2E=true
                shift
                ;;
            --all)
                RUN_ALL=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --unit           Run unit tests"
                echo "  --integration    Run integration tests"
                echo "  --api            Run API tests"
                echo "  --forms          Run form submission tests"
                echo "  --buttons        Run button interaction tests"
                echo "  --accessibility  Run accessibility tests"
                echo "  --performance    Run performance tests"
                echo "  --e2e            Run end-to-end tests"
                echo "  --all            Run all tests"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # If no specific tests are selected, run all
    if [ "$RUN_UNIT" = false ] && [ "$RUN_INTEGRATION" = false ] && [ "$RUN_API" = false ] && [ "$RUN_FORMS" = false ] && [ "$RUN_BUTTONS" = false ] && [ "$RUN_ACCESSIBILITY" = false ] && [ "$RUN_PERFORMANCE" = false ] && [ "$RUN_E2E" = false ]; then
        RUN_ALL=true
    fi

    # Run selected tests
    if [ "$RUN_ALL" = true ] || [ "$RUN_UNIT" = true ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if run_unit_tests; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_INTEGRATION" = true ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if run_integration_tests; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_API" = true ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if run_api_tests; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_FORMS" = true ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if run_form_tests; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_BUTTONS" = true ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if run_button_tests; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_ACCESSIBILITY" = true ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if run_accessibility_tests; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_PERFORMANCE" = true ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if run_performance_tests; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    if [ "$RUN_ALL" = true ] || [ "$RUN_E2E" = true ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if run_e2e_tests; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    # Generate test report
    generate_test_report

    # Cleanup
    cleanup

    # Print summary
    print_status "=================================================="
    print_status "Test Summary:"
    print_status "Total test suites: $TOTAL_TESTS"
    print_success "Passed: $PASSED_TESTS"
    if [ $FAILED_TESTS -gt 0 ]; then
        print_error "Failed: $FAILED_TESTS"
    else
        print_success "Failed: $FAILED_TESTS"
    fi

    if [ $FAILED_TESTS -eq 0 ]; then
        print_success "All tests passed! 🎉"
        exit 0
    else
        print_error "Some tests failed. Please check the logs above."
        exit 1
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"
