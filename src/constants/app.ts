// Application constants
export const APP_NAME = 'MediCare Scheduler';
export const APP_VERSION = '1.0.0';
export const COMPANY_NAME = 'Best DOC';

// Timezone and date constants
export const TZ = 'Asia/Dubai';
export const DATE_FMT = 'dd/MM/yyyy';
export const TIME_FMT = 'HH:mm';
export const DATETIME_FMT = 'dd/MM/yyyy HH:mm';

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
