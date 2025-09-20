#!/usr/bin/env node

/**
 * Google Maps API Key Setup Script
 *
 * This script helps users set up their Google Maps API key properly.
 * It checks the current configuration and provides guidance.
 */

const fs = require('fs');
const path = require('path');

const ENV_FILES = ['.env.local', '.env', '.env.production'];
const PLACEHOLDER_VALUES = [
  'your-google-maps-api-key-here',
  'your-actual-api-key-here',
  'your-api-key-here',
  'REPLACE_WITH_YOUR_API_KEY',
  'INSERT_YOUR_API_KEY_HERE'
];

function checkApiKey() {
  console.log('🔍 Checking Google Maps API key configuration...\n');

  let apiKey = null;
  let envFile = null;

  // Check each environment file
  for (const file of ENV_FILES) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=(.+)/);
      if (match) {
        apiKey = match[1].trim();
        envFile = file;
        break;
      }
    }
  }

  if (!apiKey) {
    console.log('❌ No Google Maps API key found in environment files.');
    console.log('\n📝 To fix this:');
    console.log('1. Create a .env.local file in your project root');
    console.log('2. Add: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-api-key-here');
    console.log('3. Get your API key from: https://console.cloud.google.com/google/maps-apis');
    return false;
  }

  if (PLACEHOLDER_VALUES.some(placeholder =>
    apiKey.toLowerCase().includes(placeholder.toLowerCase())
  )) {
    console.log('⚠️  Google Maps API key is set to placeholder value.');
    console.log(`   Found in: ${envFile}`);
    console.log(`   Current value: ${apiKey}`);
    console.log('\n📝 To fix this:');
    console.log('1. Get your API key from: https://console.cloud.google.com/google/maps-apis');
    console.log(`2. Update ${envFile} with your actual API key`);
    console.log('3. Restart your development server');
    return false;
  }

  // Basic validation
  if (apiKey.length < 35 || apiKey.length > 45) {
    console.log('⚠️  Google Maps API key appears to have incorrect length.');
    console.log(`   Found in: ${envFile}`);
    console.log(`   Current value: ${apiKey}`);
    console.log('\n📝 To fix this:');
    console.log('1. Check your API key from Google Cloud Console');
    console.log('2. Ensure it\'s the correct length (35-45 characters)');
    return false;
  }

  console.log('✅ Google Maps API key appears to be properly configured!');
  console.log(`   Found in: ${envFile}`);
  console.log(`   Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  return true;
}

function showSetupInstructions() {
  console.log('\n🚀 Google Maps API Setup Instructions:');
  console.log('=====================================\n');

  console.log('1. Go to Google Cloud Console:');
  console.log('   https://console.cloud.google.com/google/maps-apis\n');

  console.log('2. Create a new project or select existing one\n');

  console.log('3. Enable required APIs:');
  console.log('   - Maps JavaScript API');
  console.log('   - Geocoding API');
  console.log('   - Places API (optional)\n');

  console.log('4. Create API Key:');
  console.log('   - Go to APIs & Services > Credentials');
  console.log('   - Click "Create Credentials" > "API Key"');
  console.log('   - Copy the generated key\n');

  console.log('5. Configure API Key restrictions:');
  console.log('   - Click "Restrict Key"');
  console.log('   - Application restrictions: HTTP referrers');
  console.log('   - Website restrictions: Add your domain(s)');
  console.log('   - API restrictions: Select enabled APIs\n');

  console.log('6. Add to environment file:');
  console.log('   Create .env.local with:');
  console.log('   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-api-key-here\n');

  console.log('7. Restart your development server\n');
}

function main() {
  console.log('🗺️  Google Maps API Key Setup Checker\n');

  const isValid = checkApiKey();

  if (!isValid) {
    showSetupInstructions();
    process.exit(1);
  } else {
    console.log('\n🎉 Setup complete! Your Google Maps integration should work correctly.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkApiKey, showSetupInstructions };
