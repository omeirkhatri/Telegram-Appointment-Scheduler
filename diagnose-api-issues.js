#!/usr/bin/env node

/**
 * Google Maps API Detailed Diagnostics
 *
 * This script performs detailed diagnostics to identify why APIs are failing
 */

require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

console.log('🔍 Google Maps API Detailed Diagnostics');
console.log('=======================================\n');

// Test different API endpoints to understand the restriction
async function testApiRestrictions() {
    console.log('1. 🔐 API Key Restriction Analysis');
    console.log('----------------------------------');

    const tests = [
        {
            name: 'Maps JavaScript API (should work)',
            url: `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`,
            method: 'GET'
        },
        {
            name: 'Geocoding API (failing)',
            url: `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${API_KEY}`,
            method: 'GET'
        },
        {
            name: 'Places API Text Search (failing)',
            url: `https://maps.googleapis.com/maps/api/place/textsearch/json?query=test&key=${API_KEY}`,
            method: 'GET'
        },
        {
            name: 'Places API Details (failing)',
            url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=test&key=${API_KEY}`,
            method: 'GET'
        },
        {
            name: 'Directions API (test)',
            url: `https://maps.googleapis.com/maps/api/directions/json?origin=test&destination=test&key=${API_KEY}`,
            method: 'GET'
        }
    ];

    for (const test of tests) {
        try {
            console.log(`\n📡 Testing: ${test.name}`);
            const response = await fetch(test.url, { method: test.method });
            const data = await response.json();

            if (response.ok && data.status === 'OK') {
                console.log(`   ✅ SUCCESS: ${test.name}`);
            } else if (data.status === 'REQUEST_DENIED') {
                console.log(`   ❌ REQUEST_DENIED: ${test.name}`);
                if (data.error_message) {
                    console.log(`      Error: ${data.error_message}`);
                }
            } else if (data.status === 'INVALID_REQUEST') {
                console.log(`   ⚠️  INVALID_REQUEST: ${test.name} (expected for test data)`);
            } else {
                console.log(`   ❓ UNKNOWN: ${test.name} - Status: ${data.status}`);
                if (data.error_message) {
                    console.log(`      Error: ${data.error_message}`);
                }
            }
        } catch (error) {
            console.log(`   💥 ERROR: ${test.name} - ${error.message}`);
        }
    }
}

// Test with different referrer headers
async function testReferrerRestrictions() {
    console.log('\n2. 🌐 Referrer Restriction Test');
    console.log('--------------------------------');

    const referrers = [
        'http://localhost:3000/',
        'http://localhost:3001/',
        'http://localhost:3003/',
        'https://localhost:3000/',
        'https://localhost:3001/',
        'https://localhost:3003/',
        'http://127.0.0.1:3000/',
        'http://127.0.0.1:3001/',
        'http://127.0.0.1:3003/'
    ];

    for (const referrer of referrers) {
        try {
            console.log(`\n🔗 Testing referrer: ${referrer}`);
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${API_KEY}`, {
                headers: {
                    'Referer': referrer,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            const data = await response.json();

            if (data.status === 'OK') {
                console.log(`   ✅ SUCCESS with referrer: ${referrer}`);
                break;
            } else if (data.status === 'REQUEST_DENIED') {
                console.log(`   ❌ REQUEST_DENIED with referrer: ${referrer}`);
            } else {
                console.log(`   ❓ Status ${data.status} with referrer: ${referrer}`);
            }
        } catch (error) {
            console.log(`   💥 ERROR with referrer ${referrer}: ${error.message}`);
        }
    }
}

// Test API key format and basic validation
function testApiKeyFormat() {
    console.log('\n3. 🔑 API Key Format Analysis');
    console.log('------------------------------');

    console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
    console.log(`Length: ${API_KEY.length} characters`);
    console.log(`Starts with: ${API_KEY.substring(0, 5)}`);
    console.log(`Ends with: ${API_KEY.substring(API_KEY.length - 5)}`);

    // Check if it looks like a valid Google Maps API key
    if (API_KEY.startsWith('AIza')) {
        console.log('✅ Format: Valid Google Maps API key format');
    } else {
        console.log('❌ Format: Does not look like a Google Maps API key');
    }

    // Check for common issues
    if (API_KEY.includes('your-') || API_KEY.includes('placeholder')) {
        console.log('❌ Issue: Contains placeholder text');
    }

    if (API_KEY.length < 35 || API_KEY.length > 45) {
        console.log('⚠️  Warning: Unusual length for Google Maps API key');
    }
}

// Main diagnostic function
async function runDiagnostics() {
    testApiKeyFormat();
    await testApiRestrictions();
    await testReferrerRestrictions();

    console.log('\n4. 📋 Summary & Recommendations');
    console.log('----------------------------------');
    console.log('Based on the test results above:');
    console.log('');
    console.log('🔧 If you see REQUEST_DENIED errors:');
    console.log('   1. Check API key restrictions in Google Cloud Console');
    console.log('   2. Ensure your localhost domains are whitelisted');
    console.log('   3. Verify billing is enabled for your project');
    console.log('   4. Check that the specific APIs are enabled');
    console.log('');
    console.log('🌐 For referrer restrictions:');
    console.log('   - Add these domains to your API key restrictions:');
    console.log('     * http://localhost:3000/*');
    console.log('     * http://localhost:3001/*');
    console.log('     * http://localhost:3003/*');
    console.log('     * http://127.0.0.1:3000/*');
    console.log('     * http://127.0.0.1:3001/*');
    console.log('     * http://127.0.0.1:3003/*');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Go to Google Cloud Console → APIs & Services → Credentials');
    console.log('   2. Click on your API key');
    console.log('   3. Under "Application restrictions", select "HTTP referrers"');
    console.log('   4. Add the localhost domains listed above');
    console.log('   5. Under "API restrictions", ensure these APIs are selected:');
    console.log('      - Maps JavaScript API');
    console.log('      - Geocoding API');
    console.log('      - Places API (New)');
}

runDiagnostics().catch(console.error);
