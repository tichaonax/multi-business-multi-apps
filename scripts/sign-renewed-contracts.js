/**
 * Sign all unsigned renewed contracts
 *
 * This script finds all renewed contracts that are active but not fully signed
 * and auto-signs them with both employee and manager signatures.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUnsignedRenewedContracts() {
  try {
    // Find all renewed contracts that are active but not signed
    const unsignedRenewed = await prisma.employeeContracts.findMany({
      where: {
        isRenewal: true,
        status: 'active',
        OR: [
          { employeeSignedAt: null },
          { managerSignedAt: null }
        ]
      },
      select: {
        id: true,
        contractNumber: true,
        employeeSignedAt: true,
        managerSignedAt: true,
        employees_employee_contracts_employeeIdToemployees: {
          select: { employeeNumber: true, fullName: true }
        }
      }
    });

    console.log(`Found ${unsignedRenewed.length} unsigned renewed contracts`);

    if (unsignedRenewed.length === 0) {
      console.log('No unsigned renewed contracts to fix');
      await prisma.$disconnect();
      return;
    }

    // Update them to be signed
    const now = new Date();
    for (const contract of unsignedRenewed) {
      const employee = contract.employees_employee_contracts_employeeIdToemployees;
      console.log(`Signing contract ${contract.contractNumber} for ${employee?.employeeNumber} - ${employee?.fullName}`);

      await prisma.employeeContracts.update({
        where: { id: contract.id },
        data: {
          employeeSignedAt: contract.employeeSignedAt || now,
          managerSignedAt: contract.managerSignedAt || now
        }
      });
    }

    console.log(`Successfully signed ${unsignedRenewed.length} renewed contracts`);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error signing renewed contracts:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixUnsignedRenewedContracts();
