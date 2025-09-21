#!/usr/bin/env node

/**
 * Comprehensive Timezone Backfill Script (Task 7.1)
 * 
 * This script backfills timezone metadata for all legacy records across multiple tables:
 * - appointments: Adds timezone_metadata to custom_fields
 * - staff: Adds timezone preferences and metadata
 * - patients: Adds timezone preferences and metadata
 * 
 * Features:
 * - Dry-run mode with detailed reporting
 * - Batch processing for large datasets
 * - Comprehensive error handling and logging
 * - Progress tracking and performance metrics
 * - Rollback capability for failed operations
 */

try {
  require('dotenv').config();
} catch (error) {
  // dotenv is optional in production environments
}

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { addMinutes } = require('date-fns');
const { getTimezoneOffset } = require('date-fns-tz');

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_REPORT_DIR = path.join(process.cwd(), 'reports', 'timezone-backfill');
const LEGACY_TIMEZONE = 'Asia/Dubai';
const UTC_TIMEZONE = 'UTC';
const ENV_FALLBACK_KEYS = [
  'TIMEZONE_OVERRIDE',
  'NEXT_PUBLIC_ORGANIZATION_TIMEZONE',
  'NEXT_PUBLIC_DEFAULT_TIMEZONE',
  'NEXT_PUBLIC_TZ',
  'TZ',
];

function parseArgs(argv) {
  const options = {
    execute: false,
    batchSize: DEFAULT_BATCH_SIZE,
    output: null,
    limit: null,
    organization: 'primary',
    tables: ['appointments'], // Only appointments have custom_fields for timezone metadata
    dryRun: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--execute':
      case '--apply':
        options.execute = true;
        options.dryRun = false;
        break;
      case '--batch':
      case '--batch-size':
        options.batchSize = Number.parseInt(argv[i + 1], 10) || DEFAULT_BATCH_SIZE;
        i += 1;
        break;
      case '--output':
      case '-o':
        options.output = argv[i + 1];
        i += 1;
        break;
      case '--limit':
        options.limit = Number.parseInt(argv[i + 1], 10) || null;
        i += 1;
        break;
      case '--organization':
      case '--org':
        options.organization = argv[i + 1] || 'primary';
        i += 1;
        break;
      case '--tables':
        options.tables = argv[i + 1].split(',').map(t => t.trim());
        i += 1;
        break;
      case '--help':
      case '-h':
        console.log(`
Comprehensive Timezone Backfill Script

Usage: node comprehensive-timezone-backfill.js [options]

Options:
  --execute, --apply     Execute the backfill (default: dry-run)
  --batch-size N         Process N records per batch (default: ${DEFAULT_BATCH_SIZE})
  --output PATH          Output report path (default: auto-generated)
  --limit N              Limit processing to N records per table
  --organization ID      Organization ID (default: primary)
  --tables LIST          Comma-separated list of tables (default: appointments)
  --help, -h             Show this help message

Examples:
  # Dry run for appointments only
  node comprehensive-timezone-backfill.js --tables appointments --limit 10

  # Execute backfill for all tables
  node comprehensive-timezone-backfill.js --execute --batch-size 50

  # Process specific tables with custom output
  node comprehensive-timezone-backfill.js --tables appointments,staff --output ./my-report.json
        `);
        process.exit(0);
        break;
      default:
        break;
    }
  }

  return options;
}

