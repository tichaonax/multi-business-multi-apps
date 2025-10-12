const { randomUUID } = require('crypto')

/**
 * Find or create a development manager employee used as a stable supervisor
 * for seeded contracts when no real supervisor exists.
 * Accepts a Prisma client instance.
 */
async function getOrCreateDevManager(prisma) {
  // Look for a well-known seeded dev manager first
  const existing = await prisma.employees.findFirst({ where: { employeeNumber: 'DEV-MGR-1' } })
  if (existing) return existing

  // Find a business to assign
  const business = await prisma.businesses.findFirst()

  // Ensure a job title exists for the dev manager
  let jobTitle = await prisma.jobTitles.findFirst({ where: { title: 'Dev Manager' } })
  if (!jobTitle) {
    jobTitle = await prisma.jobTitles.create({ data: { title: 'Dev Manager', department: 'Development', level: 'Manager', isActive: true } })
  }

  // Find a compensation type or fallback
  let compensationType = await prisma.compensationTypes.findFirst()
  if (!compensationType) {
    compensationType = await prisma.compensationTypes.create({ data: { name: 'Dev Salary', type: 'salary' } })
  }

  const devMgrData = {
    id: randomUUID(),
    employeeNumber: 'DEV-MGR-1',
    firstName: 'Dev',
    lastName: 'Manager',
    fullName: 'Dev Manager',
    email: 'dev.manager@local',
    phone: null,
    dateOfBirth: new Date(1990,0,1),
    address: null,
    nationalId: `DEV-MGR-${Date.now()}`,
    hireDate: new Date(),
    employmentStatus: 'active',
    jobTitleId: jobTitle.id,
    compensationTypeId: compensationType.id,
    primaryBusinessId: business ? business.id : null,
    isActive: true,
    createdBy: 'seed-helper'
  }

  const created = await prisma.employees.create({ data: devMgrData })
  return created
}

module.exports = { getOrCreateDevManager }
