const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run(employeeNumber) {
  try {
    const employees = await prisma.employees.findMany({
      where: { employeeNumber: employeeNumber },
      take: 50,
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
      select: {
        id: true,
        employeeNumber: true,
        fullName: true,
        email: true,
        isActive: true,
        jobTitles: {
          select: { title: true, department: true }
        },
        businesses: { select: { name: true, type: true } },
        employee_contracts_employee_contracts_employeeIdToemployees: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            contractNumber: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            baseSalary: true,
            contract_benefits: {
              select: { amount: true, isPercentage: true, notes: true, benefitType: { select: { id: true, name: true } } }
            },
            pdfGenerationData: true,
            isRenewal: true,
            renewalCount: true
          }
        }
      }
    })

    const transformed = employees.map(employee => ({
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      email: employee.email,
      isActive: employee.isActive,
      jobTitle: employee.jobTitles?.title,
      department: employee.jobTitles?.department,
      businessName: employee.businesses?.name,
      businessType: employee.businesses?.type,
      latestContract: (() => {
        const c = (employee.employee_contracts_employee_contracts_employeeIdToemployees?.[0] || null)
        if (!c) return null
        if ((Array.isArray(c.contract_benefits) && c.contract_benefits.length > 0) || !c.pdfGenerationData) return c
        const pd = c.pdfGenerationData || {}
        return { ...c, contract_benefits: (pd.benefits || []).map(b => ({ id: null, amount: b.amount, isPercentage: !!b.isPercentage, notes: b.notes || null, benefitType: { id: null, name: b.name || (b.benefitType && b.benefitType.name) || null } })) }
      })(),
      contracts: (employee.employee_contracts_employee_contracts_employeeIdToemployees || []).map(c => {
        if (Array.isArray(c.contract_benefits) && c.contract_benefits.length > 0) return c
        const pd = c.pdfGenerationData || {}
        if (pd && Array.isArray(pd.benefits) && pd.benefits.length > 0) {
          return { ...c, contract_benefits: pd.benefits.map(b => ({ id: null, amount: b.amount, isPercentage: !!b.isPercentage, notes: b.notes || null, benefitType: { id: null, name: b.name || (b.benefitType && b.benefitType.name) || null } })) }
        }
        return c
      })
    }))

    console.log(JSON.stringify(transformed, null, 2))
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const emp = process.argv[2] || 'EMP1007'
  run(emp)
}

module.exports = { run }
