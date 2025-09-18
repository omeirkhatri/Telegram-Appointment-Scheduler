const DatabaseManager = require('./db-manager');

class MigrationManager {
  constructor() {
    this.db = new DatabaseManager();
  }

  // Apply all pending migrations
  async applyMigrations() {
    console.log('🚀 Applying all pending migrations...');

    // Migration 1: Telegram fields
    await this.applyTelegramMigration();

    console.log('✅ All migrations completed!');
  }

  // Apply Telegram migration
  async applyTelegramMigration() {
    console.log('📱 Applying Telegram migration...');
    return await this.db.applyTelegramMigration();
  }

  // Check migration status
  async checkStatus() {
    console.log('🔍 Checking migration status...');

    // Check if Telegram columns exist
    const telegramUserIdExists = await this.db.columnExists('staff', 'telegram_user_id');
    const telegramVerifiedExists = await this.db.columnExists('staff', 'telegram_verified');

    console.log('📊 Migration Status:');
    console.log(`  - telegram_user_id: ${telegramUserIdExists ? '✅' : '❌'}`);
    console.log(`  - telegram_verified: ${telegramVerifiedExists ? '✅' : '❌'}`);

    if (telegramUserIdExists && telegramVerifiedExists) {
      console.log('🎉 All migrations are up to date!');
    } else {
      console.log('⚠️ Some migrations are pending. Run: node scripts/migrations.js apply');
    }
  }
}

// CLI interface
async function main() {
  const migrationManager = new MigrationManager();
  const command = process.argv[2];

  switch (command) {
    case 'apply':
      await migrationManager.applyMigrations();
      break;

    case 'status':
      await migrationManager.checkStatus();
      break;

    case 'telegram':
      await migrationManager.applyTelegramMigration();
      break;

    default:
      console.log('🔧 Migration Manager');
      console.log('');
      console.log('Available commands:');
      console.log('  apply     - Apply all pending migrations');
      console.log('  status    - Check migration status');
      console.log('  telegram  - Apply only Telegram migration');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/migrations.js apply');
      console.log('  node scripts/migrations.js status');
      console.log('  node scripts/migrations.js telegram');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MigrationManager;
