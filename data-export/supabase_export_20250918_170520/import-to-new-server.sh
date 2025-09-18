#!/bin/bash

# Import script for new Supabase server
# Run this on your new server after updating environment variables

set -e

echo "📥 Starting data import to new Supabase server..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found! Please create it first."
    exit 1
fi

# Load environment variables
source .env

# Check if database is accessible
echo "🔍 Testing database connection..."
if ! psql "${DATABASE_URL}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to database. Check your DATABASE_URL in .env"
    exit 1
fi

echo "✅ Database connection successful"

# Import schema first
echo "📋 Importing schema..."
psql "${DATABASE_URL}" -f schema.sql

# Import data
echo "📊 Importing application data..."
psql "${DATABASE_URL}" -f data.sql

# Import auth data if exists
if [ -f "auth_data.sql" ]; then
    echo "🔐 Importing auth data..."
    psql "${DATABASE_URL}" -f auth_data.sql
fi

# Import storage data if exists
if [ -f "storage_data.sql" ]; then
    echo "📦 Importing storage data..."
    psql "${DATABASE_URL}" -f storage_data.sql
fi

# Import individual tables
for file in *.sql; do
    if [[ "$file" != "schema.sql" && "$file" != "data.sql" && "$file" != "auth_data.sql" && "$file" != "storage_data.sql" && "$file" != "import-to-new-server.sh" ]]; then
        echo "📄 Importing $file..."
        psql "${DATABASE_URL}" -f "$file"
    fi
done

echo "✅ Data import completed successfully!"
echo "🌐 Your application should now be accessible with the migrated data."
