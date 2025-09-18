// Simple test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Direct configuration (matching your .env file)
const supabaseUrl = 'https://supabase.n8nbdoc.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

console.log('🔍 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', `${supabaseKey.substring(0, 20)}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // Test 1: Check if we can connect
        console.log('\n📡 Test 1: Basic Connection');
        const { data, error } = await supabase.from('patients').select('count', { count: 'exact' }).limit(1);

        if (error) {
            console.log('❌ Connection failed:', error.message);
            return;
        }

        console.log('✅ Connection successful!');
        console.log('📊 Patients count:', data?.length || 0);

        // Test 2: Check server info
        console.log('\n📡 Test 2: Server Information');
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (response.ok) {
            const info = await response.json();
            console.log('✅ Server info retrieved');
            console.log('📋 API Version:', info.info?.version || 'Unknown');
            console.log('🌐 Server Host:', info.host || 'Unknown');
        }

        // Test 3: Check if this is the new server
        console.log('\n📡 Test 3: Server Verification');
        if (supabaseUrl.includes('supabase.n8nbdoc.com')) {
            console.log('✅ Connected to NEW server: supabase.n8nbdoc.com');
        } else {
            console.log('⚠️  Connected to OLD server:', supabaseUrl);
        }

        // Test 4: Try to get some data
        console.log('\n📡 Test 4: Data Access');
        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, name, phone')
            .limit(5);

        if (patientsError) {
            console.log('❌ Data access failed:', patientsError.message);
        } else {
            console.log('✅ Data access successful');
            console.log('📋 Sample patients:', patients?.length || 0);
            if (patients && patients.length > 0) {
                console.log('   First patient:', patients[0]);
            }
        }

        // Test 5: Check staff data
        console.log('\n📡 Test 5: Staff Data');
        const { data: staff, error: staffError } = await supabase
            .from('staff')
            .select('id, name, email')
            .limit(5);

        if (staffError) {
            console.log('❌ Staff access failed:', staffError.message);
        } else {
            console.log('✅ Staff access successful');
            console.log('📋 Sample staff:', staff?.length || 0);
            if (staff && staff.length > 0) {
                console.log('   First staff member:', staff[0]);
            }
        }

    } catch (err) {
        console.log('❌ Test failed:', err.message);
    }
}

testConnection();
