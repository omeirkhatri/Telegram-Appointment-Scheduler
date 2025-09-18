/**
 * Unit tests for TelegramValidationService
 * Tests input validation, rate limiting, and error handling
 */

import { telegramValidationService } from './telegramValidation';

describe('TelegramValidationService', () => {
  beforeEach(() => {
    // Clear usage data before each test
    (telegramValidationService as any).commandUsage.clear();
  });

  describe('validateTelegramUserId', () => {
    it('should validate valid user ID', () => {
      const result = telegramValidationService.validateTelegramUserId('1655850641');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-numeric user ID', () => {
      const result = telegramValidationService.validateTelegramUserId('invalid-id');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid user ID format');
    });

    it('should reject empty user ID', () => {
      const result = telegramValidationService.validateTelegramUserId('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid user ID format');
    });

    it('should reject null user ID', () => {
      const result = telegramValidationService.validateTelegramUserId(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid user ID format');
    });
  });

  describe('validateCommand', () => {
    it('should validate valid commands', () => {
      const validCommands = ['/start', '/help', '/info', '/status', '/today', '/tomorrow', '/week'];

      validCommands.forEach(command => {
        const result = telegramValidationService.validateCommand(command);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid commands', () => {
      const invalidCommands = ['invalid', 'start'];

      invalidCommands.forEach(command => {
        const result = telegramValidationService.validateCommand(command as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Command must start with /');
      });
    });

    it('should reject null/undefined/empty commands', () => {
      const invalidCommands = ['', null, undefined];

      invalidCommands.forEach(command => {
        const result = telegramValidationService.validateCommand(command as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid command format');
      });
    });

    it('should reject commands with invalid characters', () => {
      const invalidCommands = ['/invalid-command', '/command with spaces', '/command@special'];

      invalidCommands.forEach(command => {
        const result = telegramValidationService.validateCommand(command);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Command contains invalid characters');
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should allow commands within rate limit', () => {
      const userId = '1655850641';

      // Add some commands within the limit
      for (let i = 0; i < 5; i++) {
        telegramValidationService.recordCommandUsage(userId, '/help', true);
        const result = telegramValidationService.checkRateLimit(userId);
        expect(result.isValid).toBe(true);
      }
    });

    it('should block commands when rate limit exceeded', () => {
      const userId = '1655850641';

      // Add commands to exceed the rate limit
      for (let i = 0; i < 15; i++) {
        telegramValidationService.recordCommandUsage(userId, '/help', true);
      }

      const result = telegramValidationService.checkRateLimit(userId);
      expect(result.isValid).toBe(false);
    });
  });

  describe('checkCommandCooldown', () => {
    it('should allow different commands immediately', () => {
      const userId = '1655850641';

      const result1 = telegramValidationService.checkCommandCooldown(userId, '/help');
      expect(result1.isValid).toBe(true);

      const result2 = telegramValidationService.checkCommandCooldown(userId, '/status');
      expect(result2.isValid).toBe(true);
    });

    it('should block same command during cooldown', () => {
      const userId = '1655850641';
      const command = '/help';

      // Record the first command usage
      telegramValidationService.recordCommandUsage(userId, command, true);

      // First check should fail because command was just used
      const result1 = telegramValidationService.checkCommandCooldown(userId, command);
      expect(result1.isValid).toBe(false);

      // Second check should also fail
      const result2 = telegramValidationService.checkCommandCooldown(userId, command);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return correct error messages for known codes', () => {
      expect(telegramValidationService.getErrorMessage('INVALID_USER_ID')).toContain('Invalid user ID format');
      expect(telegramValidationService.getErrorMessage('INVALID_COMMAND')).toContain('Invalid command format');
      expect(telegramValidationService.getErrorMessage('RATE_LIMIT_EXCEEDED')).toContain('Rate limit exceeded');
      expect(telegramValidationService.getErrorMessage('COMMAND_COOLDOWN')).toContain('Please wait before using this command again');
    });

    it('should return default message for unknown codes', () => {
      expect(telegramValidationService.getErrorMessage('UNKNOWN_ERROR')).toBe('An unknown error occurred');
    });
  });
});
