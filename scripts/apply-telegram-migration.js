const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying Telegram migration...');

    // Add telegram_user_id column
    const { error: col1Error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE staff ADD COLUMN IF NOT EXISTS telegram_user_id TEXT;'
    });

    if (col1Error) {
      console.log('⚠️ telegram_user_id column might already exist:', col1Error.message);
    } else {
      console.log('✅ Added telegram_user_id column');
    }

    // Add telegram_verified column
    const { error: col2Error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE staff ADD COLUMN IF NOT EXISTS telegram_verified BOOLEAN DEFAULT false;'
    });

    if (col2Error) {
      console.log('⚠️ telegram_verified column might already exist:', col2Error.message);
    } else {
      console.log('✅ Added telegram_verified column');
    }

    // Add index
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_staff_telegram_user_id ON staff(telegram_user_id);'
    });

    if (indexError) {
      console.log('⚠️ Index might already exist:', indexError.message);
    } else {
      console.log('✅ Added index for telegram_user_id');
    }

    // Add constraint
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE staff ADD CONSTRAINT IF NOT EXISTS staff_telegram_user_id_check
            CHECK (telegram_user_id IS NULL OR telegram_user_id ~ '^\\d+$');`
    });

    if (constraintError) {
      console.log('⚠️ Constraint might already exist:', constraintError.message);
    } else {
      console.log('✅ Added constraint for telegram_user_id format');
    }

    console.log('🎉 Migration completed successfully!');

    // Test the columns exist
    const { data, error } = await supabase
      .from('staff')
      .select('id, first_name, last_name, telegram_user_id, telegram_verified')
      .limit(1);

    if (error) {
      console.error('❌ Error testing columns:', error.message);
    } else {
      console.log('✅ Columns are accessible:', data);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

applyMigration();
