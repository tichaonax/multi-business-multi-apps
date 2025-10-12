// One-off script: compute monthly benefits for each contract of an employee
// Usage: node scripts/compute-contract-benefits.js <employeeId>

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const empId = process.argv[2] || '148336d5-a366-444a-841a-57432c4b85d1';

(async () => {
  try {
    const contracts = await prisma.employeeContracts.findMany({
      where: { employeeId: empId },
      include: { contract_benefits: { include: { benefitType: true } } },
      orderBy: { createdAt: 'desc' },
    });

    console.log('Found', contracts.length, 'contracts for', empId);

    for (const c of contracts) {
      console.log('\nContract', c.contractNumber, 'status', c.status);
      console.log(' Base Salary:', c.baseSalary != null ? c.baseSalary.toString() : 'null');

      let benefitsSource = [];
      if (Array.isArray(c.contract_benefits) && c.contract_benefits.length > 0) {
        benefitsSource = c.contract_benefits;
      } else if (c.pdfGenerationData && Array.isArray(c.pdfGenerationData.benefits)) {
        benefitsSource = c.pdfGenerationData.benefits;
      }

      const total = benefitsSource.reduce((sum, b) => {
        const amt = b && b.amount != null ? Number(b.amount) : 0;
        return sum + (b.isPercentage ? 0 : (isFinite(amt) ? amt : 0));
      }, 0);

      console.log(' Computed monthly benefits total:', total);

      if (benefitsSource.length === 0) {
        console.log('  Benefits: none');
      } else {
        for (const b of benefitsSource) {
          const name = (b.benefitType && b.benefitType.name) || b.name || b.benefitTypeId || '<unknown>';
          console.log('  Benefit:', name, 'amount', b.amount, 'isPercentage', b.isPercentage);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
