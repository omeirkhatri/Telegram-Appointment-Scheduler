const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Make sure you have:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateTelegram() {
  try {
    console.log('🚀 Starting Telegram migration...');
    console.log('Supabase URL:', supabaseUrl);

    // Check if columns already exist
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'staff')
      .in('column_name', ['telegram_user_id', 'telegram_verified']);

    if (columnError) {
      console.log('⚠️ Could not check existing columns, proceeding with migration...');
    } else {
      console.log('📋 Existing columns:', columns?.map(c => c.column_name) || []);
    }

    // Try to add telegram_user_id column
    try {
      const { error: col1Error } = await supabase
        .rpc('exec', {
          sql: 'ALTER TABLE staff ADD COLUMN IF NOT EXISTS telegram_user_id TEXT;'
        });

      if (col1Error) {
        console.log('⚠️ telegram_user_id column might already exist or error:', col1Error.message);
      } else {
        console.log('✅ Added telegram_user_id column');
      }
    } catch (e) {
      console.log('⚠️ Could not add telegram_user_id column:', e.message);
    }

    // Try to add telegram_verified column
    try {
      const { error: col2Error } = await supabase
        .rpc('exec', {
          sql: 'ALTER TABLE staff ADD COLUMN IF NOT EXISTS telegram_verified BOOLEAN DEFAULT false;'
        });

      if (col2Error) {
        console.log('⚠️ telegram_verified column might already exist or error:', col2Error.message);
      } else {
        console.log('✅ Added telegram_verified column');
      }
    } catch (e) {
      console.log('⚠️ Could not add telegram_verified column:', e.message);
    }

    // Test if we can query the columns
    console.log('🧪 Testing column access...');
    const { data: testData, error: testError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, telegram_user_id, telegram_verified')
      .limit(1);

    if (testError) {
      console.error('❌ Error testing columns:', testError.message);
      console.log('💡 You may need to run the SQL manually in Supabase dashboard');
    } else {
      console.log('✅ Columns are accessible!');
      console.log('📊 Sample data:', testData);
    }

    console.log('🎉 Migration attempt completed!');
    console.log('💡 If columns are not accessible, run the SQL manually in Supabase dashboard');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('💡 Please run the SQL manually in Supabase dashboard');
  }
}

migrateTelegram();
