/**
 * Test the new working days calculation (excluding Sundays)
 * for October 2025
 */

function countWorkingDays(startDate, endDate) {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    // Count all days except Sunday (0)
    if (dayOfWeek !== 0) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

// October 2025: Oct 1 - Oct 31
const periodStart = new Date('2025-10-01')
const periodEnd = new Date('2025-10-31')

console.log('=== OCTOBER 2025 WORKING DAYS CALCULATION ===\n');
console.log('Period: October 1, 2025 - October 31, 2025');
console.log('Total Calendar Days: 31\n');

// Count working days for the full month
const workDays = countWorkingDays(periodStart, periodEnd);

console.log('Day-by-day breakdown:');
const current = new Date(periodStart);
let sundays = 0;
const sundayDates = [];

while (current <= periodEnd) {
  const dayOfWeek = current.getDay();
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
  const isWorkDay = dayOfWeek !== 0;

  if (!isWorkDay) {
    sundays++;
    sundayDates.push(current.getDate());
  }

  console.log(`  Oct ${current.getDate().toString().padStart(2, ' ')} - ${dayName.padEnd(9)} ${isWorkDay ? '✓ Work day' : '✗ Sunday (off)'}`);
  current.setDate(current.getDate() + 1);
}

console.log('\n=== SUMMARY ===');
console.log(`Total Calendar Days: 31`);
console.log(`Sundays (off): ${sundays} days (${sundayDates.join(', ')})`);
console.log(`Working Days (Mon-Sat): ${workDays} days`);
console.log(`\nExpected in payroll: ${workDays} work days`);
