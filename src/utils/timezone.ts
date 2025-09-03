import {
    addDays,
    addMinutes,
    endOfDay,
    endOfWeek,
    format,
    isSameDay,
    isValid,
    parseISO,
    startOfDay,
    startOfWeek,
    subDays,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

// Timezone constants
export const DUBAI_TIMEZONE = 'Asia/Dubai';
export const UTC_TIMEZONE = 'UTC';

// Legacy constants for backward compatibility
export const TZ = DUBAI_TIMEZONE;
export const UTC_TZ = UTC_TIMEZONE;

// Date format constants
export const DATE_FMT = 'dd/MM/yyyy';
export const TIME_FMT = 'HH:mm';
export const DATETIME_FMT = `${DATE_FMT} ${TIME_FMT}`;
export const ISO_DATE_FMT = 'yyyy-MM-dd';
export const ISO_TIME_FMT = 'HH:mm:ss';

// Daily agenda schedule
export const DAILY_AGENDA_TIME = '06:00'; // 06:00 Asia/Dubai time

/**
 * Convert a date to Dubai timezone
 */
export function toDubaiTime(date: Date): Date {
  return toZonedTime(date, DUBAI_TIMEZONE);
}

/**
 * Convert a Dubai time to UTC
 */
export function fromDubaiTime(date: Date): Date {
  return fromZonedTime(date, DUBAI_TIMEZONE);
}

/**
 * Get current time in Dubai timezone
 */
export function getCurrentDubaiTime(): Date {
  return toDubaiTime(new Date());
}

/**
 * Format date in Dubai timezone with DD/MM/YYYY format
 */
export function formatDubaiDate(date: Date): string {
  const dubaiDate = toDubaiTime(date);
  return format(dubaiDate, 'dd/MM/yyyy');
}

/**
 * Format time in Dubai timezone with HH:mm format
 */
export function formatDubaiTime(date: Date): string {
  const dubaiDate = toDubaiTime(date);
  return format(dubaiDate, 'HH:mm');
}

/**
 * Get today's date in Dubai timezone
 */
export function getTodayDubai(): Date {
  const now = getCurrentDubaiTime();
  return startOfDay(now);
}

/**
 * Get tomorrow's date in Dubai timezone
 */
export function getTomorrowDubai(): Date {
  const today = getTodayDubai();
  return addDays(today, 1);
}

/**
 * Get start and end of day in Dubai timezone for a given date
 */
export function getDubaiDayRange(date: Date): { start: Date; end: Date } {
  const dubaiDate = toDubaiTime(date);
  const start = startOfDay(dubaiDate);
  const end = endOfDay(dubaiDate);

  return {
    start: fromDubaiTime(start),
    end: fromDubaiTime(end),
  };
}

/**
 * Check if current Dubai time is past the daily agenda time (06:00)
 */
export function isPastDailyAgendaTime(): boolean {
  const now = getCurrentDubaiTime();
  const agendaTime = parseISO(`${format(now, 'yyyy-MM-dd')}T${DAILY_AGENDA_TIME}:00`);
  return now > agendaTime;
}

/**
 * Get next daily agenda time in Dubai timezone
 */
export function getNextDailyAgendaTime(): Date {
  const now = getCurrentDubaiTime();
  const today = startOfDay(now);
  const todayAgendaTime = parseISO(`${format(today, 'yyyy-MM-dd')}T${DAILY_AGENDA_TIME}:00`);

  // If it's past 06:00 today, schedule for tomorrow
  if (now > todayAgendaTime) {
    const tomorrow = addDays(today, 1);
    return fromDubaiTime(parseISO(`${format(tomorrow, 'yyyy-MM-dd')}T${DAILY_AGENDA_TIME}:00`));
  }

  // Otherwise, schedule for today
  return fromDubaiTime(todayAgendaTime);
}

/**
 * Get the date for which to generate daily agenda
 * If it's past 06:00, generate for today
 * If it's before 06:00, generate for yesterday
 */
export function getAgendaDate(): Date {
  const now = getCurrentDubaiTime();
  const today = startOfDay(now);
  const agendaTime = parseISO(`${format(today, 'yyyy-MM-dd')}T${DAILY_AGENDA_TIME}:00`);

  // If it's past 06:00, generate agenda for today
  if (now > agendaTime) {
    return today;
  }

  // If it's before 06:00, generate agenda for yesterday
  return addDays(today, -1);
}

/**
 * Convert UTC date to Dubai date string (YYYY-MM-DD)
 */
export function utcToDubaiDateString(utcDate: Date): string {
  const dubaiDate = toDubaiTime(utcDate);
  return format(dubaiDate, 'yyyy-MM-dd');
}

/**
 * Convert Dubai date string to UTC date range
 */
export function dubaiDateStringToUtcRange(dateString: string): { start: Date; end: Date } {
  const dubaiDate = parseISO(`${dateString}T00:00:00`);
  return getDubaiDayRange(dubaiDate);
}

/**
 * Get working hours for a staff member in Dubai timezone
 */
export function getStaffWorkingHours(
  workingHoursStart: string,
  workingHoursEnd: string,
  date: Date,
): { start: Date; end: Date } {
  const dubaiDate = toDubaiTime(date);
  const dateString = format(dubaiDate, 'yyyy-MM-dd');

  const startTime = parseISO(`${dateString}T${workingHoursStart}:00`);
  const endTime = parseISO(`${dateString}T${workingHoursEnd}:00`);

  return {
    start: fromDubaiTime(startTime),
    end: fromDubaiTime(endTime),
  };
}

/**
 * Check if a staff member is available on a specific day
 */
export function isStaffAvailableOnDay(
  availableDays: number[],
  date: Date,
): boolean {
  const dubaiDate = toDubaiTime(date);
  const dayOfWeek = dubaiDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Convert to 1-7 format (1 = Monday, 7 = Sunday)
  const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

  return availableDays.includes(dayNumber);
}

/**
 * Get all staff who should receive daily agenda for a given date
 * This includes staff who:
 * 1. Have email notifications enabled
 * 2. Are active
 * 3. Are available on the given day
 */
export function getStaffForDailyAgenda(
  staff: Array<{
    id: string;
    email: string;
    email_notifications_enabled: boolean;
    status: 'active' | 'inactive';
    available_days: number[];
  }>,
  date: Date,
): Array<{ id: string; email: string }> {
  return staff
    .filter(member =>
      member.email_notifications_enabled &&
      member.status === 'active' &&
      isStaffAvailableOnDay(member.available_days, date),
    )
    .map(member => ({
      id: member.id,
      email: member.email,
    }));
}

/**
 * Format appointment time for display in Dubai timezone
 */
export function formatAppointmentTime(
  appointmentDate: string,
  startTime: string,
  durationMinutes: number,
): { startTime: string; endTime: string } {
  const startDateTime = parseISO(`${appointmentDate}T${startTime}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  return {
    startTime: formatDubaiTime(startDateTime),
    endTime: formatDubaiTime(endDateTime),
  };
}

/**
 * Get timezone offset for Dubai
 */
export function getDubaiTimezoneOffset(): number {
  const now = new Date();
  const dubaiTime = toDubaiTime(now);
  const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));

  return (dubaiTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60); // Hours
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all available timezones (for future use)
 */
export function getAvailableTimezones(): string[] {
  return Intl.supportedValuesOf('timeZone');
}

/**
 * Check if Dubai timezone is supported
 */
export function isDubaiTimezoneSupported(): boolean {
  return isValidTimezone(DUBAI_TIMEZONE);
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS (from date.ts)
// ============================================================================

/**
 * Convert Asia/Dubai time to UTC for storage (legacy compatibility)
 * @deprecated Use fromDubaiTime instead
 */
export function toUTC(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  // JavaScript automatically converts timezone-aware dates to UTC
  // So if the input was Asia/Dubai time, it's already converted to UTC
  return dateObj;
}

/**
 * Convert UTC time to Asia/Dubai timezone for display (legacy compatibility)
 * @deprecated Use toDubaiTime instead
 */
export function toLocal(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toDubaiTime(dateObj);
}

/**
 * Format date in Asia/Dubai timezone for display (legacy compatibility)
 * @deprecated Use formatDubaiDate instead
 */
export function formatDateInTimezone(
  date: Date | string,
  formatStr: string = DATE_FMT,
  timezone: string = TZ,
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return 'Invalid date';
  }

  // Convert to Asia/Dubai timezone if needed
  const localDate = timezone === TZ ? toDubaiTime(dateObj) : dateObj;
  return format(localDate, formatStr);
}

/**
 * Get current date in Asia/Dubai timezone (legacy compatibility)
 * @deprecated Use getCurrentDubaiTime instead
 */
export function nowInTimezone(timezone: string = TZ): Date {
  if (timezone === TZ) {
    return getCurrentDubaiTime();
  }
  return new Date();
}

/**
 * Convert time string (HH:mm) to UTC Date object
 */
export function timeStringToUTC(timeString: string, date: Date = new Date()): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const localDate = new Date(date);
  localDate.setHours(hours, minutes, 0, 0);
  return fromDubaiTime(localDate);
}

/**
 * Convert UTC Date to time string (HH:mm) in Asia/Dubai timezone
 */
export function utcToTimeString(utcDate: Date | string): string {
  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  const localDate = toDubaiTime(dateObj);
  return format(localDate, TIME_FMT);
}

/**
 * Convert date string (yyyy-MM-dd) to UTC Date object
 */
export function dateStringToUTC(dateString: string, timeString: string = '00:00'): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return fromDubaiTime(localDate);
}

/**
 * Convert UTC Date to date string (yyyy-MM-dd) in Asia/Dubai timezone
 */
export function utcToDateString(utcDate: Date | string): string {
  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  const localDate = toDubaiTime(dateObj);
  return format(localDate, ISO_DATE_FMT);
}

/**
 * Get appointment start time in UTC
 */
export function getAppointmentStartTimeUTC(appointmentDate: string, startTime: string): Date {
  return dateStringToUTC(appointmentDate, startTime);
}

/**
 * Get appointment end time in UTC
 */
export function getAppointmentEndTimeUTC(appointmentDate: string, startTime: string, durationMinutes: number): Date {
  const startUTC = getAppointmentStartTimeUTC(appointmentDate, startTime);
  return addMinutes(startUTC, durationMinutes);
}

/**
 * Format appointment time range for display
 */
export function formatAppointmentTimeRange(
  appointmentDate: string,
  startTime: string,
  durationMinutes: number,
): string {
  const startUTC = getAppointmentStartTimeUTC(appointmentDate, startTime);
  const endUTC = getAppointmentEndTimeUTC(appointmentDate, startTime, durationMinutes);

  const startDisplay = format(toDubaiTime(startUTC), TIME_FMT);
  const endDisplay = format(toDubaiTime(endUTC), TIME_FMT);

  return `${startDisplay} - ${endDisplay}`;
}

/**
 * Check if two appointments overlap
 */
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

/**
 * Get working hours in Asia/Dubai timezone
 */
export function getWorkingHoursInTimezone(
  startTime: string,
  endTime: string,
  timezone: string = TZ,
): { start: Date; end: Date } {
  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  startDate.setHours(startHours, startMinutes, 0, 0);
  endDate.setHours(endHours, endMinutes, 0, 0);

  if (timezone === TZ) {
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

/**
 * Check if time is within working hours
 */
export function isWithinWorkingHours(
  time: string,
  startTime: string,
  endTime: string,
): boolean {
  const [timeHours, timeMinutes] = time.split(':').map(Number);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const timeMinutesTotal = timeHours * 60 + timeMinutes;
  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;

  return timeMinutesTotal >= startMinutesTotal && timeMinutesTotal <= endMinutesTotal;
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(): number {
  // Asia/Dubai is UTC+4, so offset is 240 minutes
  return 240;
}

/**
 * Format timezone-aware datetime for Google Calendar
 */
export function formatForGoogleCalendar(date: Date | string, time: string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const [hours, minutes] = time.split(':').map(Number);

  const localDate = new Date(dateObj);
  localDate.setHours(hours, minutes, 0, 0);

  // Format as ISO string with Asia/Dubai timezone offset
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hour = String(hours).padStart(2, '0');
  const minute = String(minutes).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:00+04:00`;
}

/**
 * Format date for display in Asia/Dubai timezone (legacy compatibility)
 * @deprecated Use formatDubaiDate instead
 */
export function formatDate(
  date: Date | string,
  formatStr: string = DATE_FMT,
): string {
  return formatDateInTimezone(date, formatStr, TZ);
}

/**
 * Format time for display in Asia/Dubai timezone (legacy compatibility)
 * @deprecated Use formatDubaiTime instead
 */
export function formatTime(
  date: Date | string,
  formatStr: string = TIME_FMT,
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return 'Invalid time';
  }

  const localDate = toDubaiTime(dateObj);
  return format(localDate, formatStr);
}

/**
 * Format datetime for display in Asia/Dubai timezone (legacy compatibility)
 * @deprecated Use formatDubaiDate and formatDubaiTime instead
 */
export function formatDateTime(
  date: Date | string,
  formatStr: string = DATETIME_FMT,
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return 'Invalid datetime';
  }

  const localDate = toDubaiTime(dateObj);
  return format(localDate, formatStr);
}

