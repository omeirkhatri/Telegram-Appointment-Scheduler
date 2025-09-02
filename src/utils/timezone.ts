import { addDays, endOfDay, format, parseISO, startOfDay } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// Timezone constants
export const DUBAI_TIMEZONE = 'Asia/Dubai';
export const UTC_TIMEZONE = 'UTC';

// Daily agenda schedule
export const DAILY_AGENDA_TIME = '06:00'; // 06:00 Asia/Dubai time

/**
 * Convert a date to Dubai timezone
 */
export function toDubaiTime(date: Date): Date {
  return utcToZonedTime(date, DUBAI_TIMEZONE);
}

/**
 * Convert a Dubai time to UTC
 */
export function fromDubaiTime(date: Date): Date {
  return zonedTimeToUtc(date, DUBAI_TIMEZONE);
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
    end: fromDubaiTime(end)
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
  date: Date
): { start: Date; end: Date } {
  const dubaiDate = toDubaiTime(date);
  const dateString = format(dubaiDate, 'yyyy-MM-dd');

  const startTime = parseISO(`${dateString}T${workingHoursStart}:00`);
  const endTime = parseISO(`${dateString}T${workingHoursEnd}:00`);

  return {
    start: fromDubaiTime(startTime),
    end: fromDubaiTime(endTime)
  };
}

/**
 * Check if a staff member is available on a specific day
 */
export function isStaffAvailableOnDay(
  availableDays: number[],
  date: Date
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
  date: Date
): Array<{ id: string; email: string }> {
  return staff
    .filter(member =>
      member.email_notifications_enabled &&
      member.status === 'active' &&
      isStaffAvailableOnDay(member.available_days, date)
    )
    .map(member => ({
      id: member.id,
      email: member.email
    }));
}

/**
 * Format appointment time for display in Dubai timezone
 */
export function formatAppointmentTime(
  appointmentDate: string,
  startTime: string,
  durationMinutes: number
): { startTime: string; endTime: string } {
  const startDateTime = parseISO(`${appointmentDate}T${startTime}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  return {
    startTime: formatDubaiTime(startDateTime),
    endTime: formatDubaiTime(endDateTime)
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
