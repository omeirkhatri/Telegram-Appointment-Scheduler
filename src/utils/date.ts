import { format, parseISO, isValid, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { config } from '@/lib/env'

// Timezone configuration
export const TZ = config.app.timezone
export const DATE_FMT = 'dd/MM/yyyy'
export const TIME_FMT = 'HH:mm'
export const DATETIME_FMT = `${DATE_FMT} ${TIME_FMT}`

/**
 * Convert local time to UTC for storage
 */
export function toUTC(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(dateObj, TZ)
}

/**
 * Convert UTC time to local timezone for display
 */
export function toLocal(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return fromZonedTime(dateObj, TZ)
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatStr: string = DATE_FMT): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (!isValid(dateObj)) {
    return 'Invalid date'
  }
  
  return format(toLocal(dateObj), formatStr)
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string, formatStr: string = TIME_FMT): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (!isValid(dateObj)) {
    return 'Invalid time'
  }
  
  return format(toLocal(dateObj), formatStr)
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: Date | string, formatStr: string = DATETIME_FMT): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (!isValid(dateObj)) {
    return 'Invalid datetime'
  }
  
  return format(toLocal(dateObj), formatStr)
}

/**
 * Get current date in local timezone
 */
export function now(): Date {
  return toLocal(new Date())
}

/**
 * Get start of week (Monday)
 */
export function startOfWeekLocal(date: Date = now()): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/**
 * Get end of week (Sunday)
 */
export function endOfWeekLocal(date: Date = now()): Date {
  return endOfWeek(date, { weekStartsOn: 1 })
}

/**
 * Add days to date
 */
export function addDaysLocal(date: Date, days: number): Date {
  return addDays(date, days)
}

/**
 * Subtract days from date
 */
export function subDaysLocal(date: Date, days: number): Date {
  return subDays(date, days)
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const today = now()
  
  return format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return dateObj < now()
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return dateObj > now()
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const now = new Date()
  const diffInMs = dateObj.getTime() - now.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (Math.abs(diffInMinutes) < 60) {
    return diffInMinutes === 0 ? 'now' : `${Math.abs(diffInMinutes)} minutes ${diffInMinutes > 0 ? 'from now' : 'ago'}`
  }
  
  if (Math.abs(diffInHours) < 24) {
    return `${Math.abs(diffInHours)} hours ${diffInHours > 0 ? 'from now' : 'ago'}`
  }
  
  if (Math.abs(diffInDays) < 7) {
    return `${Math.abs(diffInDays)} days ${diffInDays > 0 ? 'from now' : 'ago'}`
  }
  
  return formatDate(dateObj)
}
