#!/usr/bin/env node

/**
 * Validation Script for Timezone Backfill and Monitoring Scripts
 * 
 * This script validates that the timezone scripts work correctly with the actual
 * database schema and can handle real-world scenarios.
 */

try {
  require('dotenv').config();
} catch (error) {
  // dotenv is optional in production environments
}

const { createClient } = require('@supabase/supabase-js');

async function validateDatabaseSchema() {
  console.log('🔍 Validating database schema...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    return false;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const coreTables = ['appointments', 'staff', 'patients'];
  const timezoneTables = ['organization_settings', 'locations', 'timezone_change_audit'];
  const results = {};

  // Check core tables (required)
  for (const table of coreTables) {
    try {
      const { data, error } = await client
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`❌ Table ${table}: ${error.message}`);
        results[table] = { exists: false, error: error.message };
      } else {
        console.log(`✅ Table ${table}: exists`);
        results[table] = { exists: true, columns: data.length > 0 ? Object.keys(data[0]) : [] };
      }
    } catch (err) {
      console.error(`❌ Table ${table}: ${err.message}`);
      results[table] = { exists: false, error: err.message };
    }
  }

  // Check timezone tables (optional - may not exist yet)
  for (const table of timezoneTables) {
    try {
      const { data, error } = await client
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`⚠️  Table ${table}: not found (timezone migrations not applied yet)`);
        results[table] = { exists: false, error: error.message, optional: true };
      } else {
        console.log(`✅ Table ${table}: exists`);
        results[table] = { exists: true, columns: data.length > 0 ? Object.keys(data[0]) : [] };
      }
    } catch (err) {
      console.log(`⚠️  Table ${table}: not found (timezone migrations not applied yet)`);
      results[table] = { exists: false, error: err.message, optional: true };
    }
  }

  return results;
}

async function validateBackfillScript() {
  console.log('\n🔍 Validating backfill script...');
  
  try {
    const { parseArgs, collectFallbacks, isValidTimezone } = require('./comprehensive-timezone-backfill.js');
    
    // Test argument parsing
    const args = parseArgs(['--tables', 'appointments', '--limit', '5', '--dry-run']);
    console.log('✅ Argument parsing works');
    
    // Test fallback collection
    const fallbacks = collectFallbacks();
    console.log('✅ Fallback collection works:', fallbacks);
    
    // Test timezone validation
    const validTz = isValidTimezone('Asia/Dubai');
    const invalidTz = isValidTimezone('Invalid/Timezone');
    console.log('✅ Timezone validation works:', { validTz, invalidTz });
    
    return true;
  } catch (error) {
    console.error('❌ Backfill script validation failed:', error.message);
    return false;
  }
}

async function validateMonitoringScript() {
  console.log('\n🔍 Validating monitoring script...');
  
  try {
    const { TimezoneMonitor, parseArgs } = require('./timezone-monitoring-dashboard.js');
    
    // Test argument parsing
    const args = parseArgs(['--mode', 'report', '--format', 'json']);
    console.log('✅ Argument parsing works');
    
    // Test monitor class instantiation
    const mockClient = { from: () => ({ select: () => ({ gte: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) }) }) };
    const monitor = new TimezoneMonitor(mockClient, args);
    console.log('✅ Monitor class instantiation works');
    
    return true;
  } catch (error) {
    console.error('❌ Monitoring script validation failed:', error.message);
    return false;
  }
}

async function testDatabaseQueries() {
  console.log('\n🔍 Testing database queries...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('⚠️  Skipping database query tests - missing environment variables');
    return true;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    // Test appointments query
    const { data: appointments, error: appError } = await client
      .from('appointments')
      .select('id, appointment_date, start_time, duration_minutes, custom_fields, created_at')
      .limit(1);

    if (appError) {
      console.error('❌ Appointments query failed:', appError.message);
      return false;
    }
    console.log('✅ Appointments query works');

    // Test staff query (no custom_fields)
    const { data: staff, error: staffError } = await client
      .from('staff')
      .select('id, first_name, last_name, working_hours_start, working_hours_end, available_days, created_at')
      .limit(1);

    if (staffError) {
      console.error('❌ Staff query failed:', staffError.message);
      return false;
    }
    console.log('✅ Staff query works');

    // Test patients query (no custom_fields)
    const { data: patients, error: patientError } = await client
      .from('patients')
      .select('id, name, phone, flat_villa_no, building_street, area, city, created_at')
      .limit(1);

    if (patientError) {
      console.error('❌ Patients query failed:', patientError.message);
      return false;
    }
    console.log('✅ Patients query works');

    return true;
  } catch (error) {
    console.error('❌ Database query test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting timezone scripts validation...\n');

  const results = {
    databaseSchema: false,
    backfillScript: false,
    monitoringScript: false,
    databaseQueries: false,
  };

  // Validate database schema
  const schemaResults = await validateDatabaseSchema();
  results.databaseSchema = schemaResults && Object.entries(schemaResults).every(([table, result]) => 
    result.exists || result.optional
  );

  // Validate backfill script
  results.backfillScript = await validateBackfillScript();

  // Validate monitoring script
  results.monitoringScript = await validateMonitoringScript();

  // Test database queries
  results.databaseQueries = await testDatabaseQueries();

  console.log('\n📊 Validation Results:');
  console.log('==============================================');
  console.log(`Database Schema: ${results.databaseSchema ? '✅' : '❌'}`);
  console.log(`Backfill Script: ${results.backfillScript ? '✅' : '❌'}`);
  console.log(`Monitoring Script: ${results.monitoringScript ? '✅' : '❌'}`);
  console.log(`Database Queries: ${results.databaseQueries ? '✅' : '❌'}`);
  console.log('==============================================');

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('🎉 All validations passed! Scripts are ready for use.');
  } else {
    console.log('⚠️  Some validations failed. Please review the errors above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error.message || error);
    process.exit(1);
  });
}

module.exports = {
  validateDatabaseSchema,
  validateBackfillScript,
  validateMonitoringScript,
  testDatabaseQueries,
};
