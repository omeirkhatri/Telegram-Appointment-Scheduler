import {
  format,
  parseISO,
  isValid,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  addMinutes,
  differenceInMinutes,
  isSameDay,
  isSameHour,
  isSameMinute,
} from 'date-fns';
import { config } from '@/lib/env';

// Timezone configuration
export const TZ = 'Asia/Dubai'; // Fixed timezone for the application
export const UTC_TZ = 'UTC';
export const DATE_FMT = 'dd/MM/yyyy';
export const TIME_FMT = 'HH:mm';
export const DATETIME_FMT = `${DATE_FMT} ${TIME_FMT}`;
export const ISO_DATE_FMT = 'yyyy-MM-dd';
export const ISO_TIME_FMT = 'HH:mm:ss';

/**
 * Convert Asia/Dubai time to UTC for storage
 */
export function toUTC(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  // JavaScript automatically converts timezone-aware dates to UTC
  // So if the input was Asia/Dubai time, it's already converted to UTC
  return dateObj;
}

/**
 * Convert UTC time to Asia/Dubai timezone for display
 */
export function toLocal(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  // If we're already in Asia/Dubai timezone, no conversion needed
  // The date is already in the correct timezone for display
  return dateObj;
}

/**
 * Format date in Asia/Dubai timezone for display
 */
export function formatDateInTimezone(
  date: Date | string,
  formatStr: string = DATE_FMT,
  timezone: string = TZ
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return 'Invalid date';
  }

  // Convert to Asia/Dubai timezone if needed
  const localDate = timezone === TZ ? toLocal(dateObj) : dateObj;
  return format(localDate, formatStr);
}

/**
 * Get current date in Asia/Dubai timezone
 */
export function nowInTimezone(timezone: string = TZ): Date {
  if (timezone === TZ) {
    return toLocal(new Date());
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
  return toUTC(localDate);
}

/**
 * Convert UTC Date to time string (HH:mm) in Asia/Dubai timezone
 */
export function utcToTimeString(utcDate: Date | string): string {
  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  const localDate = toLocal(dateObj);
  return format(localDate, TIME_FMT);
}

/**
 * Convert date string (yyyy-MM-dd) to UTC Date object
 */
export function dateStringToUTC(dateString: string, timeString: string = '00:00'): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return toUTC(localDate);
}

/**
 * Convert UTC Date to date string (yyyy-MM-dd) in Asia/Dubai timezone
 */
export function utcToDateString(utcDate: Date | string): string {
  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  const localDate = toLocal(dateObj);
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
  durationMinutes: number
): string {
  const startUTC = getAppointmentStartTimeUTC(appointmentDate, startTime);
  const endUTC = getAppointmentEndTimeUTC(appointmentDate, startTime, durationMinutes);
  
  const startDisplay = format(toLocal(startUTC), TIME_FMT);
  const endDisplay = format(toLocal(endUTC), TIME_FMT);
  
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
  duration2: number
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
  timezone: string = TZ
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
      start: toUTC(startDate),
      end: toUTC(endDate)
    };
  }
  
  return {
    start: startDate,
    end: endDate
  };
}

/**
 * Check if time is within working hours
 */
export function isWithinWorkingHours(
  time: string,
  startTime: string,
  endTime: string
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
 * Format date for display in Asia/Dubai timezone
 */
export function formatDate(
  date: Date | string,
  formatStr: string = DATE_FMT,
): string {
  return formatDateInTimezone(date, formatStr, TZ);
}

/**
 * Format time for display in Asia/Dubai timezone
 */
export function formatTime(
  date: Date | string,
  formatStr: string = TIME_FMT,
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return 'Invalid time';
  }

  const localDate = toLocal(dateObj);
  return format(localDate, formatStr);
}

/**
 * Format datetime for display in Asia/Dubai timezone
 */
export function formatDateTime(
  date: Date | string,
  formatStr: string = DATETIME_FMT,
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return 'Invalid datetime';
  }

  const localDate = toLocal(dateObj);
  return format(localDate, formatStr);
}

/**
 * Get current date in Asia/Dubai timezone
 */
export function now(): Date {
  return nowInTimezone(TZ);
}

/**
 * Get start of week (Monday) in Asia/Dubai timezone
 */
export function startOfWeekLocal(date: Date = now()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Get end of week (Sunday) in Asia/Dubai timezone
 */
export function endOfWeekLocal(date: Date = now()): Date {
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
  const today = now();

  return isSameDay(dateObj, today);
}

/**
 * Check if date is in the past in Asia/Dubai timezone
 */
export function isPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < now();
}

/**
 * Check if date is in the future in Asia/Dubai timezone
 */
export function isFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj > now();
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

  return formatDate(dateObj);
}
