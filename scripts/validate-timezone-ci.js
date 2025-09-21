#!/usr/bin/env node

/**
 * Timezone CI Validation Script
 * 
 * This script runs comprehensive timezone validation checks
 * suitable for CI/CD pipelines.
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

// Test dates for validation
const TEST_DATES = [
  '2024-01-01T00:00:00Z',
  '2024-06-21T12:00:00Z',
  '2024-12-31T23:59:59Z',
  '2025-01-01T00:00:00Z',
  '2025-06-21T12:00:00Z',
];

function runCommand(command, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed successfully`);
    return { success: true, output };
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

function checkTimezoneDataFreshness() {
  console.log('🌍 Checking timezone data freshness...');
  
  let allTestsPassed = true;
  
  TEST_TIMEZONES.forEach(timezone => {
    console.log(`\n📍 Testing timezone: ${timezone}`);
    
    TEST_DATES.forEach(dateStr => {
      try {
        const utcDate = new Date(dateStr);
        const localTime = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
        const backToUTC = new Date(localTime.toLocaleString('en-US', { timeZone: 'UTC' }));
        
        // Check round-trip consistency
        const timeDiff = Math.abs(backToUTC.getTime() - utcDate.getTime());
        if (timeDiff > 1000) { // Allow 1 second tolerance
          console.error(`❌ Timezone conversion failed for ${timezone} at ${dateStr}`);
          allTestsPassed = false;
        }
      } catch (error) {
        console.error(`❌ Error testing ${timezone} at ${dateStr}:`, error.message);
        allTestsPassed = false;
      }
    });
  });
  
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
  console.log('🌍 Timezone CI Validation');
  console.log('=========================');
  
  let allChecksPassed = true;
  
  // Check timezone data freshness
  if (!checkTimezoneDataFreshness()) {
    allChecksPassed = false;
  }
  
  // Check for hard-coded references
  if (!checkHardCodedReferences()) {
    allChecksPassed = false;
  }
  
  // Check timezone resolver usage
  checkTimezoneResolverUsage();
  
  // Run ESLint with timezone rules
  const eslintResult = runCommand('npm run lint', 'Running ESLint with timezone rules');
  if (!eslintResult.success) {
    allChecksPassed = false;
  }
  
  // Run timezone regression tests
  const testResult = runCommand('npm test -- --testPathPattern="timezone-regression" --verbose', 'Running timezone regression tests');
  if (!testResult.success) {
    allChecksPassed = false;
  }
  
  console.log('\n📋 Summary');
  console.log('==========');
  
  if (allChecksPassed) {
    console.log('✅ All timezone CI validation checks passed!');
    process.exit(0);
  } else {
    console.log('❌ Some timezone CI validation checks failed!');
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  checkTimezoneDataFreshness,
  checkHardCodedReferences,
  checkTimezoneResolverUsage
};
