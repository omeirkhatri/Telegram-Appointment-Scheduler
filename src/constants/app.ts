// Application constants
export const APP_NAME = 'MediCare Scheduler';
export const APP_VERSION = '1.0.0';
export const COMPANY_NAME = 'Best DOC';

// Re-export timezone constants from consolidated timezone utilities
export {
    DATETIME_FMT, DATE_FMT, DUBAI_TIMEZONE, ISO_DATE_FMT,
    ISO_TIME_FMT, TIME_FMT, TZ, UTC_TIMEZONE, UTC_TZ
} from '@/utils/timezone';

// API constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Pagination constants
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Validation constants
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;

// UI constants
export const TOAST_DURATION = 5000; // 5 seconds
export const DEBOUNCE_DELAY = 300; // 300ms

// Cache constants
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const CACHE_MAX_SIZE = 50; // Maximum cache entries
export const SEARCH_DEBOUNCE_DELAY = 300; // Search debounce delay
export const FILTER_DEBOUNCE_DELAY = 200; // Filter debounce delay
