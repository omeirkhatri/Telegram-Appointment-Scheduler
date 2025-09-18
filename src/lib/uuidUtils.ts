import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a simple UUID for appointments
 * This creates a standard UUID format that's compatible with PostgreSQL
 */
export function generateSimpleUuid(): string {
  return uuidv4();
}
