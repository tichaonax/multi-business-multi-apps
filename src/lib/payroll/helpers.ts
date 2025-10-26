import { prisma } from '@/lib/prisma'

// Count working days (Mon-Fri) for a given year/month (month 1-12)
export function getWorkingDaysInMonth(year: number, month: number) {
    // month is 1-based
    const daysInMonth = new Date(year, month, 0).getDate()
    let count = 0
    for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, month - 1, d)
        const day = dt.getDay()
        // Count Monday-Saturday as working days (exclude Sundays only) to match preview
        if (day !== 0) count++
    }
    return count
}

// Load persisted benefits for an entry and infer contract benefits that are not present.
export async function computeCombinedBenefitsForEntry(entry: any) {
    const entryId = entry.id
    const employeeId = entry.employeeId || entry.employee?.id

    // load persisted benefits
    let persistedBenefits: any[] = []
    try {
        persistedBenefits = await prisma.payrollEntryBenefits.findMany({
            where: { payrollEntryId: entryId },
            include: { benefit_types: true }
        })
    } catch (err) {
        // swallow - we'll continue with what we have
        persistedBenefits = []
    }

    // Build canonical merged benefits by preferring persisted overrides, matching by benefitTypeId
    // and falling back to normalized names. Each merged benefit will have:
    // { benefitTypeId, benefitName, amount, isActive, source }
    const normalizeName = (s?: string | null) => {
        if (!s) return ''
        try {
            return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
        } catch (e) {
            return String(s).trim().replace(/\s+/g, ' ').toLowerCase()
        }
    }

    const mergedByKey: Map<string, any> = new Map()

    // Helper to produce a stable key: prefer benefitTypeId when present, otherwise normalized name
    const keyFor = (obj: any) => {
        if (!obj) return ''
        if (obj.benefitTypeId) return String(obj.benefitTypeId)
        const n = normalizeName(obj.benefitName || obj.name || obj.benefit_types?.name || '')
        return n || ''
    }

    // NOTE: Do NOT seed merged list from contract here. This helper's responsibility is to
    // return the persisted/override/manual benefits for the given payroll entry. Contract
    // benefits should be combined with these persisted overrides by the caller when an
    // effective merged view is required (so callers avoid double-including contract rows).

    // Apply persisted overrides and manual benefits
    for (const pb of persistedBenefits) {
        const k = keyFor(pb)
        const amount = Number(pb.amount || 0)
        const name = pb.benefitName || pb.benefit_types?.name || ''

        if (k && mergedByKey.has(k)) {
            // Override existing contract benefit
            const existing = mergedByKey.get(k)
            mergedByKey.set(k, {
                benefitTypeId: pb.benefitTypeId || existing.benefitTypeId || null,
                benefitName: name || existing.benefitName || '',
                amount: amount,
                isActive: pb.isActive,
                source: 'override',
                deactivatedReason: pb.deactivatedReason || null
            })
        } else {
            // New manual benefit: include only if active (but still return persisted list separately)
            mergedByKey.set(k || String(pb.id), {
                benefitTypeId: pb.benefitTypeId || null,
                benefitName: name,
                amount: amount,
                isActive: pb.isActive,
                source: 'manual',
                deactivatedReason: pb.deactivatedReason || null
            })
        }
    }

    const merged = Array.from(mergedByKey.values())
    const benefitsTotal = merged.filter(b => b.isActive !== false).reduce((s, b) => s + Number(b.amount || 0), 0)

    return { combined: merged, benefitsTotal }
}

