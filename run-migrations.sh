#!/bin/bash
# Run Supabase migrations via psql

PROJECT_REF="beagmcohnnihbwllomfj"
DB_HOST="aws-0-ap-south-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.beagmcohnnihbwllomfj"

echo "📦 Preparing to run migrations..."
echo "Project: $PROJECT_REF"
echo ""
echo "⚠️  You'll need your database password."
echo "Get it from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo ""
read -sp "Enter database password: " DB_PASSWORD
echo ""

export PGPASSWORD="$DB_PASSWORD"

# Run each migration file
for migration in supabase/migrations/*.sql; do
    echo "Running: $(basename $migration)..."
    psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -f "$migration" 2>&1 | grep -E "(ERROR|success|CREATE|ALTER)" || echo "✅ Completed"
done

echo ""
echo "✅ All migrations completed!"
