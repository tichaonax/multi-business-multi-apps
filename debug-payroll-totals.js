// Diagnostic script to compare payroll calculations
console.log('This script needs to be run in the browser console on the payroll page');
console.log('Copy and paste the following into your browser console:\n');
console.log(`
// Debug script for payroll totals
(function() {
  console.log('=== PAYROLL CALCULATION DEBUGGING ===');
  
  // Get the period data from the page
  const period = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.getCurrentFiber?.()?.return?.memoizedState?.element?.props?.value?.period;
  
  if (!period) {
    console.error('Could not find period data. Try accessing it from React DevTools.');
    return;
  }
  
  console.log('Period ID:', period.id);
  console.log('Total Entries:', period.payrollEntries?.length || 0);
  console.log('\n=== SERVER PROVIDED TOTALS ===');
  console.log('Server totalGrossPay:', period.totalGrossPay);
  console.log('Server totalNetPay:', period.totalNetPay);
  console.log('Server totalDeductions:', period.totalDeductions);
  
  console.log('\n=== ANALYZING EACH ENTRY ===');
  let sumGross = 0;
  let sumNet = 0;
  let sumAbsence = 0;
  
  period.payrollEntries?.forEach((entry, idx) => {
    const gross = Number(entry.grossPay || 0);
    const net = Number(entry.netPay || 0);
    const absence = Number(entry.absenceDeduction || entry.absenceAmount || 0);
    
    sumGross += gross;
    sumNet += net;
    sumAbsence += absence;
    
    if (idx < 5) { // Show first 5 entries
      console.log(\`Entry \${idx + 1}: \${entry.employeeName || entry.employeeNumber}\`);
      console.log(\`  grossPay: \${gross}\`);
      console.log(\`  netPay: \${net}\`);
      console.log(\`  absenceDeduction: \${absence}\`);
    }
  });
  
  console.log('\n=== SUMMED FROM ENTRIES ===');
  console.log('Sum of entry.grossPay:', sumGross);
  console.log('Sum of entry.netPay:', sumNet);
  console.log('Sum of absenceDeduction:', sumAbsence);
  console.log('\n=== DIFFERENCE ANALYSIS ===');
  console.log('Difference (sumGross - Server totalGrossPay):', sumGross - Number(period.totalGrossPay));
  console.log('Difference (sumNet - Server totalNetPay):', sumNet - Number(period.totalNetPay));
})();
`);
