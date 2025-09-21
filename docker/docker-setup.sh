#!/bin/bash

# MediCare Scheduler - Docker Setup Script
# This script helps set up the Docker environment for local development

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

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Docker and Docker Compose are installed"
}

# Function to check if Docker daemon is running
check_docker_daemon() {
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi

    print_success "Docker daemon is running"
}

# Function to create environment file if it doesn't exist
setup_environment() {
    if [ ! -f .env.local ]; then
        print_status "Creating .env.local from env.example..."
        cp env.example .env.local
        print_warning "Please edit .env.local with your configuration before starting the services"
    else
        print_success ".env.local already exists"
    fi
}

# Function to create Supabase configuration files
setup_supabase_config() {
    print_status "Setting up Supabase configuration..."

    # Create kong.yml if it doesn't exist
    if [ ! -f supabase/kong.yml ]; then
        print_status "Creating Supabase Kong configuration..."
        mkdir -p supabase
        cat > supabase/kong.yml << 'EOF'
_format_version: "1.1"

consumers:
  - username: anon
    keyauth_credentials:
      - key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
  - username: service_role
    keyauth_credentials:
      - key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

acls:
  - consumer: anon
    group: anon
  - consumer: service_role
    group: service_role

services:
  - name: auth-v1-open
    url: http://supabase-auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors
  - name: auth-v1-open-callback
    url: http://supabase-auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors
  - name: auth-v1-open-authorize
    url: http://supabase-auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
      - name: cors
  - name: auth-v1
    _comment: "GoTrue: /auth/v1/* -> http://supabase-auth:9999/*"
    url: http://supabase-auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
  - name: rest-v1
    _comment: "PostgREST: /rest/v1/* -> http://supabase-rest:3000/*"
    url: http://supabase-rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
  - name: realtime-v1
    _comment: "Realtime: /realtime/v1/* -> ws://supabase-realtime:4000/socket/*"
    url: http://supabase-realtime:4000/socket/
    routes:
      - name: realtime-v1-all
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
  - name: storage-v1
    _comment: "Storage: /storage/v1/* -> http://supabase-storage:5000/*"
    url: http://supabase-storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors
  - name: analytics-v1
    _comment: "Analytics: /analytics/v1/* -> http://supabase-analytics:54327/*"
    url: http://supabase-analytics:54327/
    routes:
      - name: analytics-v1-all
        strip_path: true
        paths:
          - /analytics/v1/
    plugins:
      - name: cors
  - name: functions-v1
    _comment: "Edge Functions: /functions/v1/* -> http://supabase-edge-functions:54321/functions/v1/*"
    url: http://supabase-edge-functions:54321/functions/v1/
    routes:
      - name: functions-v1-all
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors
EOF
        print_success "Created Supabase Kong configuration"
    else
        print_success "Supabase Kong configuration already exists"
    fi
}

# Function to start services
start_services() {
    print_status "Starting Docker services..."
    docker-compose up -d

    print_status "Waiting for services to be ready..."
    sleep 10

    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Services are starting up"
    else
        print_error "Some services failed to start. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Function to show service status
show_status() {
    print_status "Service Status:"
    docker-compose ps

    echo ""
    print_status "Service URLs:"
    echo "  📱 Next.js App:        http://localhost:3000"
    echo "  🗄️  Supabase Studio:   http://localhost:54323"
    echo "  📧 Email Testing:      http://localhost:54324"
    echo "  🔗 Supabase API:       http://localhost:54321"
    echo "  🗃️  Database:          localhost:54322"
    echo "  📊 Redis:              localhost:6379"
}

# Function to show logs
show_logs() {
    print_status "Showing logs for all services..."
    docker-compose logs -f
}

# Function to stop services
stop_services() {
    print_status "Stopping Docker services..."
    docker-compose down
    print_success "Services stopped"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "MediCare Scheduler - Docker Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup     - Set up the Docker environment (default)"
    echo "  start     - Start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  status    - Show service status and URLs"
    echo "  logs      - Show logs for all services"
    echo "  cleanup   - Stop services and clean up resources"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup    # Initial setup"
    echo "  $0 start    # Start services"
    echo "  $0 logs     # View logs"
    echo "  $0 status   # Check status"
}

# Main script logic
main() {
    case "${1:-setup}" in
        "setup")
            print_status "Setting up MediCare Scheduler Docker environment..."
            check_docker
            check_docker_daemon
            setup_environment
            setup_supabase_config
            start_services
            show_status
            print_success "Setup completed! You can now access the application at http://localhost:3000"
            ;;
        "start")
            check_docker
            check_docker_daemon
            start_services
            show_status
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 2
            start_services
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "cleanup")
            cleanup
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
