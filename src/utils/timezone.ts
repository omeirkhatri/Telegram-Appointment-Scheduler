import { addDays, addMinutes, endOfDay, endOfWeek, format, isSameDay, isValid, parseISO, startOfDay, startOfWeek, subDays } from 'date-fns';
import { fromZonedTime, getTimezoneOffset as getTzOffset, toZonedTime } from 'date-fns-tz';

export const LEGACY_TIMEZONE = 'Asia/Dubai';
export const UTC_TIMEZONE = 'UTC';

export const DATE_FMT = 'dd/MM/yyyy';
export const TIME_FMT = 'HH:mm';
export const DATETIME_FMT = `${DATE_FMT} ${TIME_FMT}`;
export const ISO_DATE_FMT = 'yyyy-MM-dd';
export const ISO_TIME_FMT = 'HH:mm:ss';
export const DAILY_AGENDA_TIME = '21:00';

type TimezoneMonitoringService = typeof import('../services/timezoneMonitoringService').timezoneMonitoringService;

let cachedMonitoringService: TimezoneMonitoringService | null = null;

function getMonitoringService(): TimezoneMonitoringService | null {
  if (cachedMonitoringService) {
    return cachedMonitoringService;
  }

  // Try to load the monitoring service asynchronously without blocking
  if (typeof window === 'undefined') {
    // Server-side: use dynamic import but don't await
    import('../services/timezoneMonitoringService')
      .then(module => {
        cachedMonitoringService = module.timezoneMonitoringService;
      })
      .catch(error => {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('⚠️  Timezone monitoring service unavailable:', error);
        }
      });
  }

  return null;
}

export type DateInput = Date | string;

export type TimezoneSource =
  | 'explicit'
  | 'location'
  | 'organization'
  | 'contextFallback'
  | 'environment'
  | 'legacy'
  | 'default';

export interface TimezoneResolutionTelemetry {
  context: NormalizedContext;
  options: InternalOptions;
  resolution: TimezoneResolution;
  cacheHit: boolean;
  timestamp: string;
  performance?: {
    cacheHit: boolean;
    resolutionPathLength: number;
    fallbackUsed: boolean;
    legacyUsed: boolean;
  };
  contextSummary?: {
    hasExplicit: boolean;
    hasLocation: boolean;
    hasOrganization: boolean;
    hasFallback: boolean;
    preferLegacy: boolean;
  };
}

export interface TimezoneContext {
  explicitTimezone?: string | null;
  locationTimezone?: string | null;
  organizationTimezone?: string | null;
  fallbackTimezone?: string | null;
  preferLegacyFallback?: boolean;
}

export interface ResolveOptions {
  allowLegacy?: boolean;
  referenceDate?: Date;
  memoize?: boolean;
  strict?: boolean;
}

export interface TimezoneResolution {
  timezone: string;
  source: TimezoneSource;
  offsetMinutes: number;
  abbreviation: string;
  referenceDate: Date;
  resolutionPath: Array<{ candidate: string; source: TimezoneSource }>;
}

interface NormalizedContext {
  explicitTimezone: string | null;
  locationTimezone: string | null;
  organizationTimezone: string | null;
  fallbackTimezone: string | null;
  preferLegacyFallback: boolean;
}

interface InternalOptions {
  allowLegacy: boolean;
  referenceDate: Date;
  memoize: boolean;
  strict: boolean;
}

const DEFAULT_OPTIONS: InternalOptions = {
  allowLegacy: true,
  referenceDate: new Date(),
  memoize: true,
  strict: false,
};

const resolutionCache = new Map<string, TimezoneResolution>();

const DEFAULT_LEGACY_CONTEXT: TimezoneContext = {
  fallbackTimezone: LEGACY_TIMEZONE,
  preferLegacyFallback: true,
};