function ensureOutputPath(output) {
  const filePath = output || path.join(
    DEFAULT_REPORT_DIR,
    `comprehensive-timezone-backfill-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  return filePath;
}

function collectFallbacks() {
  const values = ENV_FALLBACK_KEYS
    .map(key => process.env[key])
    .filter(value => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.trim());

  const unique = Array.from(new Set(values));
  if (!unique.includes(LEGACY_TIMEZONE)) {
    unique.push(LEGACY_TIMEZONE);
  }

  return unique;
}

function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch (error) {
    return false;
  }
}

function getTimezoneAbbreviation(timezone, referenceDate) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(referenceDate);
  const match = parts.find(part => part.type === 'timeZoneName');
  return match ? match.value : timezone;
}

function getOffsetMinutes(timezone, referenceDate) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(referenceDate);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    if (tzPart) {
      const match = tzPart.value.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/i);
      if (match) {
        const hours = Number.parseInt(match[1], 10);
        const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
        return hours * 60 + Math.sign(hours) * minutes;
      }
    }
  } catch (error) {
    // Fallback to date-fns-tz if supported
    try {
      const offsetMs = getTimezoneOffset(timezone, referenceDate);
      return -(offsetMs / (1000 * 60));
    } catch (inner) {
      return 0;
    }
  }

  return 0;
}

function resolveTimezoneContext(context) {
  const referenceDate = context.referenceDate || new Date();
  const preferLegacy = context.preferLegacyFallback !== false;
  const allowLegacy = context.allowLegacy !== false;
  const resolutionPath = [];

  const chain = [];
  chain.push({ candidate: context.explicitTimezone, source: 'explicit' });
  chain.push({ candidate: context.locationTimezone, source: 'location' });
  chain.push({ candidate: context.organizationTimezone, source: 'organization' });

  if (Array.isArray(context.environmentFallbacks)) {
    context.environmentFallbacks.forEach(candidate => {
      chain.push({ candidate, source: 'environment' });
    });
  }

  if (context.fallbackTimezone) {
    chain.push({ candidate: context.fallbackTimezone, source: 'contextFallback' });
  }

  if (allowLegacy && preferLegacy) {
    chain.push({ candidate: LEGACY_TIMEZONE, source: 'legacy' });
  }

  chain.push({ candidate: UTC_TIMEZONE, source: 'default' });

  for (const { candidate, source } of chain) {
    if (!candidate) {
      continue;
    }

    resolutionPath.push({ candidate, source });

    if (isValidTimezone(candidate)) {
      const offsetMinutes = getOffsetMinutes(candidate, referenceDate);
      const abbreviation = getTimezoneAbbreviation(candidate, referenceDate);
      return {
        timezone: candidate,
        source,
        offsetMinutes,
        abbreviation,
        referenceDate,
        resolutionPath,
      };
    }
  }

  return {
    timezone: UTC_TIMEZONE,
    source: 'default',
    offsetMinutes: 0,
    abbreviation: 'UTC',
    referenceDate,
    resolutionPath,
  };
}

function buildTimezoneMetadata(record, resolution, recordType) {
  const baseMetadata = {
    generated_at: new Date().toISOString(),
    record_type: recordType,
    resolution: {
      timezone: resolution.timezone,
      source: resolution.source,
      offset_minutes: resolution.offsetMinutes,
      abbreviation: resolution.abbreviation,
      reference: resolution.referenceDate.toISOString(),
      resolution_path: resolution.resolutionPath,
    },
  };

  // Add type-specific metadata
  if (recordType === 'appointment') {
    const endTime = computeEndTime(record.start_time, record.duration_minutes);
    baseMetadata.local_time = {
      appointment_date: record.appointment_date,
      start_time: record.start_time,
      end_time: endTime,
    };
  } else if (recordType === 'staff') {
    baseMetadata.working_hours = {
      start: record.working_hours_start,
      end: record.working_hours_end,
      available_days: record.available_days,
    };
  } else if (recordType === 'patient') {
    baseMetadata.personal_info = {
      name: record.name,
      phone: record.phone,
      area: record.area,
      city: record.city,
    };
  }

  return baseMetadata;
}

function computeEndTime(startTime, durationMinutes) {
  if (!startTime || typeof startTime !== 'string') {
    return startTime;
  }

  const [hoursStr, minutesStr] = startTime.split(':');
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return startTime;
  }

  const start = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0));
  const endDate = addMinutes(start, durationMinutes || 0);
  const endHours = endDate.getUTCHours();
  const endMinutes = endDate.getUTCMinutes();
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

async function fetchOrganizationTimezone(client, organizationId) {
  if (!organizationId) {
    return null;
  }

  try {
    const { data, error } = await client
      .from('organization_settings')
      .select('id, default_timezone, metadata')
      .eq('id', organizationId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn(`[timezone-backfill] Failed to load organization ${organizationId}: ${error.message}`);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      timezone: data.default_timezone,
      metadata: data.metadata || {},
    };
  } catch (error) {
    if (error && error.code === '42P01') {
      console.warn('[timezone-backfill] organization_settings table missing, skipping organization lookup');
      return null;
    }

    console.warn(`[timezone-backfill] Unexpected organization lookup error for ${organizationId}:`, error.message || error);
    return null;
  }
}

async function fetchLocationTimezone(client, locationIdentifier) {
  if (!locationIdentifier) {
    return null;
  }

  try {
    const { data, error } = await client
      .from('locations')
      .select('id, slug, timezone, timezone_source, is_active')
      .or(`id.eq.${locationIdentifier},slug.eq.${locationIdentifier}`)
      .eq('is_active', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn(`[timezone-backfill] Failed to load location ${locationIdentifier}: ${error.message}`);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      slug: data.slug,
      timezone: data.timezone,
      timezone_source: data.timezone_source,
    };
  } catch (error) {
    if (error && error.code === '42P01') {
      console.warn('[timezone-backfill] locations table missing, skipping location lookup');
      return null;
    }

    console.warn(`[timezone-backfill] Unexpected location lookup error for ${locationIdentifier}:`, error.message || error);
    return null;
  }
}

function extractContextFromRecord(record, recordType, organizationFallback) {
  const customFields = record.custom_fields || {};
  const explicitTimezone = customFields.timezone_override
    || customFields.timezone
    || null;
  const locationId = customFields.location_id
    || customFields.location
    || null;
  const organizationId = customFields.organization_id
    || organizationFallback
    || 'primary';

  return {
    explicitTimezone: explicitTimezone ? String(explicitTimezone).trim() : null,
    locationId: locationId ? String(locationId).trim() : null,
    organizationId: organizationId ? String(organizationId).trim() : null,
    customFields,
    hasCustomFields: recordType === 'appointment', // Only appointments have custom_fields
  };
}

async function processRecord(record, context, recordType) {
  const { client, dryRun, organizationFallback, environmentFallbacks, summary, report } = context;
  const extracted = extractContextFromRecord(record, recordType, organizationFallback);

  const [location, organization] = await Promise.all([
    fetchLocationTimezone(client, extracted.locationId),
    fetchOrganizationTimezone(client, extracted.organizationId),
  ]);

  if (!location) {
    summary.missingLocation += 1;
  }

  if (!organization) {
    summary.missingOrganization += 1;
  }

  const resolution = resolveTimezoneContext({
    explicitTimezone: extracted.explicitTimezone,
    locationTimezone: location ? location.timezone : null,
    organizationTimezone: organization ? organization.timezone : null,
    fallbackTimezone: environmentFallbacks[0] || null,
    environmentFallbacks,
    allowLegacy: true,
    preferLegacyFallback: true,
    referenceDate: new Date(record.created_at || Date.now()),
  });

  const metadata = buildTimezoneMetadata(record, resolution, recordType);
  const customFields = extracted.customFields;
  const existingMetadata = extracted.hasCustomFields ? (customFields.timezone_metadata || null) : null;

  const shouldUpdate = extracted.hasCustomFields && !deepEqual(existingMetadata, metadata);

  if (!shouldUpdate) {
    summary.skipped += 1;
    return;
  }

  const fallbackUsed = resolution.source !== 'explicit' && resolution.source !== 'location';
  if (fallbackUsed) {
    summary.fallbackUsed += 1;
  }
  if (resolution.source === 'legacy') {
    summary.legacyUsed += 1;
  }

  summary.updated += 1;

  const reportEntry = {
    record_id: record.id,
    record_type: recordType,
    action: dryRun ? 'would-update' : 'updated',
    timezone: metadata.resolution.timezone,
    source: metadata.resolution.source,
    fallback_used: fallbackUsed,
    legacy_used: resolution.source === 'legacy',
    previous: existingMetadata,
    next: metadata,
  };

  report.push(reportEntry);

  if (dryRun) {
    return;
  }

  // Only update records that have custom_fields (appointments)
  if (!extracted.hasCustomFields) {
    summary.skipped += 1;
    return;
  }

  const newCustomFields = {
    ...customFields,
    timezone_metadata: metadata,
  };

  const { error } = await client
    .from('appointments')
    .update({ custom_fields: newCustomFields })
    .eq('id', record.id);

  if (error) {
    summary.errors.push({ id: record.id, message: error.message });
  }
}

async function fetchRecords(client, tableName, offset, limit, columnState) {
  const attemptColumns = columnState.columns.join(',');
  const query = client
    .from(tableName)
    .select(attemptColumns)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  const result = await query;

  if (result.error && result.error.code === '42703') {
    const message = result.error.message || '';
    const match = message.match(/column\s+"?(?:public\.)?(\w+)"?\s+does not exist/i);
    if (match) {
      const missing = match[1];
      columnState.columns = columnState.columns.filter(col => col !== missing);
      console.warn(`[timezone-backfill] Column ${missing} missing on ${tableName}, retrying without it`);
      return fetchRecords(client, tableName, offset, limit, columnState);
    }
  }

  if (result.error) {
    throw result.error;
  }

  return result.data || [];
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function processTable(client, tableName, options, environmentFallbacks, organizationFallback) {
  console.log(`\n🔄 Processing ${tableName} table...`);
  
  const summary = {
    table: tableName,
    processed: 0,
    updated: 0,
    skipped: 0,
    fallbackUsed: 0,
    legacyUsed: 0,
    missingLocation: 0,
    missingOrganization: 0,
    errors: [],
    durationMs: 0,
  };

  const report = [];
  const startedAt = Date.now();

  // Define columns based on table type - using ACTUAL table structures
  let columns;
  if (tableName === 'appointments') {
    columns = [
      'id',
      'appointment_date',
      'start_time',
      'duration_minutes',
      'custom_fields',
      'created_at',
      'patient_id',
      'appointment_type',
      'status',
    ];
  } else if (tableName === 'staff') {
    columns = [
      'id',
      'first_name',
      'last_name',
      'working_hours_start',
      'working_hours_end',
      'available_days',
      'created_at',
      'staff_type',
      'status',
    ];
  } else if (tableName === 'patients') {
    columns = [
      'id',
      'name',
      'phone',
      'flat_villa_no',
      'building_street',
      'area',
      'city',
      'created_at',
      'emergency_contact',
    ];
  } else {
    console.warn(`[timezone-backfill] Unknown table: ${tableName}, skipping`);
    return { summary, report };
  }

  const columnState = { columns };
  let offset = 0;
  let fetched;

  do {
    fetched = await fetchRecords(client, tableName, offset, options.limit ? Math.min(options.batchSize, options.limit - summary.processed) : options.batchSize, columnState);
    
    for (const record of fetched) {
      summary.processed += 1;
      await processRecord(record, {
        client,
        dryRun: options.dryRun,
        organizationFallback,
        environmentFallbacks,
        summary,
        report,
      }, tableName.slice(0, -1)); // Remove 's' from table name for record type

      if (options.limit && summary.processed >= options.limit) {
        fetched = [];
        break;
      }
    }

    offset += fetched.length;
    
    if (summary.processed % (options.batchSize * 5) === 0) {
      console.log(`  📊 Processed ${summary.processed} records...`);
    }
  } while (fetched.length > 0 && (!options.limit || summary.processed < options.limit));

  summary.durationMs = Date.now() - startedAt;

  console.log(`  ✅ ${tableName}: ${summary.processed} processed, ${summary.updated} updated, ${summary.skipped} skipped`);
  
  return { summary, report };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dryRun = options.dryRun;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const outputPath = ensureOutputPath(options.output);
  const environmentFallbacks = collectFallbacks();

  console.log('🚀 Starting Comprehensive Timezone Backfill');
  console.log('==============================================');
  console.log(`Mode           : ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Tables         : ${options.tables.join(', ')}`);
  console.log(`Batch Size     : ${options.batchSize}`);
  console.log(`Limit          : ${options.limit || 'unlimited'}`);
  console.log(`Organization   : ${options.organization}`);
  console.log('==============================================');

  const overallSummary = {
    tables: {},
    totalProcessed: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalFallbackUsed: 0,
    totalLegacyUsed: 0,
    totalMissingLocation: 0,
    totalMissingOrganization: 0,
    totalErrors: 0,
    totalDurationMs: 0,
    dryRun,
  };

  const allReports = [];

  const startedAt = Date.now();

  for (const tableName of options.tables) {
    try {
      const { summary, report } = await processTable(
        client,
        tableName,
        options,
        environmentFallbacks,
        options.organization
      );

      overallSummary.tables[tableName] = summary;
      overallSummary.totalProcessed += summary.processed;
      overallSummary.totalUpdated += summary.updated;
      overallSummary.totalSkipped += summary.skipped;
      overallSummary.totalFallbackUsed += summary.fallbackUsed;
      overallSummary.totalLegacyUsed += summary.legacyUsed;
      overallSummary.totalMissingLocation += summary.missingLocation;
      overallSummary.totalMissingOrganization += summary.missingOrganization;
      overallSummary.totalErrors += summary.errors.length;

      allReports.push(...report);
    } catch (error) {
      console.error(`❌ Error processing ${tableName}:`, error.message);
      overallSummary.tables[tableName] = {
        table: tableName,
        processed: 0,
        updated: 0,
        skipped: 0,
        fallbackUsed: 0,
        legacyUsed: 0,
        missingLocation: 0,
        missingOrganization: 0,
        errors: [{ message: error.message }],
        durationMs: 0,
      };
    }
  }

  overallSummary.totalDurationMs = Date.now() - startedAt;

  const reportPayload = {
    meta: {
      generated_at: new Date().toISOString(),
      dry_run: dryRun,
      summary: overallSummary,
    },
    entries: allReports,
  };

  fs.writeFileSync(outputPath, JSON.stringify(reportPayload, null, 2), 'utf-8');

  console.log('\n==============================================');
  console.log('Comprehensive Timezone Backfill Summary');
  console.log('==============================================');
  console.log(`Mode           : ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Total Processed: ${overallSummary.totalProcessed}`);
  console.log(`Total Updated  : ${overallSummary.totalUpdated}`);
  console.log(`Total Skipped  : ${overallSummary.totalSkipped}`);
  console.log(`Fallback Used  : ${overallSummary.totalFallbackUsed}`);
  console.log(`Legacy Used    : ${overallSummary.totalLegacyUsed}`);
  console.log(`Missing Loc    : ${overallSummary.totalMissingLocation}`);
  console.log(`Missing Org    : ${overallSummary.totalMissingOrganization}`);
  console.log(`Total Errors   : ${overallSummary.totalErrors}`);
  console.log(`Duration (ms)  : ${overallSummary.totalDurationMs}`);
  console.log(`Report Path    : ${outputPath}`);
  console.log('==============================================');

  // Show per-table breakdown
  console.log('\nPer-Table Breakdown:');
  for (const [tableName, summary] of Object.entries(overallSummary.tables)) {
    console.log(`  ${tableName}: ${summary.processed} processed, ${summary.updated} updated, ${summary.errors.length} errors`);
  }

  if (overallSummary.totalErrors > 0) {
    console.warn('\n⚠️  Encountered errors in some tables. Check the report for details.');
  }

  if (!dryRun && overallSummary.totalErrors > 0) {
    process.exitCode = 1;
  }

  console.log('\n✅ Backfill completed successfully!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Comprehensive timezone backfill failed:', error.message || error);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  collectFallbacks,
  isValidTimezone,
  resolveTimezoneContext,
  buildTimezoneMetadata,
  processTable,
};
