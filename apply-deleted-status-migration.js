#!/usr/bin/env node
/**
 * Script to apply the migration that adds 'deleted' status to appointment_status_enum
 *
 * This migration must be applied to fix the error:
 * "invalid input value for enum appointment_status_enum: 'deleted'"
 *
 * Usage:
 *   node apply-deleted-status-migration.js
 *
 * Or via Supabase CLI:
 *   supabase db push
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase credentials from environment or use defaults
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://beagmcohnnihbwllomfj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYWdtY29obm5paGJ3bGxvbWZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc5NTc1MSwiZXhwIjoyMDgxMzcxNzUxfQ.E9zVmixz7B5KoziEFD3RI4N2ZAwNifppgUqGeHr_VaQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function applyMigration() {
  console.log('🔄 Applying migration: Add deleted status to appointment_status_enum...\n');

  const migrationSQL = `
-- Add soft delete functionality to appointments
-- This migration adds 'deleted' status to appointments

-- Add 'deleted' to the appointment_status_enum
ALTER TYPE appointment_status_enum ADD VALUE IF NOT EXISTS 'deleted';
`;

  try {
    // Try to execute via RPC if available
    console.log('Attempting to apply migration via Supabase client...');

    // Note: Supabase JS client doesn't support ALTER TYPE directly
    // You need to run this via psql or Supabase CLI
    console.log('⚠️  Direct SQL execution via Supabase JS client is not supported for ALTER TYPE.');
    console.log('\n📋 Please apply this migration using one of these methods:\n');
    console.log('Method 1: Using Supabase CLI (Recommended)');
    console.log('  supabase db push\n');
    console.log('Method 2: Using psql directly');
    console.log('  psql "postgresql://postgres.beagmcohnnihbwllomfj:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20250220000005_add_soft_delete_to_appointments.sql\n');
    console.log('Method 3: Via Supabase Dashboard SQL Editor');
    console.log('  Run this SQL:');
    console.log('  ALTER TYPE appointment_status_enum ADD VALUE IF NOT EXISTS \'deleted\';\n');

    console.log('Migration SQL:');
    console.log(migrationSQL);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if migration is needed
async function checkMigrationStatus() {
  try {
    // Try to query with deleted status to see if it's available
    const { error } = await supabase
      .from('appointments')
      .select('id')
      .eq('status', 'deleted')
      .limit(0);

    if (error && error.message.includes('invalid input value for enum')) {
      console.log('❌ Migration NOT applied: deleted status is not available in enum\n');
      return false;
    } else {
      console.log('✅ Migration already applied: deleted status is available\n');
      return true;
    }
  } catch (error) {
    console.log('⚠️  Could not check migration status:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Checking migration status...\n');
  const isApplied = await checkMigrationStatus();

  if (isApplied === false) {
    await applyMigration();
  } else if (isApplied === true) {
    console.log('✅ No action needed - migration is already applied!\n');
  }
}

main().catch(console.error);
