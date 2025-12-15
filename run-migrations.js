const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://beagmcohnnihbwllomfj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYWdtY29obm5paGJ3bGxvbWZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc5NTc1MSwiZXhwIjoyMDgxMzcxNzUxfQ.E9zVmixz7B5KoziEFD3RI4N2ZAwNifppgUqGeHr_VaQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();
  
  console.log(`Found ${files.length} migration files\n`);
  
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Running: ${file}...`);
    
    try {
      // Use the raw SQL execution via rpc
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // Try direct approach if rpc doesn't work
        console.log(`  RPC failed, trying direct query...`);
        const { error: directError } = await supabase.from('_migrations_temp').select('*').limit(0);
        console.log(`  ⚠️  Skipped (needs direct DB access): ${error.message}`);
      } else {
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }
}

runMigrations().catch(console.error);