// Compute gross/net for an entry by recomputing using components and combined benefits
export async function computeTotalsForEntry(entryId: string) {
    const entry = await prisma.payrollEntries.findUnique({
        where: { id: entryId },
        include: { employees: true }
    })

    if (!entry) return { grossPay: 0, netPay: 0, benefitsTotal: 0 }

    // Start with persisted/manual benefits
    const { combined, benefitsTotal: persistedBenefitsTotal } = await computeCombinedBenefitsForEntry(entry)

    // Attempt to include contract-level benefits and baseSalary when the entry does not
    // have them persisted. This keeps computeTotalsForEntry authoritative and consistent
    // with the period-level merging logic (persisted overrides win over contract values).
    let contract: any = null
    try {
        const empId = (entry as any).employees?.id || (entry as any).employeeId
        if (empId) {
            contract = await prisma.employeeContracts.findFirst({ where: { employeeId: empId }, orderBy: { startDate: 'desc' } })
        }
    } catch (err) {
        contract = null
    }

    // Build contract-derived benefits (if any)
    const contractBenefits: any[] = []
    if (contract && contract.pdfGenerationData && Array.isArray(contract.pdfGenerationData.benefits)) {
        for (const cb of contract.pdfGenerationData.benefits) {
            const amount = Number(cb.amount || 0)
            if (!amount || amount === 0) continue
            contractBenefits.push({
                benefitTypeId: cb.benefitTypeId || null,
                benefitName: cb.name || cb.benefit_types?.name || '',
                amount,
                source: 'contract'
            })
        }
    }

    // Merge contract benefits with persisted combined (persisted wins)
    const normalize = (s?: string | null) => {
        if (!s) return ''
        try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
    }
    const mergedByKey = new Map<string, any>()
    const keyFor = (x: any) => String(x.benefitTypeId || normalize(x.benefitName || x.name || ''))

    for (const cb of contractBenefits) {
        const k = keyFor(cb)
        mergedByKey.set(k, { ...cb, isActive: true })
    }

    for (const pb of combined) {
        const k = keyFor(pb) || String(pb.id || Math.random())
        mergedByKey.set(k, {
            id: pb.id,
            benefitTypeId: pb.benefitTypeId || null,
            benefitName: pb.benefitName || pb.name || '',
            amount: Number(pb.amount || 0),
            isActive: pb.isActive !== false,
            source: pb.source || 'manual'
        })
    }

    const mergedBenefits = Array.from(mergedByKey.values())
    const benefitsTotal = mergedBenefits.filter(b => b.isActive !== false).reduce((s, b) => s + Number(b.amount || 0), 0)

    // Determine base salary to use: prefer entry.baseSalary, then contract.baseSalary, then pdfGenerationData.basicSalary
    let baseSalary = Number(entry.baseSalary ?? 0)
    if ((!baseSalary || baseSalary === 0) && contract) {
        try {
            if (contract.baseSalary != null) {
                baseSalary = (typeof (contract.baseSalary as any).toNumber === 'function') ? (contract.baseSalary as any).toNumber() : Number(contract.baseSalary)
            } else if (contract.pdfGenerationData && contract.pdfGenerationData.basicSalary) {
                baseSalary = Number(contract.pdfGenerationData.basicSalary || 0)
            }
        } catch (e) {
            baseSalary = Number(contract.baseSalary || 0)
        }
    }

    const commission = Number(entry.commission ?? 0)

    // Compute overtimePay using dual overtime rates (standard 1.5x and double-time 2.0x)
    const standardOvertimeHours = Number((entry as any).standardOvertimeHours ?? 0)
    const doubleTimeOvertimeHours = Number((entry as any).doubleTimeOvertimeHours ?? 0)
    const oldOvertimeHours = Number((entry as any).overtimeHours ?? 0) // Legacy field for backward compatibility

    // Determine hourly rate preference: entry.hourlyRate > employee.hourlyRate > contract.pdfGenerationData.basicSalary (if compensationType indicates hourly) > derived from baseSalary
    let hourlyRate = Number((entry as any).hourlyRate ?? 0)
    if ((!hourlyRate || hourlyRate === 0) && (entry as any).employees && (entry as any).employees.hourlyRate) {
        hourlyRate = Number((entry as any).employees.hourlyRate || 0)
    }
    if ((!hourlyRate || hourlyRate === 0) && contract) {
        try {
            const compType = (contract.pdfGenerationData && contract.pdfGenerationData.compensationType) || ''
            const contractBasic = contract.pdfGenerationData && contract.pdfGenerationData.basicSalary ? Number(contract.pdfGenerationData.basicSalary || 0) : 0
            // If compensationType mentions 'hour' and contract basic salary is plausibly an hourly rate (<=200), use it as hourlyRate.
            if (typeof compType === 'string' && compType.toLowerCase().includes('hour') && contractBasic && contractBasic > 0 && contractBasic <= 200) {
                hourlyRate = contractBasic
            }
            // Otherwise, do NOT treat contract basicSalary as an hourly rate here; we'll fall back to deriving from monthly baseSalary later.
        } catch (e) {
            // ignore
        }
    }
    // Fallback: derive hourly rate from monthly baseSalary by annualizing then
    // dividing by total working hours per year. Business rule: 6 days/week × 9 hours/day × 52 weeks.
    // Example: monthly 800 -> annual 9600. hoursPerYear = 6*9*52 = 2808. hourlyRate = 9600 / 2808
    if ((!hourlyRate || hourlyRate === 0) && baseSalary) {
        try {
            const annualSalary = Number(baseSalary) * 12
            const hoursPerYear = 6 * 9 * 52 // 2808
            hourlyRate = annualSalary / Math.max(1, hoursPerYear)
        } catch (e) {
            // ignore
        }
    }

    // Calculate overtime using utility function for dual rates
    const { calculateTotalOvertimePay } = await import('@/lib/payroll/overtime-utils')
    let overtimePay = 0

    // Use new dual overtime fields if available, otherwise fall back to legacy single field
    if (standardOvertimeHours > 0 || doubleTimeOvertimeHours > 0) {
        overtimePay = calculateTotalOvertimePay(standardOvertimeHours, doubleTimeOvertimeHours, hourlyRate)
    } else if (oldOvertimeHours > 0 && hourlyRate > 0) {
        // Legacy calculation for backward compatibility
        overtimePay = Math.round(oldOvertimeHours * hourlyRate * 1.5 * 100) / 100
    }
    // Load payroll adjustments for this entry. Adjustments are stored as signed amounts.
    // Business rule: positive adjustments increase gross pay (additions). Negative adjustments
    // should NOT be subtracted from the gross; instead they are treated as deductions and
    // applied after taxes etc. (i.e., added to totalDeductions).
    let additionsTotal = 0
    let adjustmentsAsDeductions = 0
    let absenceDeduction = 0
    try {
        const adjustments = await prisma.payrollAdjustments.findMany({ where: { payrollEntryId: entryId } })
        for (const a of adjustments) {
            const amt = Number(a.amount || 0)
            if (amt >= 0) additionsTotal += amt
            else {
                const absAmt = Math.abs(amt)
                // Treat explicit 'absence' adjustments specially: expose as absenceDeduction
                const rawType = String(a.adjustmentType || '').toLowerCase()
                if (rawType === 'absence') {
                    absenceDeduction += absAmt
                    // Do NOT include absence in adjustmentsAsDeductions so it won't be double-counted
                } else {
                    adjustmentsAsDeductions += absAmt
                }
            }
        }
    } catch (err) {
        // ignore and treat as zero
        additionsTotal = 0
        adjustmentsAsDeductions = 0
    }

    // Exclude explicit absence adjustments from totalDeductions. Absence is returned separately
    // as `absenceDeduction` so callers can display it under Compensation Breakdown and subtract
    // it from gross for presentation without double-counting under Total Deductions.
    // Compute a derived total from component parts (advances, loans, misc + adjustmentsAsDeductions)
    // and prefer the derived value to avoid stale or already-aggregated DB values that can
    // cause double-counting when adjustments are also applied separately.
    const advances = Number(entry.advanceDeductions || 0)
    const loans = Number(entry.loanDeductions || 0)
    const misc = Number(entry.miscDeductions || 0)
    const derivedTotalDeductions = advances + loans + misc + adjustmentsAsDeductions
    const serverTotalDeductions = Number(entry.totalDeductions ?? 0)
    const totalDeductions = serverTotalDeductions === derivedTotalDeductions ? serverTotalDeductions : derivedTotalDeductions

    // Canonical payroll semantics (server authoritative):
    // - grossPay includes all earnings and is reduced for unearned absence amounts.
    // - totalDeductions are shown separately and NOT subtracted from net pay
    // - Net = Gross (deductions shown separately, NOT subtracted)
    // Compute gross as earnings minus absenceDeduction (so callers don't need to subtract again).
    const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal - absenceDeduction
    // Net = Gross (deductions shown separately, NOT subtracted)
    const netPay = grossPay

    return { grossPay, netPay, totalDeductions, benefitsTotal, mergedBenefits, combined, additionsTotal, adjustmentsAsDeductions, overtimePay, hourlyRate, absenceDeduction }
}
