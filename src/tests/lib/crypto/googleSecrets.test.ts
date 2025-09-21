import {
  encryptGoogleSecret,
  decryptGoogleSecret,
  validateEncryptionKey,
  testEncryption
} from '@/lib/crypto/googleSecrets';

// Mock the environment configuration
jest.mock('@/lib/env', () => ({
  config: {
    googleCalendar: {
      encryptionKey: 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy1sb25n' // 32-byte base64 encoded key
    }
  }
}));

describe('Google Secrets Encryption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('encryptGoogleSecret', () => {
    it('should encrypt a string successfully', () => {
      const plaintext = 'test-oauth-token-123';
      const encrypted = encryptGoogleSecret(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(plaintext.length);
    });

    it('should produce different encrypted values for the same input', () => {
      const plaintext = 'test-oauth-token-123';
      const encrypted1 = encryptGoogleSecret(plaintext);
      const encrypted2 = encryptGoogleSecret(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encryptGoogleSecret(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle special characters', () => {
      const plaintext = 'test-token-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptGoogleSecret(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle unicode characters', () => {
      const plaintext = 'test-token-with-unicode-🚀-emoji';
      const encrypted = encryptGoogleSecret(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should throw error when encryption key is not configured', () => {
      // Mock missing encryption key
      jest.doMock('@/lib/env', () => ({
        config: {
          googleCalendar: {
            encryptionKey: undefined
          }
        }
      }));

      expect(() => {
        encryptGoogleSecret('test-token');
      }).toThrow('Google Calendar encryption key not configured');
    });
  });

  describe('decryptGoogleSecret', () => {
    it('should decrypt an encrypted string successfully', () => {
      const plaintext = 'test-oauth-token-123';
      const encrypted = encryptGoogleSecret(plaintext);
      const decrypted = decryptGoogleSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt different encrypted values to the same plaintext', () => {
      const plaintext = 'test-oauth-token-123';
      const encrypted1 = encryptGoogleSecret(plaintext);
      const encrypted2 = encryptGoogleSecret(plaintext);
      
      const decrypted1 = decryptGoogleSecret(encrypted1);
      const decrypted2 = decryptGoogleSecret(encrypted2);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should handle empty string encryption/decryption', () => {
      const plaintext = '';
      const encrypted = encryptGoogleSecret(plaintext);
      const decrypted = decryptGoogleSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters encryption/decryption', () => {
      const plaintext = 'test-token-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptGoogleSecret(plaintext);
      const decrypted = decryptGoogleSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters encryption/decryption', () => {
      const plaintext = 'test-token-with-unicode-🚀-emoji';
      const encrypted = encryptGoogleSecret(plaintext);
      const decrypted = decryptGoogleSecret(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        decryptGoogleSecret('invalid-encrypted-data');
      }).toThrow('Failed to decrypt Google secret');
    });

    it('should throw error for malformed encrypted data', () => {
      const invalidData = Buffer.from('invalid-json').toString('base64');
      
      expect(() => {
        decryptGoogleSecret(invalidData);
      }).toThrow('Failed to decrypt Google secret');
    });

    it('should throw error when encryption key is not configured', () => {
      // Mock missing encryption key
      jest.doMock('@/lib/env', () => ({
        config: {
          googleCalendar: {
            encryptionKey: undefined
          }
        }
      }));

      expect(() => {
        decryptGoogleSecret('some-encrypted-data');
      }).toThrow('Google Calendar encryption key not configured');
    });
  });

  describe('validateEncryptionKey', () => {
    it('should return true for valid encryption key', () => {
      const isValid = validateEncryptionKey();
      expect(isValid).toBe(true);
    });

    it('should return false for invalid encryption key', () => {
      // Mock invalid encryption key
      jest.doMock('@/lib/env', () => ({
        config: {
          googleCalendar: {
            encryptionKey: 'invalid-key'
          }
        }
      }));

      const isValid = validateEncryptionKey();
      expect(isValid).toBe(false);
    });

    it('should return false for missing encryption key', () => {
      // Mock missing encryption key
      jest.doMock('@/lib/env', () => ({
        config: {
          googleCalendar: {
            encryptionKey: undefined
          }
        }
      }));

      const isValid = validateEncryptionKey();
      expect(isValid).toBe(false);
    });
  });

  describe('testEncryption', () => {
    it('should return true for successful encryption/decryption test', () => {
      const testResult = testEncryption();
      expect(testResult).toBe(true);
    });

    it('should return true for custom test data', () => {
      const customTestData = 'custom-test-token-456';
      const testResult = testEncryption(customTestData);
      expect(testResult).toBe(true);
    });

    it('should return false when encryption fails', () => {
      // Mock missing encryption key to cause failure
      jest.doMock('@/lib/env', () => ({
        config: {
          googleCalendar: {
            encryptionKey: undefined
          }
        }
      }));

      const testResult = testEncryption();
      expect(testResult).toBe(false);
    });
  });

  describe('Encryption/Decryption Round Trip', () => {
    const testCases = [
      'simple-token',
      'token-with-dashes-and-numbers-123',
      'token_with_underscores_and_numbers_456',
      'token.with.dots.and.numbers.789',
      'token with spaces and numbers 101112',
      'token-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?',
      'token-with-unicode-🚀-emoji-and-ñ-characters',
      'very-long-token-with-many-characters-that-should-still-work-properly-even-when-it-is-very-long-and-contains-many-different-types-of-characters',
      '', // Empty string
      'a', // Single character
      '1234567890', // Numbers only
      '!@#$%^&*()', // Special characters only
    ];

    testCases.forEach((testCase, index) => {
      it(`should handle test case ${index + 1}: "${testCase}"`, () => {
        const encrypted = encryptGoogleSecret(testCase);
        const decrypted = decryptGoogleSecret(encrypted);
        
        expect(decrypted).toBe(testCase);
      });
    });
  });
});