/**
 * Get current date in Asia/Dubai timezone (legacy compatibility)
 * @deprecated Use getCurrentDubaiTime instead
 */
export function now(): Date {
  return getCurrentDubaiTime();
}

/**
 * Get start of week (Monday) in Asia/Dubai timezone
 */
export function startOfWeekLocal(date: Date = getCurrentDubaiTime()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Get end of week (Sunday) in Asia/Dubai timezone
 */
export function endOfWeekLocal(date: Date = getCurrentDubaiTime()): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Add days to date in Asia/Dubai timezone
 */
export function addDaysLocal(date: Date, days: number): Date {
  return addDays(date, days);
}

/**
 * Subtract days from date in Asia/Dubai timezone
 */
export function subDaysLocal(date: Date, days: number): Date {
  return subDays(date, days);
}

/**
 * Check if date is today in Asia/Dubai timezone
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = getCurrentDubaiTime();

  return isSameDay(dateObj, today);
}

/**
 * Check if date is in the past in Asia/Dubai timezone
 */
export function isPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < getCurrentDubaiTime();
}

/**
 * Check if date is in the future in Asia/Dubai timezone
 */
export function isFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj > getCurrentDubaiTime();
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffInMs = dateObj.getTime() - now.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffInMinutes) < 60) {
    return diffInMinutes === 0
      ? 'now'
      : `${Math.abs(diffInMinutes)} minutes ${diffInMinutes > 0 ? 'from now' : 'ago'}`;
  }

  if (Math.abs(diffInHours) < 24) {
    return `${Math.abs(diffInHours)} hours ${diffInHours > 0 ? 'from now' : 'ago'}`;
  }

  if (Math.abs(diffInDays) < 7) {
    return `${Math.abs(diffInDays)} days ${diffInDays > 0 ? 'from now' : 'ago'}`;
  }

  return formatDubaiDate(dateObj);
}
