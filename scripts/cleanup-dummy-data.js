const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDummyData() {
    try {
        console.log('🧹 Cleaning up existing dummy data...');

        // Delete appointment-staff relationships first
        console.log('Deleting appointment-staff relationships...');
        await supabase.from('appointment_staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete appointments
        console.log('Deleting appointments...');
        await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete patients
        console.log('Deleting patients...');
        await supabase.from('patients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete staff
        console.log('Deleting staff...');
        await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        console.log('✅ Cleanup completed!');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

cleanupDummyData();

