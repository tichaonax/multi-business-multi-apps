/**
 * Sign all active unsigned contracts
 *
 * This script finds all contracts with status 'active' but missing employee or manager signatures
 * and auto-signs them. This is useful for fixing seed data or contracts that were created
 * without proper signatures.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function signActiveUnsignedContracts() {
  try {
    // Find all active contracts that are not fully signed
    const unsignedActive = await prisma.employeeContract.findMany({
      where: {
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
        isRenewal: true,
        employees_employee_contracts_employeeIdToemployees: {
          select: { employeeNumber: true, fullName: true }
        }
      }
    });

    console.log(`Found ${unsignedActive.length} active unsigned contracts`);

    if (unsignedActive.length === 0) {
      console.log('No active unsigned contracts to fix');
      await prisma.$disconnect();
      return;
    }

    console.log('\nContracts to be signed:');
    unsignedActive.forEach((c, i) => {
      const employee = c.employees_employee_contracts_employeeIdToemployees;
      console.log(`  ${i + 1}. ${c.contractNumber} - ${employee?.employeeNumber} ${employee?.fullName} ${c.isRenewal ? '(Renewed)' : ''}`);
    });

    // Update them to be signed
    const now = new Date();
    console.log('\nSigning contracts...');

    for (const contract of unsignedActive) {
      const employee = contract.employees_employee_contracts_employeeIdToemployees;

      await prisma.employeeContract.update({
        where: { id: contract.id },
        data: {
          employeeSignedAt: contract.employeeSignedAt || now,
          managerSignedAt: contract.managerSignedAt || now
        }
      });

      console.log(`  ✓ Signed ${contract.contractNumber} for ${employee?.employeeNumber}`);
    }

    console.log(`\n✅ Successfully signed ${unsignedActive.length} active contracts`);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error signing contracts:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

signActiveUnsignedContracts();
