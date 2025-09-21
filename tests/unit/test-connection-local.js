const { createClient } = require('@supabase/supabase-js');

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

console.log('🔍 Testing Local Supabase Connection...');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey.substring(0, 20)}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('\n📡 Test 1: Basic Connection');
        const { data, error } = await supabase.from('staff').select('count').limit(1);
        
        if (error) {
            console.log(`❌ Connection failed: ${error.message}`);
            return;
        }
        
        console.log('✅ Connection successful!');
        
        console.log('\n📊 Test 2: Check Key Tables');
        const tables = ['staff', 'patients', 'appointments'];
        
        for (const table of tables) {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`❌ Table '${table}': ${error.message}`);
            } else {
                console.log(`✅ Table '${table}': Available`);
            }
        }
        
    } catch (err) {
        console.log(`❌ Connection failed: ${err.message}`);
    }
}

testConnection();