// Telemetry logging for timezone resolution tracking
function logTimezoneResolution(telemetry: TimezoneResolutionTelemetry): void {
  const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  
  // Only log in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_TIMEZONE_TELEMETRY) {
    return;
  }

  const logData = {
    type: 'timezone_resolution',
    level: logLevel,
    ...telemetry,
    // Add performance metrics
    performance: {
      cacheHit: telemetry.cacheHit,
      resolutionPathLength: telemetry.resolution.resolutionPath.length,
      fallbackUsed: telemetry.resolution.source !== 'explicit' && telemetry.resolution.source !== 'location',
      legacyUsed: telemetry.resolution.source === 'legacy',
    },
    // Add context summary for easier debugging
    contextSummary: {
      hasExplicit: Boolean(telemetry.context.explicitTimezone),
      hasLocation: Boolean(telemetry.context.locationTimezone),
      hasOrganization: Boolean(telemetry.context.organizationTimezone),
      hasFallback: Boolean(telemetry.context.fallbackTimezone),
      preferLegacy: telemetry.context.preferLegacyFallback,
    },
  };

  // Use structured logging
  if (logLevel === 'debug') {
    console.debug('🕐 Timezone Resolution:', JSON.stringify(logData, null, 2));
  } else {
    console.log('🕐 Timezone Resolution:', JSON.stringify(logData));
  }

  const monitoringService = getMonitoringService();
  if (monitoringService) {
    try {
      monitoringService.recordResolution(logData);
    } catch (error) {
      console.warn('⚠️  Failed to record timezone monitoring telemetry:', error);
    }
  }
}

const ENV_TIMEZONE_KEYS = [
  'NEXT_PUBLIC_ORGANIZATION_TIMEZONE',
  'NEXT_PUBLIC_DEFAULT_TIMEZONE',
  'NEXT_PUBLIC_TZ',
  'TZ',
];

