const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndAddColumns() {
  console.log('🔍 Checking current database state...');

  try {
    // Try to query the columns to see if they exist
    const { data, error } = await supabase
      .from('staff')
      .select('id, first_name, last_name, telegram_user_id, telegram_verified')
      .limit(1);

    if (error) {
      if (error.message.includes('telegram_user_id does not exist')) {
        console.log('❌ Telegram columns do not exist yet');
        console.log('');
        console.log('🔧 To add the Telegram columns, run this SQL in your Supabase dashboard:');
        console.log('');
        console.log('-- Go to: https://supabase.n8nbdoc.com/project/default');
        console.log('-- Navigate to SQL Editor');
        console.log('-- Run this SQL:');
        console.log('');
        console.log('ALTER TABLE staff ADD COLUMN telegram_user_id TEXT;');
        console.log('ALTER TABLE staff ADD COLUMN telegram_verified BOOLEAN DEFAULT false;');
        console.log('CREATE INDEX idx_staff_telegram_user_id ON staff(telegram_user_id);');
        console.log('ALTER TABLE staff ADD CONSTRAINT staff_telegram_user_id_check');
        console.log('CHECK (telegram_user_id IS NULL OR telegram_user_id ~ \'^\\d+$\');');
        console.log('');
        console.log('Then run: npm run db:status');
        return false;
      } else {
        console.error('❌ Database error:', error.message);
        return false;
      }
    } else {
      console.log('✅ Telegram columns already exist!');
      console.log('📊 Sample data:', data);
      return true;
    }
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    return false;
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'check':
      await checkAndAddColumns();
      break;

    case 'test':
      console.log('🧪 Testing database connection...');
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('id, first_name, last_name')
          .limit(1);

        if (error) {
          console.error('❌ Database connection failed:', error.message);
        } else {
          console.log('✅ Database connection successful');
          console.log('📊 Sample staff data:', data);
        }
      } catch (error) {
        console.error('❌ Connection error:', error.message);
      }
      break;

    default:
      console.log('🔧 Simple Database Manager');
      console.log('');
      console.log('Available commands:');
      console.log('  check  - Check if Telegram columns exist');
      console.log('  test   - Test database connection');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/simple-migrate.js check');
      console.log('  node scripts/simple-migrate.js test');
  }
}

main().catch(console.error);
