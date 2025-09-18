/**
 * Telegram command validation and error handling utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
}

export interface CommandUsage {
  userId: string;
  command: string;
  timestamp: Date;
  success: boolean;
  errorCode?: string;
}

export class TelegramValidationService {
  private static commandUsage: Map<string, CommandUsage[]> = new Map();
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly RATE_LIMIT_MAX_COMMANDS = 10; // Max 10 commands per minute
  private static readonly COMMAND_COOLDOWN = 5 * 1000; // 5 seconds between same command

  /**
   * Validate Telegram user ID format
   */
  static validateTelegramUserId(userId: string): ValidationResult {
    if (!userId || typeof userId !== 'string') {
      return {
        isValid: false,
        error: 'Invalid user ID format',
        errorCode: 'INVALID_USER_ID'
      };
    }

    // Telegram user IDs are typically numeric strings
    if (!/^\d+$/.test(userId)) {
      return {
        isValid: false,
        error: 'Invalid user ID format',
        errorCode: 'INVALID_USER_ID'
      };
    }

    // Check if user ID is within reasonable range
    const numericId = parseInt(userId, 10);
    if (numericId < 1 || numericId > 999999999999) {
      return {
        isValid: false,
        error: 'User ID out of valid range',
        errorCode: 'INVALID_USER_ID'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate command format
   */
  static validateCommand(command: string): ValidationResult {
    if (!command || typeof command !== 'string') {
      return {
        isValid: false,
        error: 'Invalid command format',
        errorCode: 'INVALID_COMMAND'
      };
    }

    // Check if command starts with /
    if (!command.startsWith('/')) {
      return {
        isValid: false,
        error: 'Command must start with /',
        errorCode: 'INVALID_COMMAND'
      };
    }

    // Check if command is too long
    if (command.length > 50) {
      return {
        isValid: false,
        error: 'Command too long',
        errorCode: 'INVALID_COMMAND'
      };
    }

    // Check for valid command characters
    if (!/^\/[a-zA-Z0-9_]+$/.test(command)) {
      return {
        isValid: false,
        error: 'Command contains invalid characters',
        errorCode: 'INVALID_COMMAND'
      };
    }

    return { isValid: true };
  }

  /**
   * Check rate limiting for user
   */
  static checkRateLimit(userId: string): ValidationResult {
    const now = new Date();
    const userCommands = this.commandUsage.get(userId) || [];

    // Remove old commands outside the rate limit window
    const recentCommands = userCommands.filter(
      cmd => now.getTime() - cmd.timestamp.getTime() < this.RATE_LIMIT_WINDOW
    );

    // Check if user has exceeded rate limit
    if (recentCommands.length >= this.RATE_LIMIT_MAX_COMMANDS) {
      return {
        isValid: false,
        error: 'Rate limit exceeded. Please wait before sending more commands.',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      };
    }

    return { isValid: true };
  }

  /**
   * Check command cooldown
   */
  static checkCommandCooldown(userId: string, command: string): ValidationResult {
    const now = new Date();
    const userCommands = this.commandUsage.get(userId) || [];

    // Find the last time this specific command was used
    const lastCommand = userCommands
      .filter(cmd => cmd.command === command)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (lastCommand) {
      const timeSinceLastCommand = now.getTime() - lastCommand.timestamp.getTime();
      if (timeSinceLastCommand < this.COMMAND_COOLDOWN) {
        const remainingTime = Math.ceil((this.COMMAND_COOLDOWN - timeSinceLastCommand) / 1000);
        return {
          isValid: false,
          error: `Please wait ${remainingTime} seconds before using this command again.`,
          errorCode: 'COMMAND_COOLDOWN'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Record command usage
   */
  static recordCommandUsage(userId: string, command: string, success: boolean, errorCode?: string): void {
    const now = new Date();
    const userCommands = this.commandUsage.get(userId) || [];

    userCommands.push({
      userId,
      command,
      timestamp: now,
      success,
      errorCode
    });

    // Keep only recent commands to prevent memory leaks
    const recentCommands = userCommands.filter(
      cmd => now.getTime() - cmd.timestamp.getTime() < this.RATE_LIMIT_WINDOW * 2
    );

    this.commandUsage.set(userId, recentCommands);
  }

  /**
   * Get user command statistics
   */
  static getUserStats(userId: string): {
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
    lastCommand?: Date;
    rateLimitRemaining: number;
  } {
    const now = new Date();
    const userCommands = this.commandUsage.get(userId) || [];
    const recentCommands = userCommands.filter(
      cmd => now.getTime() - cmd.timestamp.getTime() < this.RATE_LIMIT_WINDOW
    );

    const successfulCommands = userCommands.filter(cmd => cmd.success).length;
    const failedCommands = userCommands.filter(cmd => !cmd.success).length;
    const lastCommand = userCommands.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp;

    return {
      totalCommands: userCommands.length,
      successfulCommands,
      failedCommands,
      lastCommand,
      rateLimitRemaining: Math.max(0, this.RATE_LIMIT_MAX_COMMANDS - recentCommands.length)
    };
  }

  /**
   * Clear old usage data (call this periodically)
   */
  static cleanupOldData(): void {
    const now = new Date();
    const cutoffTime = now.getTime() - (this.RATE_LIMIT_WINDOW * 2);

    for (const [userId, commands] of this.commandUsage.entries()) {
      const recentCommands = commands.filter(
        cmd => cmd.timestamp.getTime() > cutoffTime
      );

      if (recentCommands.length === 0) {
        this.commandUsage.delete(userId);
      } else {
        this.commandUsage.set(userId, recentCommands);
      }
    }
  }

  /**
   * Validate webhook update structure
   */
  static validateWebhookUpdate(update: any): ValidationResult {
    if (!update || typeof update !== 'object') {
      return {
        isValid: false,
        error: 'Invalid update structure',
        errorCode: 'INVALID_UPDATE'
      };
    }

    if (!update.update_id || typeof update.update_id !== 'number') {
      return {
        isValid: false,
        error: 'Missing or invalid update_id',
        errorCode: 'INVALID_UPDATE_ID'
      };
    }

    if (!update.message && !update.callback_query) {
      return {
        isValid: false,
        error: 'Update must contain message or callback_query',
        errorCode: 'MISSING_MESSAGE_OR_CALLBACK'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate message structure
   */
  static validateMessage(message: any): ValidationResult {
    if (!message || typeof message !== 'object') {
      return {
        isValid: false,
        error: 'Invalid message structure',
        errorCode: 'INVALID_MESSAGE'
      };
    }

    if (!message.chat || !message.chat.id) {
      return {
        isValid: false,
        error: 'Missing chat information',
        errorCode: 'MISSING_CHAT'
      };
    }

    if (!message.from || !message.from.id) {
      return {
        isValid: false,
        error: 'Missing user information',
        errorCode: 'MISSING_USER'
      };
    }

    return { isValid: true };
  }

  /**
   * Get error message for error code
   */
  static getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'INVALID_USER_ID': 'Invalid user ID format',
      'INVALID_COMMAND': 'Invalid command format',
      'RATE_LIMIT_EXCEEDED': 'Rate limit exceeded. Please wait before sending more commands.',
      'COMMAND_COOLDOWN': 'Please wait before using this command again.',
      'INVALID_UPDATE': 'Invalid update structure',
      'INVALID_UPDATE_ID': 'Missing or invalid update ID',
      'MISSING_MESSAGE_OR_CALLBACK': 'Update must contain message or callback query',
      'INVALID_MESSAGE': 'Invalid message structure',
      'MISSING_CHAT': 'Missing chat information',
      'MISSING_USER': 'Missing user information',
      'STAFF_NOT_FOUND': 'Staff member not found or not verified',
      'DATABASE_ERROR': 'Database error occurred',
      'UNKNOWN_ERROR': 'An unknown error occurred'
    };

    return errorMessages[errorCode] || 'An error occurred';
  }
}

// Export singleton instance
// Export the class directly since all methods are static
export { TelegramValidationService as telegramValidationService };
