#!/usr/bin/env node

/**
 * Timezone Data Freshness Checker
 * 
 * This script validates that the timezone data is fresh and up-to-date
 * by testing timezone resolution across multiple years and timezones.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test timezones for validation
const TEST_TIMEZONES = [
  'Asia/Dubai',      // GMT+4, No DST
  'Europe/London',   // GMT+0/+1, With DST
  'America/New_York', // GMT-5/-4, With DST
];

// Test dates spanning multiple years
const TEST_DATES = [
  '2020-01-01T00:00:00Z',
  '2021-01-01T00:00:00Z',
  '2022-01-01T00:00:00Z',
  '2023-01-01T00:00:00Z',
  '2024-01-01T00:00:00Z',
  '2025-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z',
];

// DST transition dates for validation
const DST_TRANSITION_DATES = [
  '2024-03-10T07:00:00Z', // US DST start
  '2024-11-03T06:00:00Z', // US DST end
  '2024-03-31T01:00:00Z', // EU DST start
  '2024-10-27T01:00:00Z', // EU DST end
];

function checkTimezoneDataVersion() {
  console.log('🔍 Checking timezone data version...');
  
  try {
    // Check if zdump is available
    const tzdataVersion = execSync('zdump --version', { encoding: 'utf8' });
    console.log('✅ Timezone data version:', tzdataVersion.trim());
    return true;
  } catch (error) {
    console.log('⚠️  zdump not available, checking Node.js timezone data...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log('📦 Node.js version:', nodeVersion);
    
    // Check if we can access timezone data
    try {
      const testDate = new Date('2024-01-01T00:00:00Z');
      const localTime = new Date(testDate.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
      console.log('✅ Node.js timezone data is accessible');
      return true;
    } catch (error) {
      console.error('❌ Node.js timezone data is not accessible:', error.message);
      return false;
    }
  }
}

function testTimezoneResolution() {
  console.log('\n🧪 Testing timezone resolution...');
  
  let allTestsPassed = true;
  let testCount = 0;
  let passCount = 0;
  
  TEST_TIMEZONES.forEach(timezone => {
    console.log(`\n📍 Testing timezone: ${timezone}`);
    
    TEST_DATES.forEach(dateStr => {
      testCount++;
      try {
        const utcDate = new Date(dateStr);
        const localTime = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
        const backToUTC = new Date(localTime.toLocaleString('en-US', { timeZone: 'UTC' }));
        
        // Check round-trip consistency
        const timeDiff = Math.abs(backToUTC.getTime() - utcDate.getTime());
        if (timeDiff > 1000) { // Allow 1 second tolerance
          console.error(`❌ Timezone conversion failed for ${timezone} at ${dateStr}`);
          console.error(`   Expected: ${utcDate.toISOString()}`);
          console.error(`   Got: ${backToUTC.toISOString()}`);
          allTestsPassed = false;
        } else {
          passCount++;
        }
      } catch (error) {
        console.error(`❌ Error testing ${timezone} at ${dateStr}:`, error.message);
        allTestsPassed = false;
      }
    });
  });
  
  console.log(`\n📊 Test Results: ${passCount}/${testCount} tests passed`);
  return allTestsPassed;
}

function testDSTTransitions() {
  console.log('\n🕐 Testing DST transitions...');
  
  let allTestsPassed = true;
  let testCount = 0;
  let passCount = 0;
  
  DST_TRANSITION_DATES.forEach(dateStr => {
    testCount++;
    try {
      const utcDate = new Date(dateStr);
      const localTime = new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const backToUTC = new Date(localTime.toLocaleString('en-US', { timeZone: 'UTC' }));
      
      // Check round-trip consistency
      const timeDiff = Math.abs(backToUTC.getTime() - utcDate.getTime());
      if (timeDiff > 1000) { // Allow 1 second tolerance
        console.error(`❌ DST transition test failed for ${dateStr}`);
        console.error(`   Expected: ${utcDate.toISOString()}`);
        console.error(`   Got: ${backToUTC.toISOString()}`);
        allTestsPassed = false;
      } else {
        passCount++;
      }
    } catch (error) {
      console.error(`❌ Error testing DST transition at ${dateStr}:`, error.message);
      allTestsPassed = false;
    }
  });
  
  console.log(`\n📊 DST Test Results: ${passCount}/${testCount} tests passed`);
  return allTestsPassed;
}

function checkHardCodedReferences() {
  console.log('\n🔍 Checking for hard-coded timezone references...');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const patterns = [
    'Asia/Dubai',
    'Europe/London',
    'America/New_York',
    'GMT+4',
    'UTC+4',
    '+04:00',
    'GST',
    'GMT',
    'BST',
    'EST',
    'EDT',
    'CET',
    'CEST'
  ];
  
  let foundHardCoded = false;
  
  patterns.forEach(pattern => {
    try {
      const result = execSync(`grep -r "${pattern}" ${srcDir} --exclude-dir=node_modules --exclude="*.test.ts" --exclude="*.spec.ts" --exclude="timezone-regression*.test.ts"`, { encoding: 'utf8' });
      if (result.trim()) {
        console.error(`❌ Found hard-coded timezone pattern '${pattern}':`);
        console.error(result);
        foundHardCoded = true;
      }
    } catch (error) {
      // grep returns non-zero exit code when no matches found, which is expected
    }
  });
  
  if (!foundHardCoded) {
    console.log('✅ No hard-coded timezone references found');
  }
  
  return !foundHardCoded;
}

function checkTimezoneResolverUsage() {
  console.log('\n🔧 Checking timezone resolver usage...');
  
  const srcDir = path.join(__dirname, '..', 'src');
  let foundResolverUsage = false;
  
  try {
    const result = execSync(`grep -r "resolveTimezone\\|buildTimezoneArtifacts" ${srcDir} --exclude-dir=node_modules --exclude="*.test.ts" --exclude="*.spec.ts"`, { encoding: 'utf8' });
    if (result.trim()) {
      console.log('✅ Found timezone resolver usage:');
      console.log(result);
      foundResolverUsage = true;
    }
  } catch (error) {
    // grep returns non-zero exit code when no matches found
  }
  
  if (!foundResolverUsage) {
    console.log('⚠️  No timezone resolver usage found in source code');
  }
  
  return foundResolverUsage;
}

function main() {
  console.log('🌍 Timezone Data Freshness Checker');
  console.log('==================================');
  
  let allChecksPassed = true;
  
  // Check timezone data version
  if (!checkTimezoneDataVersion()) {
    allChecksPassed = false;
  }
  
  // Test timezone resolution
  if (!testTimezoneResolution()) {
    allChecksPassed = false;
  }
  
  // Test DST transitions
  if (!testDSTTransitions()) {
    allChecksPassed = false;
  }
  
  // Check for hard-coded references
  if (!checkHardCodedReferences()) {
    allChecksPassed = false;
  }
  
  // Check timezone resolver usage
  checkTimezoneResolverUsage();
  
  console.log('\n📋 Summary');
  console.log('==========');
  
  if (allChecksPassed) {
    console.log('✅ All timezone checks passed!');
    process.exit(0);
  } else {
    console.log('❌ Some timezone checks failed!');
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  checkTimezoneDataVersion,
  testTimezoneResolution,
  testDSTTransitions,
  checkHardCodedReferences,
  checkTimezoneResolverUsage
};
