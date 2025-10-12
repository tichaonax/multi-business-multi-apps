const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContracts() {
  const employee = await prisma.employees.findFirst({
    where: { employeeNumber: 'EMP003' },
    include: {
      employee_contracts_employee_contracts_employeeIdToemployees: {
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          contractNumber: true,
          startDate: true,
          endDate: true,
          status: true,
          employeeSignedAt: true,
          managerSignedAt: true,
          isRenewal: true,
          renewalCount: true,
          createdAt: true,
          createdBy: true
        }
      }
    }
  });

  console.log('Employee:', employee?.employeeNumber, employee?.fullName);
  console.log('\nAll contracts (newest first):');
  employee?.employee_contracts_employee_contracts_employeeIdToemployees.forEach((c, i) => {
    console.log(`\n${i + 1}. ${c.contractNumber}`);
    console.log(`   Status: ${c.status}`);
    console.log(`   Start: ${c.startDate?.toISOString().split('T')[0]}, End: ${c.endDate ? c.endDate.toISOString().split('T')[0] : 'Ongoing'}`);
    console.log(`   Employee Signed: ${c.employeeSignedAt ? 'YES' : 'NO'}`);
    console.log(`   Manager Signed: ${c.managerSignedAt ? 'YES' : 'NO'}`);
    console.log(`   Is Renewal: ${c.isRenewal ? 'YES' : 'NO'} (Count: ${c.renewalCount})`);
    console.log(`   Created: ${c.createdAt?.toISOString()} by ${c.createdBy}`);
  });

  await prisma.$disconnect();
}

checkContracts().catch(console.error);
