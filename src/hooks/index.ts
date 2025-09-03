// Custom hooks for data management
export { useAppointments } from './useAppointments';
export { usePatients } from './usePatients';
export { useStaff } from './useStaff';

// Error handling and loading state hooks
export { useErrorHandler } from './useErrorHandler';
export { useLoadingState } from './useLoadingState';

// Utility hooks
export { useDebounce, useDebounceLegacy } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';

// Performance and caching hooks
export { useFilterCache, useSearchFilterCache } from './useFilterCache';

// Keyboard shortcuts hooks
export {
    createAppointmentShortcuts, createGlobalShortcuts, createPatientShortcuts,
    createStaffShortcuts, useKeyboardShortcuts
} from './useKeyboardShortcuts';
