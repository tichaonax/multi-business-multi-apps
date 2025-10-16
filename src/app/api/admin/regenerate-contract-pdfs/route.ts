import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

function isAdmin(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false
  const maybeUser = (session as any).user
  return !!maybeUser && typeof maybeUser.role === 'string' && maybeUser.role === 'admin'
}

const SEEDED = ['EMP001','EMP002','EMP003','EMP004','EMP1009']

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdmin(session)) return NextResponse.json({ message: 'Admin access required' }, { status: 401 })

    // Use the contract service helper which will POST to the contracts API (when SEED_API_KEY + SEED_API_BASE_URL
    // are configured) or fall back to a DB create. That ensures the full application pipeline (including any
    // PDF generation hooks) runs the same way contracts are created in-app.
    const { createContractViaApiOrDb } = await import('@/lib/services/contract-service')

    if (!createContractViaApiOrDb) {
      return NextResponse.json({ error: 'Contract service unavailable' }, { status: 500 })
    }

    const employees = await prisma.employees.findMany({ where: { employeeNumber: { in: SEEDED } }, select: { id: true, fullName: true } })
    let regenerated = 0

    for (const emp of employees) {
      try {
        // Fetch latest contract for employee
        const latest = await prisma.employeeContracts.findFirst({ where: { employeeId: emp.id }, orderBy: { createdAt: 'desc' } })
        if (!latest) {
          console.warn('No contract found for', emp.id)
          continue
        }

  // Fetch benefits to include in payload (include benefitType relation)
  const benefits = await prisma.contractBenefits.findMany({ where: { contractId: latest.id }, include: { benefit_types: true } }).catch(() => [])

        // Helper: build pdfContractData server-side when missing
        const buildPdfContractData = async (contract: any) => {
          // Fetch related records
          const [employee, jobTitle, compensationType, business] = await Promise.all([
            prisma.employees.findUnique({ where: { id: contract.employeeId } }).catch(() => null),
            prisma.jobTitles.findUnique({ where: { id: contract.jobTitleId } }).catch(() => null),
            prisma.compensationTypes.findUnique({ where: { id: contract.compensationTypeId } }).catch(() => null),
            prisma.businesses.findUnique({ where: { id: contract.primaryBusinessId } }).catch(() => null)
          ])

          const mappedBenefits = benefits.map(b => ({
            name: b.benefitType?.name || null,
            amount: Number(b.amount),
            isPercentage: !!b.isPercentage,
            type: b.benefitType?.type || null,
            notes: b.notes || ''
          }))

          return {
            date: new Date().toISOString(),
            employeeName: employee?.fullName || contract.employeeName || '',
            employeeAddress: employee?.address || '',
            employeeAddressLine2: '',
            employeePhone: employee?.phone || '',
            employeeEmail: employee?.email || '',
            employeeNumber: employee?.employeeNumber || '',
            nationalId: employee?.nationalId || '',
            driverLicenseNumber: null,
            jobTitle: jobTitle?.title || '',
            department: jobTitle?.department || '',
            contractDuration: 'permanent',
            contractStartDate: contract.startDate ? contract.startDate.toISOString().split('T')[0] : '',
            contractEndDate: contract.endDate ? contract.endDate.toISOString().split('T')[0] : '',
            basicSalary: contract.baseSalary ? Number(contract.baseSalary) : 0,
            livingAllowance: 0,
            commission: 0,
            isCommissionBased: !!contract.isCommissionBased,
            isSalaryBased: contract.isSalaryBased !== false,
            compensationType: compensationType?.name || '',
            benefits: mappedBenefits,
            specialDuties: '',
            responsibilities: jobTitle?.responsibilities || [],
            customResponsibilities: contract.customResponsibilities || '',
            businessName: business?.name || '',
            businessType: business?.type || '',
            // business may not have explicit address/phone/email fields in the schema; cast to any and fall back
            businessAddress: (business as any)?.address || '',
            businessPhone: (business as any)?.phone || '',
            businessEmail: (business as any)?.email || '',
            businessRegistrationNumber: (business as any)?.registrationNumber || '',
            supervisorName: contract.supervisorName || '',
            supervisorTitle: contract.supervisorTitle || '',
            probationPeriodMonths: contract.probationPeriodMonths || undefined,
            contractNumber: contract.contractNumber || `CON-${employee?.employeeNumber || ''}-${new Date().getFullYear()}`,
            version: contract.version || 1,
            notes: contract.notes || '',
            umbrellaBusinessName: contract.umbrellaBusinessName || 'Demo Umbrella Company',
            umbrellaBusinessAddress: '',
            umbrellaBusinessPhone: '',
            umbrellaBusinessEmail: '',
            umbrellaBusinessRegistration: '',
            businessAssignments: contract.businessAssignments || []
          }
        }

        const payload: any = {
          jobTitleId: latest.jobTitleId,
          compensationTypeId: latest.compensationTypeId,
          baseSalary: latest.baseSalary ? String(latest.baseSalary) : undefined,
          startDate: latest.startDate ? latest.startDate.toISOString() : undefined,
          primaryBusinessId: latest.primaryBusinessId,
          supervisorId: latest.supervisorId || null,
          // Prefer existing pdfGenerationData, otherwise build one server-side so API receives full data
          pdfContractData: latest.pdfGenerationData ?? await buildPdfContractData(latest),
          umbrellaBusinessId: latest.umbrellaBusinessId || undefined,
          businessAssignments: latest.businessAssignments || undefined,
          contractBenefits: benefits.map(b => ({ benefitTypeId: b.benefitTypeId, amount: String(b.amount), isPercentage: !!b.isPercentage }))
        }

        // Call the helper which will POST to the in-app contracts API (when configured) or create via DB fallback
        await createContractViaApiOrDb(emp.id, payload)
        regenerated++
      } catch (err: any) {
        console.warn('Failed to regenerate contract for', emp.id, String(err))
      }
    }

    return NextResponse.json({ regenerated })
  } catch (err) {
    console.error('Error regenerating contract pdfs:', err)
    return NextResponse.json({ message: 'Failed', error: String(err) }, { status: 500 })
  }
}
