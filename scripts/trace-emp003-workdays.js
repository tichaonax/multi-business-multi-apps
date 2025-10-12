const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function traceWorkDaysCalculation() {
  try {
    // Get the payroll period (October 2025)
    const period = await prisma.payrollPeriod.findFirst({
      where: {
        year: 2025,
        month: 10
      },
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        year: true,
        month: true
      }
    });

    console.log('=== PAYROLL PERIOD ===');
    console.log('Period ID:', period?.id);
    console.log('Period Start:', period?.periodStart?.toISOString().split('T')[0]);
    console.log('Period End:', period?.periodEnd?.toISOString().split('T')[0]);

    // Get EMP003's contract
    const employee = await prisma.employees.findFirst({
      where: { employeeNumber: 'EMP003' },
      include: {
        employee_contracts_employee_contracts_employeeIdToemployees: {
          where: { status: 'active' },
          select: {
            id: true,
            contractNumber: true,
            startDate: true,
            endDate: true,
            employeeSignedAt: true,
            managerSignedAt: true
          }
        }
      }
    });

    console.log('\n=== EMPLOYEE ===');
    console.log('Employee Number:', employee?.employeeNumber);
    console.log('Full Name:', employee?.fullName);
    console.log('Termination Date:', employee?.terminationDate);

    const contract = employee?.employee_contracts_employee_contracts_employeeIdToemployees[0];
    console.log('\n=== CONTRACT ===');
    console.log('Contract Number:', contract?.contractNumber);
    console.log('Contract Start:', contract?.startDate?.toISOString().split('T')[0]);
    console.log('Contract End:', contract?.endDate ? contract.endDate.toISOString().split('T')[0] : 'Ongoing (null)');
    console.log('Signed by Employee:', contract?.employeeSignedAt ? 'YES' : 'NO');
    console.log('Signed by Manager:', contract?.managerSignedAt ? 'YES' : 'NO');

    // Now trace the calculation
    console.log('\n=== WORK DAYS CALCULATION ===');

    const periodStart = period.periodStart;
    const periodEnd = period.periodEnd;
    const contractStart = contract.startDate;
    const contractEnd = contract.endDate;
    const employeeTerminationDate = employee.terminationDate;
    const standardWorkDays = 22;

    // Step 1: Determine effective start (later of period start or contract start)
    const effectiveStart = contractStart > periodStart ? contractStart : periodStart;
    console.log('Step 1 - Effective Start Date:');
    console.log('  Contract Start:', contractStart.toISOString().split('T')[0]);
    console.log('  Period Start:', periodStart.toISOString().split('T')[0]);
    console.log('  → Effective Start (later of both):', effectiveStart.toISOString().split('T')[0]);

    // Step 2: Determine effective end (earliest of period end, contract end, termination)
    let effectiveEnd = periodEnd;
    console.log('\nStep 2 - Effective End Date:');
    console.log('  Period End:', periodEnd.toISOString().split('T')[0]);
    console.log('  Contract End:', contractEnd ? contractEnd.toISOString().split('T')[0] : 'null (ongoing)');
    console.log('  Employee Termination:', employeeTerminationDate ? employeeTerminationDate.toISOString().split('T')[0] : 'null');

    if (contractEnd && contractEnd < effectiveEnd) {
      effectiveEnd = contractEnd;
      console.log('  → Contract ends before period, using contract end');
    }

    if (employeeTerminationDate) {
      const termDate = new Date(employeeTerminationDate);
      if (termDate < effectiveEnd) {
        effectiveEnd = termDate;
        console.log('  → Employee terminated before effective end, using termination date');
      }
    }

    console.log('  → Effective End (earliest of period/contract/termination):', effectiveEnd.toISOString().split('T')[0]);

    // Step 3: Calculate total days in period
    const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    console.log('\nStep 3 - Total Days in Payroll Period:');
    console.log('  Formula: (periodEnd - periodStart) + 1');
    console.log('  Calculation:', `(${periodEnd.toISOString().split('T')[0]} - ${periodStart.toISOString().split('T')[0]}) + 1`);
    console.log('  → Total Period Days:', periodDays);

    // Step 4: Calculate actual days worked
    const workedDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    console.log('\nStep 4 - Actual Calendar Days Worked:');
    console.log('  Formula: (effectiveEnd - effectiveStart) + 1');
    console.log('  Calculation:', `(${effectiveEnd.toISOString().split('T')[0]} - ${effectiveStart.toISOString().split('T')[0]}) + 1`);
    console.log('  → Actual Days:', workedDays);

    // Step 5: Prorate work days
    const proratedWorkDays = Math.round((workedDays / periodDays) * standardWorkDays);
    console.log('\nStep 5 - Prorated Work Days:');
    console.log('  Formula: (actualDays / periodDays) × standardWorkDays');
    console.log('  Calculation:', `(${workedDays} / ${periodDays}) × ${standardWorkDays}`);
    console.log('  Exact result:', (workedDays / periodDays) * standardWorkDays);
    console.log('  → Rounded Work Days:', proratedWorkDays);

    console.log('\n=== RESULT ===');
    console.log(`Employee ${employee.employeeNumber} worked ${proratedWorkDays} days out of ${standardWorkDays} standard work days`);
    console.log(`Is Prorated: ${proratedWorkDays < standardWorkDays ? 'YES' : 'NO'}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

traceWorkDaysCalculation();
