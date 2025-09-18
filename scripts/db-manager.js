const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class DatabaseManager {
  constructor() {
    this.supabase = supabase;
  }

  // Execute raw SQL
  async executeSQL(sql) {
    try {
      console.log('🔧 Executing SQL:', sql);

      // For DDL statements, we need to use a different approach
      // Let's try to execute via the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SQL executed successfully');
        return { success: true, data: result };
      } else {
        console.log('⚠️ REST API method failed, trying alternative...');
        return { success: false, error: 'REST API failed' };
      }
    } catch (error) {
      console.log('⚠️ SQL execution failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Check if table exists
  async tableExists(tableName) {
    try {
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .single();

      return !error && data;
    } catch (error) {
      return false;
    }
  }

  // Check if column exists
  async columnExists(tableName, columnName) {
    try {
      const { data, error } = await this.supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', tableName)
        .eq('column_name', columnName)
        .eq('table_schema', 'public')
        .single();

      return !error && data;
    } catch (error) {
      return false;
    }
  }

  // Add column if it doesn't exist
  async addColumnIfNotExists(tableName, columnName, columnType, defaultValue = null) {
    const exists = await this.columnExists(tableName, columnName);

    if (exists) {
      console.log(`✅ Column ${tableName}.${columnName} already exists`);
      return { success: true, message: 'Column already exists' };
    }

    let sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
    if (defaultValue !== null) {
      sql += ` DEFAULT ${defaultValue}`;
    }

    return await this.executeSQL(sql);
  }

  // Create index if it doesn't exist
  async createIndexIfNotExists(indexName, tableName, columnName) {
    const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnName})`;
    return await this.executeSQL(sql);
  }

  // Add constraint if it doesn't exist
  async addConstraintIfNotExists(constraintName, tableName, constraint) {
    const sql = `ALTER TABLE ${tableName} ADD CONSTRAINT IF NOT EXISTS ${constraintName} ${constraint}`;
    return await this.executeSQL(sql);
  }

  // Apply Telegram migration
  async applyTelegramMigration() {
    console.log('🚀 Applying Telegram migration...');

    // Add telegram_user_id column
    await this.addColumnIfNotExists('staff', 'telegram_user_id', 'TEXT');

    // Add telegram_verified column
    await this.addColumnIfNotExists('staff', 'telegram_verified', 'BOOLEAN', 'false');

    // Create index
    await this.createIndexIfNotExists('idx_staff_telegram_user_id', 'staff', 'telegram_user_id');

    // Add constraint
    await this.addConstraintIfNotExists(
      'staff_telegram_user_id_check',
      'staff',
      "CHECK (telegram_user_id IS NULL OR telegram_user_id ~ '^\\d+$')"
    );

    // Test the columns
    console.log('🧪 Testing columns...');
    const { data, error } = await this.supabase
      .from('staff')
      .select('id, first_name, last_name, telegram_user_id, telegram_verified')
      .limit(1);

    if (error) {
      console.error('❌ Columns not accessible:', error.message);
      return { success: false, error: error.message };
    } else {
      console.log('✅ Migration successful! Columns are accessible');
      return { success: true, data };
    }
  }

  // List all tables
  async listTables() {
    try {
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (error) {
        throw error;
      }

      console.log('📋 Available tables:');
      data.forEach(table => console.log(`  - ${table.table_name}`));
      return data;
    } catch (error) {
      console.error('❌ Error listing tables:', error.message);
      return [];
    }
  }

  // Describe table structure
  async describeTable(tableName) {
    try {
      const { data, error } = await this.supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .order('ordinal_position');

      if (error) {
        throw error;
      }

      console.log(`📋 Table structure for ${tableName}:`);
      data.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
      return data;
    } catch (error) {
      console.error('❌ Error describing table:', error.message);
      return [];
    }
  }
}

// CLI interface
async function main() {
  const db = new DatabaseManager();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'migrate-telegram':
      await db.applyTelegramMigration();
      break;

    case 'list-tables':
      await db.listTables();
      break;

    case 'describe':
      if (args[0]) {
        await db.describeTable(args[0]);
      } else {
        console.log('Usage: node scripts/db-manager.js describe <table_name>');
      }
      break;

    case 'sql':
      if (args[0]) {
        await db.executeSQL(args.join(' '));
      } else {
        console.log('Usage: node scripts/db-manager.js sql "YOUR SQL HERE"');
      }
      break;

    default:
      console.log('🔧 Database Manager');
      console.log('');
      console.log('Available commands:');
      console.log('  migrate-telegram  - Apply Telegram migration');
      console.log('  list-tables       - List all tables');
      console.log('  describe <table>  - Describe table structure');
      console.log('  sql "query"       - Execute raw SQL');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/db-manager.js migrate-telegram');
      console.log('  node scripts/db-manager.js list-tables');
      console.log('  node scripts/db-manager.js describe staff');
      console.log('  node scripts/db-manager.js sql "SELECT * FROM staff LIMIT 5"');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseManager;
