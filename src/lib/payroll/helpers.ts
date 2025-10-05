import { prisma } from '@/lib/prisma'

// Count working days (Mon-Fri) for a given year/month (month 1-12)
export function getWorkingDaysInMonth(year: number, month: number) {
    // month is 1-based
    const daysInMonth = new Date(year, month, 0).getDate()
    let count = 0
    for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, month - 1, d)
        const day = dt.getDay()
        if (day !== 0 && day !== 6) count++
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
        persistedBenefits = await prisma.payrollEntryBenefit.findMany({
            where: { payrollEntryId: entryId },
            include: { benefitType: true }
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
        const n = normalizeName(obj.benefitName || obj.name || obj.benefitType?.name || '')
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
        const name = pb.benefitName || pb.benefitType?.name || ''

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
    const entry = await prisma.payrollEntry.findUnique({
        where: { id: entryId },
        include: { employee: true }
    })

    if (!entry) return { grossPay: 0, netPay: 0, benefitsTotal: 0 }

    const { combined, benefitsTotal } = await computeCombinedBenefitsForEntry(entry)

    const baseSalary = Number(entry.baseSalary ?? 0)
    const commission = Number(entry.commission ?? 0)
    const overtimePay = Number((entry as any).overtimePay ?? 0)
    const adjustmentsTotal = Number((entry as any).adjustmentsTotal ?? 0)
    const totalDeductions = Number(entry.totalDeductions ?? 0)

    const grossPay = baseSalary + commission + overtimePay + benefitsTotal + adjustmentsTotal
    const netPay = grossPay - totalDeductions

    return { grossPay, netPay, benefitsTotal, combined }
}
