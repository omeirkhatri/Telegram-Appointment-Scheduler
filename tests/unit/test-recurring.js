// Simple test for recurring appointment generation
const { getNextOccurrenceDate } = require('./src/lib/recurrenceUtils.ts');

// Test data
const baseDate = new Date('2025-10-03');
const recurringRule = {
  frequency: 'daily',
  interval: 1,
  end_date: '2025-10-05'
};

console.log('Testing getNextOccurrenceDate function:');
console.log('Base date:', baseDate.toISOString().split('T')[0]);
console.log('Recurring rule:', recurringRule);

try {
  for (let i = 1; i <= 3; i++) {
    const nextDate = getNextOccurrenceDate(baseDate, recurringRule, i);
    console.log(`Occurrence ${i}: ${nextDate.toISOString().split('T')[0]}`);
  }
} catch (error) {
  console.error('Error:', error);
}
