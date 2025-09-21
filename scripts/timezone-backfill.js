#!/usr/bin/env node

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

const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_REPORT_DIR = path.join(process.cwd(), 'reports', 'timezone');
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
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--execute':
      case '--apply':
        options.execute = true;
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
      default:
        break;
    }
  }

  return options;
}

function ensureOutputPath(output) {
  const filePath = output || path.join(
    DEFAULT_REPORT_DIR,
    `timezone-backfill-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
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

function parseOffsetMinutes(offsetString) {
  if (typeof offsetString !== 'string') {
    return 0;
  }

  const match = offsetString.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/i);
  if (!match) {
    return 0;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  return hours * 60 + Math.sign(hours) * minutes;
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
      return parseOffsetMinutes(tzPart.value);
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

function normalizeCustomFields(customFields) {
  if (!customFields) {
    return {};
  }

  if (typeof customFields === 'string') {
    try {
      return JSON.parse(customFields);
    } catch (error) {
      return {};
    }
  }

  return { ...customFields };
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

function deepEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

function buildTimezoneMetadata(appointment, resolution) {
  const endTime = computeEndTime(appointment.start_time, appointment.duration_minutes);

  return {
    generated_at: new Date().toISOString(),
    resolution: {
      timezone: resolution.timezone,
      source: resolution.source,
      offset_minutes: resolution.offsetMinutes,
      abbreviation: resolution.abbreviation,
      reference: resolution.referenceDate.toISOString(),
      resolution_path: resolution.resolutionPath,
    },
    local_time: {
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      end_time: endTime,
    },
  };
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

function extractContextFromAppointment(appointment, organizationFallback) {
  const customFields = normalizeCustomFields(appointment.custom_fields);
  const explicitTimezone = appointment.timezone_override
    || customFields.timezone_override
    || customFields.timezone
    || null;
  const locationId = appointment.location_id
    || customFields.location_id
    || customFields.location
    || null;
  const organizationId = appointment.organization_id
    || customFields.organization_id
    || organizationFallback
    || 'primary';

  return {
    explicitTimezone: explicitTimezone ? String(explicitTimezone).trim() : null,
    locationId: locationId ? String(locationId).trim() : null,
    organizationId: organizationId ? String(organizationId).trim() : null,
    customFields,
  };
}

async function processAppointment(record, context) {
  const { client, dryRun, organizationFallback, environmentFallbacks, summary, report } = context;
  const extracted = extractContextFromAppointment(record, organizationFallback);

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
    referenceDate: new Date(record.appointment_date || Date.now()),
  });

  const metadata = buildTimezoneMetadata(record, resolution);
  const customFields = extracted.customFields;
  const existingMetadata = customFields.timezone_metadata || null;

  const shouldUpdate = !deepEqual(existingMetadata, metadata);

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
    appointment_id: record.id,
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

async function fetchAppointments(client, offset, limit, columnState) {
  const attemptColumns = columnState.columns.join(',');
  const query = client
    .from('appointments')
    .select(attemptColumns)
    .order('appointment_date', { ascending: true })
    .range(offset, offset + limit - 1);

  const result = await query;

  if (result.error && result.error.code === '42703') {
    const message = result.error.message || '';
    const match = message.match(/column\s+"?(?:public\.)?(\w+)"?\s+does not exist/i);
    if (match) {
      const missing = match[1];
      columnState.columns = columnState.columns.filter(col => col !== missing);
      console.warn(`[timezone-backfill] Column ${missing} missing on appointments, retrying without it`);
      return fetchAppointments(client, offset, limit, columnState);
    }
  }

  if (result.error) {
    throw result.error;
  }

  return result.data || [];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dryRun = !options.execute;

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

  const summary = {
    processed: 0,
    updated: 0,
    skipped: 0,
    fallbackUsed: 0,
    legacyUsed: 0,
    missingLocation: 0,
    missingOrganization: 0,
    errors: [],
    durationMs: 0,
    dryRun,
  };

  const report = [];
  const startedAt = Date.now();

  const columnState = {
    columns: [
      'id',
      'appointment_date',
      'start_time',
      'duration_minutes',
      'custom_fields',
      'updated_at',
      'location_id',
      'organization_id',
      'timezone_override',
    ],
  };

  let offset = 0;
  let fetched;

  do {
    fetched = await fetchAppointments(client, offset, options.limit ? Math.min(options.batchSize, options.limit - summary.processed) : options.batchSize, columnState);
    for (const record of fetched) {
      summary.processed += 1;
      await processAppointment(record, {
        client,
        dryRun,
        organizationFallback: options.organization,
        environmentFallbacks,
        summary,
        report,
      });

      if (options.limit && summary.processed >= options.limit) {
        fetched = [];
        break;
      }
    }

    offset += fetched.length;
  } while (fetched.length > 0 && (!options.limit || summary.processed < options.limit));

  summary.durationMs = Date.now() - startedAt;

  const reportPayload = {
    meta: {
      generated_at: new Date().toISOString(),
      dry_run: dryRun,
      summary,
    },
    entries: report,
  };

  fs.writeFileSync(outputPath, JSON.stringify(reportPayload, null, 2), 'utf-8');

  console.log('==============================================');
  console.log('Timezone Backfill Summary');
  console.log('----------------------------------------------');
  console.log(`Mode           : ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Processed      : ${summary.processed}`);
  console.log(`Updated        : ${summary.updated}`);
  console.log(`Skipped        : ${summary.skipped}`);
  console.log(`Fallback Used  : ${summary.fallbackUsed}`);
  console.log(`Legacy Used    : ${summary.legacyUsed}`);
  console.log(`Missing Loc    : ${summary.missingLocation}`);
  console.log(`Missing Org    : ${summary.missingOrganization}`);
  console.log(`Errors         : ${summary.errors.length}`);
  console.log(`Duration (ms)  : ${summary.durationMs}`);
  console.log(`Report Path    : ${outputPath}`);
  console.log('==============================================');

  if (summary.errors.length > 0) {
    console.warn('[timezone-backfill] Encountered errors:', summary.errors.slice(0, 5));
  }

  if (!dryRun && summary.errors.length > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Timezone backfill failed:', error.message || error);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  collectFallbacks,
  isValidTimezone,
  resolveTimezoneContext,
  computeEndTime,
  buildTimezoneMetadata,
};
