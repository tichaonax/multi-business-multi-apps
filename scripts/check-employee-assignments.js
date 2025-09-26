const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmployee() {
  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeNumber: 'EMP000002' },
      include: {
        employeeBusinessAssignments: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        employeeContracts: {
          where: { status: 'active' },
          select: {
            id: true,
            businessAssignments: true,
            pdfGenerationData: true
          }
        }
      }
    });

    if (employee) {
      console.log('=== EMPLOYEE EMP000002 DATA ===');
      console.log('Employee ID:', employee.id);
      console.log('Full Name:', employee.fullName);
      console.log('Primary Business ID:', employee.primaryBusinessId);

      console.log('\n=== BUSINESS ASSIGNMENTS ===');
      console.log('Number of assignments:', employee.employeeBusinessAssignments?.length || 0);
      employee.employeeBusinessAssignments?.forEach((assignment, index) => {
        console.log(`Assignment ${index + 1}:`);
        console.log('  Business ID:', assignment.businessId);
        console.log('  Business Name:', assignment.business?.name);
        console.log('  Business Type:', assignment.business?.type);
        console.log('  Is Primary:', assignment.isPrimary);
        console.log('  Role:', assignment.role);
        console.log('  Start Date:', assignment.startDate);
        console.log('');
      });

      console.log('=== ACTIVE CONTRACTS ===');
      console.log('Number of active contracts:', employee.employeeContracts?.length || 0);
      employee.employeeContracts?.forEach((contract, index) => {
        console.log(`Contract ${index + 1}:`);
        console.log('  Contract ID:', contract.id);
        console.log('  Business Assignments in Contract:', contract.businessAssignments);
        console.log('  Has PDF Generation Data:', !!contract.pdfGenerationData);
        console.log('');
      });
    } else {
      console.log('Employee EMP000002 not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmployee();