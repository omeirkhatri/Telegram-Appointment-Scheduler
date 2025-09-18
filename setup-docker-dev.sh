#!/bin/bash

# Docker Development Setup Script
# This script sets up the local development environment

echo "🚀 Setting up Docker development environment for MediCare Scheduler..."

# Create .env.local file
cat > .env.local << 'EOF'
# Local Development Environment Variables
# These are for Docker development only

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# JWT Secret (for local development)
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
TZ=Asia/Dubai

# Database Configuration (for direct access if needed)
DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres
EOF

echo "✅ Created .env.local file"

# Make the script executable
chmod +x setup-docker-dev.sh

echo "🎯 Next steps:"
echo "1. Run: ./setup-docker-dev.sh"
echo "2. Run: docker-compose up -d"
echo "3. Wait for all services to start (about 2-3 minutes)"
echo "4. Access your app at: http://localhost:3000"
echo "5. Access Supabase Studio at: http://localhost:54323"
echo "6. Access Email testing at: http://localhost:54324"
echo ""
echo "🔧 To stop all services: docker-compose down"
echo "🔧 To view logs: docker-compose logs -f"
echo "🔧 To rebuild: docker-compose up -d --build"
