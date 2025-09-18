/**
 * Unit tests for TelegramValidationService
 * Tests input validation, rate limiting, and error handling
 */

import { TelegramValidationService } from '../telegramValidation';

describe('TelegramValidationService', () => {
  beforeEach(() => {
    // Clear usage data before each test
    (TelegramValidationService as any).commandUsage.clear();
  });

  describe('validateWebhookUpdate', () => {
    it('should validate valid webhook update', () => {
      const validUpdate = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: {
            id: 1655850641,
            is_bot: false,
            first_name: 'Omeir',
            last_name: 'K',
            username: 'o_kha3',
            language_code: 'en'
          },
          chat: {
            id: 1655850641,
            first_name: 'Omeir',
            last_name: 'K',
            username: 'o_kha3',
            type: 'private'
          },
          date: 1758232248,
          text: '/help'
        }
      };

      const result = TelegramValidationService.validateWebhookUpdate(validUpdate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject update without update_id', () => {
      const invalidUpdate = {
        message: {
          message_id: 1,
          from: { id: 1655850641, first_name: 'Omeir' },
          chat: { id: 1655850641, type: 'private' },
          date: 1758232248,
          text: '/help'
        }
      };

      const result = TelegramValidationService.validateWebhookUpdate(invalidUpdate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('update_id');
    });

    it('should reject update without message', () => {
      const invalidUpdate = {
        update_id: 123456789
      };

      const result = TelegramValidationService.validateWebhookUpdate(invalidUpdate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('message');
    });

    it('should reject update with invalid message structure', () => {
      const invalidUpdate = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 1655850641 },
          chat: { id: 1655850641 },
          date: 1758232248
          // missing text field
        }
      };

      const result = TelegramValidationService.validateWebhookUpdate(invalidUpdate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('text');
    });
  });

  describe('validateMessage', () => {
    it('should validate valid message', () => {
      const validMessage = {
        message_id: 1,
        from: {
          id: 1655850641,
          is_bot: false,
          first_name: 'Omeir',
          last_name: 'K',
          username: 'o_kha3',
          language_code: 'en'
        },
        chat: {
          id: 1655850641,
          first_name: 'Omeir',
          last_name: 'K',
          username: 'o_kha3',
          type: 'private'
        },
        date: 1758232248,
        text: '/help'
      };

      const result = TelegramValidationService.validateMessage(validMessage);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject message without from field', () => {
      const invalidMessage = {
        message_id: 1,
        chat: { id: 1655850641, type: 'private' },
        date: 1758232248,
        text: '/help'
      };

      const result = TelegramValidationService.validateMessage(invalidMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('from');
    });

    it('should reject message without chat field', () => {
      const invalidMessage = {
        message_id: 1,
        from: { id: 1655850641, first_name: 'Omeir' },
        date: 1758232248,
        text: '/help'
      };

      const result = TelegramValidationService.validateMessage(invalidMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('chat');
    });

    it('should reject message without text field', () => {
      const invalidMessage = {
        message_id: 1,
        from: { id: 1655850641, first_name: 'Omeir' },
        chat: { id: 1655850641, type: 'private' },
        date: 1758232248
      };

      const result = TelegramValidationService.validateMessage(invalidMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('text');
    });
  });

  describe('validateUserId', () => {
    it('should validate valid user ID', () => {
      const result = TelegramValidationService.validateUserId('1655850641');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-numeric user ID', () => {
      const result = TelegramValidationService.validateUserId('invalid-id');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('numeric');
    });

    it('should reject empty user ID', () => {
      const result = TelegramValidationService.validateUserId('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject null user ID', () => {
      const result = TelegramValidationService.validateUserId(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('validateCommand', () => {
    it('should validate valid commands', () => {
      const validCommands = ['/start', '/help', '/info', '/status', '/today', '/tomorrow', '/week'];

      validCommands.forEach(command => {
        const result = TelegramValidationService.validateCommand(command);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid commands', () => {
      const invalidCommands = ['invalid', 'start', '/invalid', '', null, undefined];

      invalidCommands.forEach(command => {
        const result = TelegramValidationService.validateCommand(command as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('valid command');
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should allow commands within rate limit', () => {
      const userId = '1655850641';

      // Add some commands within the limit
      for (let i = 0; i < 5; i++) {
        const result = TelegramValidationService.checkRateLimit(userId, '/help');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeGreaterThan(0);
      }
    });

    it('should block commands when rate limit exceeded', () => {
      const userId = '1655850641';

      // Add commands to exceed the rate limit
      for (let i = 0; i < 15; i++) {
        TelegramValidationService.checkRateLimit(userId, '/help');
      }

      const result = TelegramValidationService.checkRateLimit(userId, '/help');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset rate limit after window expires', (done) => {
      const userId = '1655850641';

      // Exceed rate limit
      for (let i = 0; i < 15; i++) {
        TelegramValidationService.checkRateLimit(userId, '/help');
      }

      // Should be blocked
      let result = TelegramValidationService.checkRateLimit(userId, '/help');
      expect(result.allowed).toBe(false);

      // Wait for rate limit window to expire (in test, we'll mock this)
      setTimeout(() => {
        // Clean up old data
        (TelegramValidationService as any).cleanupOldData();

        result = TelegramValidationService.checkRateLimit(userId, '/help');
        expect(result.allowed).toBe(true);
        done();
      }, 100);
    });
  });

  describe('checkCooldown', () => {
    it('should allow different commands immediately', () => {
      const userId = '1655850641';

      const result1 = TelegramValidationService.checkCooldown(userId, '/help');
      expect(result1.allowed).toBe(true);

      const result2 = TelegramValidationService.checkCooldown(userId, '/status');
      expect(result2.allowed).toBe(true);
    });

    it('should block same command during cooldown', () => {
      const userId = '1655850641';
      const command = '/help';

      const result1 = TelegramValidationService.checkCooldown(userId, command);
      expect(result1.allowed).toBe(true);

      const result2 = TelegramValidationService.checkCooldown(userId, command);
      expect(result2.allowed).toBe(false);
      expect(result2.remaining).toBeGreaterThan(0);
    });

    it('should allow same command after cooldown expires', (done) => {
      const userId = '1655850641';
      const command = '/help';

      const result1 = TelegramValidationService.checkCooldown(userId, command);
      expect(result1.allowed).toBe(true);

      // Wait for cooldown to expire
      setTimeout(() => {
        const result2 = TelegramValidationService.checkCooldown(userId, command);
        expect(result2.allowed).toBe(true);
        done();
      }, 100);
    });
  });

  describe('getErrorMessage', () => {
    it('should return correct error messages for known codes', () => {
      expect(TelegramValidationService.getErrorMessage('INVALID_USER_ID')).toContain('Invalid user ID');
      expect(TelegramValidationService.getErrorMessage('INVALID_COMMAND')).toContain('Invalid command');
      expect(TelegramValidationService.getErrorMessage('RATE_LIMITED')).toContain('Rate limited');
      expect(TelegramValidationService.getErrorMessage('COMMAND_COOLDOWN')).toContain('Command cooldown');
    });

    it('should return default message for unknown codes', () => {
      expect(TelegramValidationService.getErrorMessage('UNKNOWN_ERROR')).toBe('An error occurred');
    });
  });

  describe('cleanupOldData', () => {
    it('should clean up old usage data', () => {
      const userId = '1655850641';

      // Add some old data
      const oldTime = new Date(Date.now() - 2000); // 2 seconds ago
      (TelegramValidationService as any).commandUsage.set(userId, [
        { command: '/help', timestamp: oldTime }
      ]);

      // Add some recent data
      const recentTime = new Date();
      (TelegramValidationService as any).commandUsage.set('user2', [
        { command: '/help', timestamp: recentTime }
      ]);

      // Clean up old data
      TelegramValidationService.cleanupOldData();

      // Old data should be removed
      expect((TelegramValidationService as any).commandUsage.has(userId)).toBe(false);

      // Recent data should remain
      expect((TelegramValidationService as any).commandUsage.has('user2')).toBe(true);
    });
  });
});
