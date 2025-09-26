#!/usr/bin/env node

/**
 * Fix Appointment Status Enum
 *
 * This script fixes the appointment status enum to include 'deleted' status
 * before running the transportation segments migration.
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function fixAppointmentStatusEnum() {
  console.log('🔧 Fixing Appointment Status Enum...\n');

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check current enum values
    console.log('1. Checking current appointment status enum...');
    const { data: enumData, error: enumError } = await supabase
      .from('information_schema.enum_values')
      .select('enumlabel')
      .eq('enumtypid', 'appointment_status_enum');

    if (enumError) {
      console.log('❌ Error checking enum:', enumError.message);
      return false;
    }

    console.log('Current enum values:', enumData?.map(d => d.enumlabel) || []);

    // Check if 'deleted' already exists
    const hasDeleted = enumData?.some(d => d.enumlabel === 'deleted');
    if (hasDeleted) {
      console.log('✅ "deleted" status already exists in enum');
    } else {
      console.log('⚠️  "deleted" status not found in enum');
      console.log('📋 Manual step required:');
      console.log('1. Open Supabase Studio: http://127.0.0.1:54323');
      console.log('2. Go to SQL Editor');
      console.log('3. Run: ALTER TYPE appointment_status_enum ADD VALUE \'deleted\';');
      console.log('4. Then run the transportation segments migrations');
    }

    return true;

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    return false;
  }
}

// Run fix
if (require.main === module) {
  fixAppointmentStatusEnum()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Fix script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAppointmentStatusEnum };
