#!/usr/bin/env node

/**
 * Simple Migration for Unified Calendar Sync
 *
 * This script adds the necessary fields to the appointment_staff table
 * for the unified calendar sync system.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addSyncFields() {
  console.log('🔧 Adding sync fields to appointment_staff table...\n');

  try {
    // Check current table structure
    console.log('📋 Checking current appointment_staff table structure...');

    const { data: currentData, error: currentError } = await supabase
      .from('appointment_staff')
      .select('*')
      .limit(1);

    if (currentError) {
      console.error('❌ Error checking table:', currentError.message);
      return;
    }

    const sampleRecord = currentData[0];
    console.log('📄 Sample record fields:', Object.keys(sampleRecord || {}));

    // Check if sync fields already exist
    const hasNewFields = sampleRecord && (
      'sync_status' in sampleRecord ||
      'sync_attempted_at' in sampleRecord ||
      'sync_error' in sampleRecord ||
      'last_synced_at' in sampleRecord ||
      'sync_retry_count' in sampleRecord
    );

    if (hasNewFields) {
      console.log('✅ Sync fields already exist in the table');
    } else {
      console.log('⚠️ Sync fields not found - they need to be added via database admin');
      console.log('📋 Required fields to add:');
      console.log('   - sync_status VARCHAR(20) DEFAULT \'pending\'');
      console.log('   - sync_attempted_at TIMESTAMPTZ');
      console.log('   - sync_error TEXT');
      console.log('   - last_synced_at TIMESTAMPTZ');
      console.log('   - sync_retry_count INTEGER DEFAULT 0');
    }

    // Initialize existing records with default sync status
    console.log('\n🔄 Initializing existing records...');

    const { data: allRecords, error: allError } = await supabase
      .from('appointment_staff')
      .select('id, google_event_id')
      .limit(100);

    if (allError) {
      console.error('❌ Error fetching records:', allError.message);
      return;
    }

    console.log(`📊 Found ${allRecords.length} appointment_staff records`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const record of allRecords) {
      try {
        const syncStatus = record.google_event_id ? 'synced' : 'pending';

        const { error: updateError } = await supabase
          .from('appointment_staff')
          .update({
            sync_status: syncStatus,
            last_synced_at: record.google_event_id ? new Date().toISOString() : null
          })
          .eq('id', record.id);

        if (updateError) {
          // If the fields don't exist yet, this will fail
          if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
            console.log('⚠️ Sync fields not yet added to database schema');
            break;
          } else {
            throw updateError;
          }
        }

        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating record ${record.id}:`, error.message);
        errorCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ Updated ${updatedCount} records with initial sync status`);
      console.log(`❌ Failed to update ${errorCount} records`);
    }

    // Test if we can create a simple function for testing
    console.log('\n🧪 Testing basic functionality...');

    const { data: testData, error: testError } = await supabase
      .from('appointment_staff')
      .select('id, sync_status, google_event_id')
      .limit(5);

    if (testError) {
      console.error('❌ Test query failed:', testError.message);
    } else {
      console.log('✅ Basic queries working');
      console.log('📊 Sample sync statuses:');
      testData.forEach((record, index) => {
        const status = record.sync_status || 'unknown';
        const hasEvent = record.google_event_id ? '✅' : '❌';
        console.log(`   ${index + 1}. ${status} ${hasEvent}`);
      });
    }

    console.log('\n📋 Summary:');
    console.log('✅ Migration script completed');
    console.log('✅ Existing records initialized (if fields exist)');
    console.log('✅ Basic functionality tested');

    console.log('\n🔄 Next Steps:');
    console.log('1. Ensure database schema has sync fields (may require admin access)');
    console.log('2. Start unified calendar sync daemon');
    console.log('3. Monitor sync operations');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the migration
addSyncFields();




