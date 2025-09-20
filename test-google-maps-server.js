#!/usr/bin/env node

/**
 * Google Maps API Server-Side Test
 *
 * This script tests the Google Maps API key and services from the server side
 * to help debug API issues.
 */

require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

console.log('🔍 Google Maps API Server-Side Test');
console.log('=====================================\n');

// Test 1: Check API Key
console.log('1. 📋 API Key Check');
console.log('-------------------');
if (!API_KEY) {
    console.log('❌ No API key found in environment variables');
    process.exit(1);
}

console.log(`✅ API Key found: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
console.log(`   Length: ${API_KEY.length} characters`);

if (API_KEY.length < 35 || API_KEY.length > 45) {
    console.log('⚠️  Warning: API key length seems unusual');
}

if (API_KEY.includes('your-') || API_KEY.includes('placeholder')) {
    console.log('❌ Error: API key appears to be a placeholder');
    process.exit(1);
}

console.log('✅ API key format looks valid\n');

// Test 2: Test Geocoding API
console.log('2. 📍 Geocoding API Test');
console.log('-------------------------');

async function testGeocodingAPI() {
    try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Dubai,UAE&key=${API_KEY}`);
        const data = await response.json();

        if (data.status === 'OK') {
            console.log('✅ Geocoding API working');
            console.log(`   Found ${data.results.length} results for "Dubai, UAE"`);
            if (data.results.length > 0) {
                const location = data.results[0].geometry.location;
                console.log(`   Coordinates: ${location.lat}, ${location.lng}`);
            }
        } else {
            console.log(`❌ Geocoding API error: ${data.status}`);
            if (data.error_message) {
                console.log(`   Error message: ${data.error_message}`);
            }
        }
    } catch (error) {
        console.log(`❌ Geocoding API request failed: ${error.message}`);
    }
}

// Test 3: Test Places API
console.log('3. 🏢 Places API Test');
console.log('----------------------');

async function testPlacesAPI() {
    try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=hospital+in+Dubai&key=${API_KEY}`);
        const data = await response.json();

        if (data.status === 'OK') {
            console.log('✅ Places API working');
            console.log(`   Found ${data.results.length} places for "hospital in Dubai"`);
        } else {
            console.log(`❌ Places API error: ${data.status}`);
            if (data.error_message) {
                console.log(`   Error message: ${data.error_message}`);
            }
        }
    } catch (error) {
        console.log(`❌ Places API request failed: ${error.message}`);
    }
}

// Test 4: Test Maps JavaScript API (basic check)
console.log('4. 🗺️  Maps JavaScript API Test');
console.log('---------------------------------');

async function testMapsJSAPI() {
    try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`);

        if (response.ok) {
            console.log('✅ Maps JavaScript API accessible');
            console.log(`   Response size: ${response.headers.get('content-length')} bytes`);
        } else {
            console.log(`❌ Maps JavaScript API error: HTTP ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Maps JavaScript API request failed: ${error.message}`);
    }
}

// Run all tests
async function runAllTests() {
    await testGeocodingAPI();
    console.log('');
    await testPlacesAPI();
    console.log('');
    await testMapsJSAPI();
    console.log('');

    console.log('5. 📊 Summary');
    console.log('--------------');
    console.log('✅ All tests completed');
    console.log('📝 Check the results above for any errors');
    console.log('\n💡 If you see errors:');
    console.log('   1. Verify your API key is correct');
    console.log('   2. Check that the required APIs are enabled in Google Cloud Console');
    console.log('   3. Verify API key restrictions allow your domain/IP');
    console.log('   4. Check your billing account is active');
}

runAllTests().catch(console.error);