function normalizeTimezone(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function buildCacheKey(context: NormalizedContext, options: InternalOptions): string {
  return JSON.stringify({
    explicitTimezone: context.explicitTimezone,
    locationTimezone: context.locationTimezone,
    organizationTimezone: context.organizationTimezone,
    fallbackTimezone: context.fallbackTimezone,
    preferLegacyFallback: context.preferLegacyFallback,
    allowLegacy: options.allowLegacy,
    referenceDate: options.referenceDate.toISOString(),
  });
}

export function isValidTimezone(timezone: string | null | undefined): timezone is string {
  if (!timezone) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getAvailableTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return [];
}

function normalizeContext(context?: TimezoneContext): NormalizedContext {
  return {
    explicitTimezone: normalizeTimezone(context?.explicitTimezone),
    locationTimezone: normalizeTimezone(context?.locationTimezone),
    organizationTimezone: normalizeTimezone(context?.organizationTimezone),
    fallbackTimezone: normalizeTimezone(context?.fallbackTimezone),
    preferLegacyFallback: context?.preferLegacyFallback ?? true,
  };
}

function normalizeOptions(options?: ResolveOptions): InternalOptions {
  return {
    allowLegacy: options?.allowLegacy ?? DEFAULT_OPTIONS.allowLegacy,
    referenceDate: options?.referenceDate ?? DEFAULT_OPTIONS.referenceDate,
    memoize: options?.memoize ?? DEFAULT_OPTIONS.memoize,
    strict: options?.strict ?? DEFAULT_OPTIONS.strict,
  };
}

function parseDateInput(input: DateInput): Date {
  if (input instanceof Date) {
    return input;
  }

  const parsed = parseISO(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date input: ${input}`);
  }
  return parsed;
}

function getTimezoneAbbreviation(timezone: string, referenceDate: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(referenceDate);
  const match = parts.find(part => part.type === 'timeZoneName');
  return match?.value ?? timezone;
}

function getOffsetMinutes(timezone: string, referenceDate: Date): number {
  return getTzOffset(timezone, referenceDate) / (1000 * 60);
}

function getEnvironmentFallbacks(): Array<{ candidate: string; source: TimezoneSource }> {
  const values = ENV_TIMEZONE_KEYS
    .map(key => normalizeTimezone(process.env[key]))
    .filter((value): value is string => Boolean(value));

  const unique = Array.from(new Set(values));
  return unique.map(value => ({ candidate: value, source: 'environment' as const }));
}

function resolveCandidateTimezone(
  candidates: Array<{ candidate: string | null; source: TimezoneSource }>,
  referenceDate: Date,
  strict: boolean,
): TimezoneResolution {
  const resolutionPath: Array<{ candidate: string; source: TimezoneSource }> = [];

  for (const { candidate, source } of candidates) {
    if (!candidate) {
      continue;
    }

    resolutionPath.push({ candidate, source });

    if (isValidTimezone(candidate)) {
      return {
        timezone: candidate,
        source,
        offsetMinutes: getOffsetMinutes(candidate, referenceDate),
        abbreviation: getTimezoneAbbreviation(candidate, referenceDate),
        referenceDate,
        resolutionPath,
      };
    }
  }

  if (strict) {
    throw new Error('Could not resolve a valid timezone from provided context');
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

export function resolveTimezone(
  context?: TimezoneContext,
  options?: ResolveOptions,
): TimezoneResolution {
  const normalizedContext = normalizeContext(context);
  const normalizedOptions = normalizeOptions(options);

  const cacheKey = buildCacheKey(normalizedContext, normalizedOptions);
  if (normalizedOptions.memoize) {
    const cachedResolution = resolutionCache.get(cacheKey);
    if (cachedResolution) {
      // Log cache hit for telemetry
      logTimezoneResolution({
        context: normalizedContext,
        options: normalizedOptions,
        resolution: cachedResolution,
        cacheHit: true,
        timestamp: new Date().toISOString(),
      });
      return cachedResolution;
    }
  }

  const candidateChain: Array<{ candidate: string | null; source: TimezoneSource }> = [
    { candidate: normalizedContext.explicitTimezone, source: 'explicit' },
    { candidate: normalizedContext.locationTimezone, source: 'location' },
    { candidate: normalizedContext.organizationTimezone, source: 'organization' },
    { candidate: normalizedContext.fallbackTimezone, source: 'contextFallback' },
    ...getEnvironmentFallbacks(),
  ];

  if (normalizedOptions.allowLegacy && normalizedContext.preferLegacyFallback) {
    candidateChain.push({ candidate: LEGACY_TIMEZONE, source: 'legacy' });
  }

  candidateChain.push({ candidate: UTC_TIMEZONE, source: 'default' });

  let resolution: TimezoneResolution;

  try {
    resolution = resolveCandidateTimezone(
      candidateChain,
      normalizedOptions.referenceDate,
      normalizedOptions.strict,
    );
  } catch (error) {
    const monitoringService = getMonitoringService();
    if (monitoringService) {
      monitoringService.recordResolverError(error, {
        candidates: candidateChain,
        strict: normalizedOptions.strict,
      });
    }
    throw error;
  }

  // Log resolution for telemetry
  logTimezoneResolution({
    context: normalizedContext,
    options: normalizedOptions,
    resolution,
    cacheHit: false,
    timestamp: new Date().toISOString(),
  });

  if (normalizedOptions.memoize) {
    resolutionCache.set(cacheKey, resolution);
  }

  return resolution;
}

export function clearTimezoneResolutionCache(): void {
  resolutionCache.clear();
}

export function toLocalTime(
  date: DateInput,
  context?: TimezoneContext,
  options?: ResolveOptions,
): Date {
  const resolution = resolveTimezone(context, options);
  return toZonedTime(parseDateInput(date), resolution.timezone);
}

export function toUTC(
  date: DateInput,
  context?: TimezoneContext,
  options?: ResolveOptions,
): Date {
  const resolution = resolveTimezone(context, options);
  return fromZonedTime(parseDateInput(date), resolution.timezone);
}

export function toLocal(
  date: DateInput,
  context?: TimezoneContext,
  options?: ResolveOptions,
): Date {
  return toLocalTime(date, context ?? DEFAULT_LEGACY_CONTEXT, options);
}

export function formatInResolvedTimezone(
  date: DateInput,
  formatStr: string,
  context?: TimezoneContext,
  options?: ResolveOptions,
): string {
  const resolution = resolveTimezone(context, options);
  const parsedDate = parseDateInput(date);
  const zoned = toZonedTime(parsedDate, resolution.timezone);
  return format(zoned, formatStr);
}

export function getResolvedDayRange(
  date: DateInput,
  context?: TimezoneContext,
  options?: ResolveOptions,
): { start: Date; end: Date; timezone: TimezoneResolution } {
  const resolution = resolveTimezone(context, options);
  const parsedDate = parseDateInput(date);
  const start = startOfDay(toZonedTime(parsedDate, resolution.timezone));
  const end = endOfDay(start);

  return {
    start: fromZonedTime(start, resolution.timezone),
    end: fromZonedTime(end, resolution.timezone),
    timezone: resolution,
  };
}

export function getResolvedWeekRange(
  date: DateInput,
  context?: TimezoneContext,
  options?: ResolveOptions,
): { start: Date; end: Date; timezone: TimezoneResolution } {
  const resolution = resolveTimezone(context, options);
  const parsedDate = parseDateInput(date);
  const zonedDate = toZonedTime(parsedDate, resolution.timezone);
  const start = startOfWeek(zonedDate, { weekStartsOn: 1 });
  const end = endOfWeek(zonedDate, { weekStartsOn: 1 });

  return {
    start: fromZonedTime(start, resolution.timezone),
    end: fromZonedTime(end, resolution.timezone),
    timezone: resolution,
  };
}

export function getResolvedAgendaAnchor(
  reference: DateInput = new Date(),
  context?: TimezoneContext,
  options?: ResolveOptions,
): Date {
  const resolution = resolveTimezone(context, options);
  const zonedNow = toZonedTime(parseDateInput(reference), resolution.timezone);
  const agendaAnchor = parseISO(`${format(zonedNow, 'yyyy-MM-dd')}T${DAILY_AGENDA_TIME}:00`);

  if (zonedNow > agendaAnchor) {
    const tomorrow = addDays(startOfDay(zonedNow), 1);
    return fromZonedTime(
      parseISO(`${format(tomorrow, 'yyyy-MM-dd')}T${DAILY_AGENDA_TIME}:00`),
      resolution.timezone,
    );
  }

  return fromZonedTime(agendaAnchor, resolution.timezone);
}

export function formatAppointmentWindow(
  appointmentDate: string,
  startTime: string,
  durationMinutes: number,
  context?: TimezoneContext,
  options?: ResolveOptions,
): { startLocal: string; endLocal: string; timezone: TimezoneResolution } {
  const resolution = resolveTimezone(context, options);
  const startLocal = parseISO(`${appointmentDate}T${startTime}:00`);
  const endLocal = addMinutes(startLocal, durationMinutes);

  return {
    startLocal: formatInResolvedTimezone(startLocal, TIME_FMT, context, options),
    endLocal: formatInResolvedTimezone(endLocal, TIME_FMT, context, options),
    timezone: resolution,
  };
}

export function buildLegacyTimezoneContext(): TimezoneContext {
  return { ...DEFAULT_LEGACY_CONTEXT };
}

// ---------------------------------------------------------------------------
// Legacy compatibility exports - retained for incremental migration
// ---------------------------------------------------------------------------

export const DUBAI_TIMEZONE = LEGACY_TIMEZONE;
export const TZ = LEGACY_TIMEZONE;
export const UTC_TZ = UTC_TIMEZONE;

const legacyContext = buildLegacyTimezoneContext();

export function toDubaiTime(date: DateInput): Date {
  return toLocalTime(date, legacyContext);
}

export function fromDubaiTime(date: DateInput): Date {
  return toUTC(date, legacyContext);
}

export function getCurrentDubaiTime(): Date {
  return toLocalTime(new Date(), legacyContext);
}

export function formatDubaiDate(date: DateInput, formatStr: string = DATE_FMT): string {
  return formatInResolvedTimezone(date, formatStr, legacyContext);
}

export function formatDubaiTime(date: DateInput, formatStr: string = TIME_FMT): string {
  return formatInResolvedTimezone(date, formatStr, legacyContext);
}

export function getTodayDubai(): Date {
  const start = getResolvedDayRange(new Date(), legacyContext).start;
  return start;
}

export function getTomorrowDubai(): Date {
  return addDays(getTodayDubai(), 1);
}

export function getDubaiDayRange(date: DateInput): { start: Date; end: Date } {
  const { start, end } = getResolvedDayRange(date, legacyContext);
  return { start, end };
}

export function isPastDailyAgendaTime(): boolean {
  const now = getCurrentDubaiTime();
  const agendaTime = parseISO(`${format(now, 'yyyy-MM-dd')}T${DAILY_AGENDA_TIME}:00`);
  return now > agendaTime;
}

export function getNextDailyAgendaTime(): Date {
  return getResolvedAgendaAnchor(new Date(), legacyContext);
}

export function getAgendaDate(): Date {
  return addDays(startOfDay(getCurrentDubaiTime()), 1);
}

export function utcToDubaiDateString(utcDate: Date): string {
  return formatInResolvedTimezone(utcDate, 'yyyy-MM-dd', legacyContext);
}

export function dubaiDateStringToUtcRange(dateString: string): { start: Date; end: Date } {
  return getDubaiDayRange(parseISO(`${dateString}T00:00:00`));
}

export function getStaffWorkingHours(
  workingHoursStart: string,
  workingHoursEnd: string,
  date: Date,
): { start: Date; end: Date } {
  const resolution = resolveTimezone(legacyContext);
  const zonedDate = toZonedTime(date, resolution.timezone);
  const dateString = format(zonedDate, 'yyyy-MM-dd');

  const startTime = parseISO(`${dateString}T${workingHoursStart}:00`);
  const endTime = parseISO(`${dateString}T${workingHoursEnd}:00`);

  return {
    start: fromDubaiTime(startTime),
    end: fromDubaiTime(endTime),
  };
}

export function isStaffAvailableOnDay(
  availableDays: number[],
  date: Date,
  context?: TimezoneContext,
  options?: ResolveOptions,
): boolean {
  const resolution = resolveTimezone(context ?? legacyContext, options);
  const localDate = toZonedTime(date, resolution.timezone);
  const dayOfWeek = localDate.getDay();
  const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
  return availableDays.includes(dayNumber);
}

export function getStaffForDailyAgenda(
  staff: Array<{ id: string; email: string; status: 'active' | 'inactive'; available_days: number[] }>,
  date: Date,
  context?: TimezoneContext,
  options?: ResolveOptions,
): Array<{ id: string; email: string }> {
  return staff
    .filter(member =>
      member.status === 'active' &&
      isStaffAvailableOnDay(member.available_days, date, context, options)
    )
    .map(member => ({ id: member.id, email: member.email }));
}

export function formatAppointmentTime(
  appointmentDate: string,
  startTime: string,
  durationMinutes: number,
  context?: TimezoneContext,
  options?: ResolveOptions,
): { startTime: string; endTime: string; timezone: TimezoneResolution } {
  const window = formatAppointmentWindow(appointmentDate, startTime, durationMinutes, context, options);

  return {
    startTime: window.startLocal,
    endTime: window.endLocal,
    timezone: window.timezone,
  };
}

export function getDubaiTimezoneOffset(): number {
  return resolveTimezone(legacyContext).offsetMinutes;
}

export function isDubaiTimezoneSupported(): boolean {
  return isValidTimezone(LEGACY_TIMEZONE);
}

export function formatDateInTimezone(
  date: DateInput,
  formatStr: string = DATE_FMT,
  timezone: string = LEGACY_TIMEZONE,
): string {
  const candidate = normalizeTimezone(timezone);
  if (!candidate) {
    return 'Invalid date';
  }
  if (!isValidTimezone(candidate)) {
    return 'Invalid date';
  }
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) {
    return 'Invalid date';
  }
  const zoned = toZonedTime(parsed, candidate);
  return format(zoned, formatStr);
}

export function nowInTimezone(timezone: string = LEGACY_TIMEZONE): Date {
  const candidate = normalizeTimezone(timezone);
  if (!candidate || !isValidTimezone(candidate)) {
    return new Date();
  }
  return toZonedTime(new Date(), candidate);
}

export function timeStringToUTC(timeString: string, date: Date = new Date()): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const localDate = new Date(date);
  localDate.setHours(hours, minutes, 0, 0);
  return fromDubaiTime(localDate);
}

export function utcToTimeString(utcDate: DateInput): string {
  const dateObj = parseDateInput(utcDate);
  return formatDubaiTime(dateObj, TIME_FMT);
}

export function dateStringToUTC(dateString: string, timeString: string = '00:00'): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  return fromDubaiTime(localDate);
}

export function utcToDateString(utcDate: DateInput): string {
  return formatDubaiDate(parseDateInput(utcDate), ISO_DATE_FMT);
}

export function getAppointmentStartTimeUTC(appointmentDate: string, startTime: string): Date {
  return dateStringToUTC(appointmentDate, startTime);
}

export function getAppointmentEndTimeUTC(
  appointmentDate: string,
  startTime: string,
  durationMinutes: number,
): Date {
  const startUTC = getAppointmentStartTimeUTC(appointmentDate, startTime);
  return addMinutes(startUTC, durationMinutes);
}

export function formatAppointmentTimeRange(
  appointmentDate: string,
  startTime: string,
  durationMinutes: number,
): string {
  const startUTC = getAppointmentStartTimeUTC(appointmentDate, startTime);
  const endUTC = getAppointmentEndTimeUTC(appointmentDate, startTime, durationMinutes);

  const startDisplay = formatDubaiTime(startUTC, TIME_FMT);
  const endDisplay = formatDubaiTime(endUTC, TIME_FMT);

  return `${startDisplay} - ${endDisplay}`;
}

export function formatTimeToHHMM(timeString: string): string {
  if (timeString.includes(':')) {
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
  }
  return timeString;
}

export function appointmentsOverlap(
  date1: string,
  startTime1: string,
  duration1: number,
  date2: string,
  startTime2: string,
  duration2: number,
): boolean {
  const start1 = getAppointmentStartTimeUTC(date1, startTime1);
  const end1 = getAppointmentEndTimeUTC(date1, startTime1, duration1);
  const start2 = getAppointmentStartTimeUTC(date2, startTime2);
  const end2 = getAppointmentEndTimeUTC(date2, startTime2, duration2);

  return start1 < end2 && start2 < end1;
}

export function getWorkingHoursInTimezone(
  startTime: string,
  endTime: string,
  timezone: string = LEGACY_TIMEZONE,
): { start: Date; end: Date } {
  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  startDate.setHours(startHours, startMinutes, 0, 0);
  endDate.setHours(endHours, endMinutes, 0, 0);

  if (timezone === LEGACY_TIMEZONE) {
    return {
      start: fromDubaiTime(startDate),
      end: fromDubaiTime(endDate),
    };
  }

  return {
    start: startDate,
    end: endDate,
  };
}

export function isWithinWorkingHours(time: string, startTime: string, endTime: string): boolean {
  const [timeHours, timeMinutes] = time.split(':').map(Number);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const timeMinutesTotal = timeHours * 60 + timeMinutes;
  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;

  return timeMinutesTotal >= startMinutesTotal && timeMinutesTotal <= endMinutesTotal;
}

export function getTimezoneOffset(): number {
  return getDubaiTimezoneOffset();
}

export function formatDate(date: DateInput, formatStr: string = DATE_FMT): string {
  return formatDubaiDate(date, formatStr);
}

export function formatTime(date: DateInput, formatStr: string = TIME_FMT): string {
  return formatDubaiTime(date, formatStr);
}

export function formatDateTime(date: DateInput, formatStr: string = DATETIME_FMT): string {
  return formatInResolvedTimezone(date, formatStr, legacyContext);
}

export function now(): Date {
  return getCurrentDubaiTime();
}

export function startOfWeekLocal(date: Date = getCurrentDubaiTime()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function endOfWeekLocal(date: Date = getCurrentDubaiTime()): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function addDaysLocal(date: Date, days: number): Date {
  return addDays(date, days);
}

export function subDaysLocal(date: Date, days: number): Date {
  return subDays(date, days);
}

export function isToday(date: DateInput): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = getCurrentDubaiTime();
  return isSameDay(dateObj, today);
}

export function isPast(date: DateInput): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < getCurrentDubaiTime();
}

export function isFuture(date: DateInput): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj > getCurrentDubaiTime();
}

export function getRelativeTime(date: DateInput): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const nowDate = new Date();
  const diffInMs = dateObj.getTime() - nowDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffInMinutes) < 60) {
    if (diffInMinutes === 0) {
      return 'now';
    }
    return `${Math.abs(diffInMinutes)} minutes ${diffInMinutes > 0 ? 'from now' : 'ago'}`;
  }

  if (Math.abs(diffInHours) < 24) {
    return `${Math.abs(diffInHours)} hours ${diffInHours > 0 ? 'from now' : 'ago'}`;
  }

  if (Math.abs(diffInDays) < 7) {
    return `${Math.abs(diffInDays)} days ${diffInDays > 0 ? 'from now' : 'ago'}`;
  }

  return formatDubaiDate(dateObj);
}

export function formatEmailSubjectDate(date: Date): string {
  const localDate = toDubaiTime(date);
  const day = localDate.getDate();
  const month = localDate.toLocaleDateString('en-US', { month: 'short' });
  return `${day}, ${month}`;
}

export function getRelativeDayName(date: Date): string {
  const today = getTodayDubai();
  const tomorrow = addDays(today, 1);

  if (isSameDay(date, today)) {
    return 'Today';
  }

  if (isSameDay(date, tomorrow)) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: LEGACY_TIMEZONE,
  });
}
