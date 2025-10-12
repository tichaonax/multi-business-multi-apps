// Smoke script to mirror the GET logic in the employee route and print the formatted result
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run(employeeId) {
  await prisma.$connect()
  try {
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        users: { select: { id: true, name: true, email: true, isActive: true } },
        jobTitles: true,
        compensationTypes: true,
        businesses: { select: { id: true, name: true, type: true } },
        idFormatTemplates: true,
        driverLicenseTemplates: true,
        // generated relation name for employee contracts
        employee_contracts_employee_contracts_employeeIdToemployees: {
          include: {
            businesses_employee_contracts_primaryBusinessIdTobusinesses: { select: { id: true, name: true, type: true } },
            jobTitles: { select: { id: true, title: true, department: true } },
            employees_employee_contracts_supervisorIdToemployees: { select: { id: true, fullName: true } },
            contract_benefits: { include: { benefitType: { select: { name: true, type: true } } } }
          },
          orderBy: { createdAt: 'desc' }
        },
        // supervisor relation on employee is `employees`
        employees: { select: { id: true, fullName: true, jobTitles: { select: { title: true } } } },
        // subordinates are `otherEmployees`
        otherEmployees: { select: { id: true, fullName: true, jobTitles: { select: { title: true } } } },
        employee_business_assignments: { include: { businesses: { select: { id: true, name: true, type: true } } } },
        disciplinary_actions_disciplinary_actions_employeeIdToemployees: { select: { id: true, actionType: true, violationType: true, title: true, description: true, incidentDate: true, actionDate: true, severity: true, isActive: true } },
        _count: { select: { otherEmployees: true, disciplinary_actions_disciplinary_actions_employeeIdToemployees: true } }
      }
    })

    if (!employee) return console.log('Employee not found')

    const e = employee
    const formattedEmployee = {
      ...e,
      user: e.users,
      jobTitle: Array.isArray(e.jobTitles) ? e.jobTitles[0] : e.jobTitles,
      compensationType: Array.isArray(e.compensationTypes) ? e.compensationTypes[0] : e.compensationTypes,
      primaryBusiness: e.businesses || e.primaryBusiness || null,
  supervisor: e.employees || null,
  subordinates: e.otherEmployees || e.subordinates || [],
  contracts: (e.employee_contracts_employee_contracts_employeeIdToemployees || e.employeeContracts || []).map(contract => ({
        id: contract.id,
        contractNumber: contract.contractNumber,
        version: contract.version,
        status: contract.status,
        employeeSignedAt: contract.employeeSignedAt,
        startDate: contract.startDate,
        endDate: contract.endDate,
        baseSalary: contract.baseSalary,
        isCommissionBased: contract.isCommissionBased,
        isSalaryBased: contract.isSalaryBased,
        notes: contract.notes,
        createdAt: contract.createdAt,
        benefits: (contract.contract_benefits || contract.contractBenefits || []).map(benefit => ({
          id: benefit.id,
          amount: benefit.amount,
          isPercentage: benefit.isPercentage,
          notes: benefit.notes,
          benefitType: { name: benefit.benefitType.name, type: benefit.benefitType.type }
        })) || []
      })) || [],
      businessAssignments: (e.employee_business_assignments || e.employeeBusinessAssignments || []).map(a => ({ business: a.businesses || a.business, role: a.role, isActive: a.isActive, assignedAt: a.assignedAt })) || [],
      disciplinaryActions: (e.disciplinary_actions_disciplinary_actions_employeeIdToemployees || e.disciplinaryActionsReceived || []).map(a => ({ id: a.id, type: a.actionType, severity: a.severity, description: a.description, actionTaken: a.title, actionDate: a.actionDate, followUpDate: null, isResolved: a.isActive })) || [],
      _count: e._count || { subordinates: 0, disciplinaryActions: 0 }
    }

    // salary calc (simple)
  const activeContract = ((e.employee_contracts_employee_contracts_employeeIdToemployees || e.employeeContracts || [])).find(c => c.status === 'active')
    if (activeContract) {
      let frequency = e.compensationTypes?.frequency || 'monthly'
      if (activeContract.notes) {
        const m = activeContract.notes.match(/\[SALARY_FREQUENCY:(monthly|annual)\]/)
        if (m) frequency = m[1]
      }
      const base = Number(activeContract.baseSalary || 0)
      let annual, monthly
      if (frequency === 'monthly') { annual = base * 12; monthly = base } else { annual = base; monthly = base / 12 }
      const totalBenefits = (activeContract.contractBenefits || []).reduce((t,b) => {
        const amt = Number(b.amount || 0)
        if (b.isPercentage) return t + (monthly * amt / 100)
        return t + amt
      }, 0)
      formattedEmployee.currentSalary = { frequency, baseSalary: base, annualSalary: annual, monthlySalary: monthly }
      formattedEmployee.totalBenefits = totalBenefits
      formattedEmployee.monthlyRemuneration = monthly + totalBenefits
      formattedEmployee.totalRemuneration = (monthly + totalBenefits) * 12
    }

    console.log(JSON.stringify(formattedEmployee, null, 2))
  } catch (err) {
    console.error('SMOKE ERROR', err && err.message ? err.message : err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const id = process.argv[2] || 'd4ea183a-a518-4e90-b463-9d5ae3ac6a47'
  run(id)
}
