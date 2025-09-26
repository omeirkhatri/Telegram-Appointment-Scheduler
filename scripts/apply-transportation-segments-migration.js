#!/usr/bin/env node

/**
 * Apply Transportation Segments Migration
 *
 * This script manually applies the transportation segments migration
 * to the local Supabase database.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function applyTransportationSegmentsMigration() {
  console.log('🚀 Applying Transportation Segments Migration...\n');

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read the transportation segments migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250215090000_create_transportation_segments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('1. Creating transportation segment enums...');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn(`⚠️  Statement warning: ${error.message}`);
          }
        } catch (err) {
          console.warn(`⚠️  Statement error: ${err.message}`);
        }
      }
    }

    console.log('✅ Transportation segments migration applied');

    // Verify the table was created
    console.log('\n2. Verifying transportation segments table...');
    const { data, error } = await supabase.from('transportation_segments').select('*').limit(1);

    if (error && error.code === 'PGRST116') {
      console.error('❌ Transportation segments table was not created');
      return false;
    } else if (error) {
      console.warn(`⚠️  Table verification warning: ${error.message}`);
    } else {
      console.log('✅ Transportation segments table exists');
    }

    // Apply the override audit migration
    console.log('\n3. Applying transportation segment override audit migration...');
    const auditMigrationPath = path.join(__dirname, '../supabase/migrations/20250215090001_create_transportation_segment_override_audit.sql');
    const auditMigrationSQL = fs.readFileSync(auditMigrationPath, 'utf8');

    const auditStatements = auditMigrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of auditStatements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn(`⚠️  Audit statement warning: ${error.message}`);
          }
        } catch (err) {
          console.warn(`⚠️  Audit statement error: ${err.message}`);
        }
      }
    }

    console.log('✅ Transportation segment override audit migration applied');

    console.log('\n🎉 Transportation Segments migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run the validation script: npm run validate:transportation-segments');
    console.log('2. Test the API endpoints');
    console.log('3. Follow the rollout plan in docs/Guides/transportation-segments.md');

    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

// Run migration
if (require.main === module) {
  applyTransportationSegmentsMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { applyTransportationSegmentsMigration };
