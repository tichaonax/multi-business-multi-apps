
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const emp = await prisma.employees.findMany({
    where: { primaryBusinessId: 'grocery-demo-business', isActive: true },
    include: {
      employee_contracts_employee_contracts_employeeIdToemployees: {
        where: { status: 'active' },
        take: 1
      }
    },
    take: 3
  });
  
  console.log('Employees:', emp.length);
  emp.forEach(e => {
    const c = e.employee_contracts_employee_contracts_employeeIdToemployees[0];
    console.log(e.employeeNumber, e.fullName);
    console.log('  Contract:', c ? 'YES' : 'NO');
    if (c) console.log('  Salary:', c.baseSalary);
  });
  
  await prisma.();
})();

