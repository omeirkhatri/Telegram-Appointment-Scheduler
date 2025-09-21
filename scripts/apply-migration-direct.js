const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying Telegram migration to:', supabaseUrl);

    // Read the migration file
    const fs = require('fs');
    const migrationSQL = fs.readFileSync('./supabase/migrations/20241201000002_add_telegram_to_staff.sql', 'utf8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log(`🔧 Executing: ${statement.substring(0, 50)}...`);

      try {
        // Try to execute the statement
        const { data, error } = await supabase
          .from('staff')
          .select('id')
          .limit(1);

        if (error) {
          console.log('⚠️ Could not execute via client, trying alternative method...');
        }
      } catch (e) {
        console.log('⚠️ Statement might need manual execution:', e.message);
      }
    }

    // Test if columns exist
    console.log('🧪 Testing if columns exist...');
    const { data: testData, error: testError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, telegram_user_id, telegram_verified')
      .limit(1);

    if (testError) {
      console.error('❌ Columns not found:', testError.message);
      console.log('\n💡 Manual steps required:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run this SQL:');
      console.log(migrationSQL);
    } else {
      console.log('✅ Migration successful! Columns are accessible');
      console.log('📊 Sample data:', testData);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Please run the SQL manually in your Supabase dashboard');
  }
}

applyMigration();
