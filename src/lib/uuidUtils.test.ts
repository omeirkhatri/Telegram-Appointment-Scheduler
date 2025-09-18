import { generateSimpleUuid } from './uuidUtils';

describe('UUID Utils', () => {
  describe('generateSimpleUuid', () => {
    it('should generate a valid UUID', () => {
      const result = generateSimpleUuid();
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateSimpleUuid();
      const uuid2 = generateSimpleUuid();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs compatible with PostgreSQL', () => {
      const result = generateSimpleUuid();
      // PostgreSQL UUID format validation
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});
