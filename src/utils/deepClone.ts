/**
 * Deep clone utility for complex objects, especially JSONB fields
 * Handles nested objects, arrays, dates, and primitive values
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }

  // Handle Objects
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Deep clone appointment data for copying, excluding system-generated fields
 */
export function deepCloneAppointmentForCopy<T extends Record<string, any>>(
  sourceAppointment: T,
  overrides: Partial<T> = {},
): Omit<T, 'id' | 'created_at' | 'updated_at'> {
  const cloned = deepClone(sourceAppointment);

  // Remove system-generated fields
  delete cloned.id;
  delete cloned.created_at;
  delete cloned.updated_at;

  // Apply overrides
  return { ...cloned, ...overrides };
}
