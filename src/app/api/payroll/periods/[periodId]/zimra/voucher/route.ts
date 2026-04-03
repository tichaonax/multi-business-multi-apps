import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import puppeteer from 'puppeteer'
import { generateZimraVoucherHTML, ZimraVoucherData } from '@/lib/payroll/zimra-voucher-generator'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/payroll/periods/[periodId]/zimra/voucher
 * Generates a ZIMRA remittance voucher PDF (PAYE P2 + NSSA) for the period.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            shortName: true,
            address: true,
            umbrellaBusinessRegistration: true,
            umbrellaBusinessName: true,
            umbrellaBusinessAddress: true,
          },
        },
        payroll_entries: {
          select: {
            id: true,
            baseSalary: true,
            grossPay: true,
            nssaEmployee: true,
            nssaEmployer: true,
            payeAmount: true,
            aidsLevy: true,
          },
        },
      },
    })

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    const entries = period.payroll_entries
    const biz = period.businesses

    // Fetch the umbrella business record for the correct name, address, and phone
    const umbrellaBiz = await prisma.businesses.findFirst({
      where: { isUmbrellaBusiness: true } as any,
      select: { umbrellaBusinessName: true, umbrellaBusinessAddress: true, umbrellaBusinessPhone: true, umbrellaBusinessRegistration: true } as any,
    }) as { umbrellaBusinessName: string | null; umbrellaBusinessAddress: string | null; umbrellaBusinessPhone: string | null; umbrellaBusinessRegistration: string | null } | null

    // Aggregate totals from entries
    const totalRemuneration = entries.reduce((s, e) => s + Number(e.grossPay || e.baseSalary || 0), 0)
    const totalNssaEmployee = entries.reduce((s, e) => s + Number(e.nssaEmployee || 0), 0)
    const totalNssaEmployer = entries.reduce((s, e) => s + Number(e.nssaEmployer || 0), 0)
    const totalPaye = entries.reduce((s, e) => s + Number(e.payeAmount || 0), 0)
    const totalAidsLevy = entries.reduce((s, e) => s + Number(e.aidsLevy || 0), 0)
    const totalTaxDue = totalPaye + totalAidsLevy
    const grandTotal = totalNssaEmployee + totalNssaEmployer + totalTaxDue

    const data: ZimraVoucherData = {
      businessName: umbrellaBiz?.umbrellaBusinessName ?? biz.name,
      businessAddress: umbrellaBiz?.umbrellaBusinessAddress ?? biz.address ?? null,
      businessPhone: umbrellaBiz?.umbrellaBusinessPhone ?? null,
      businessRegistration: umbrellaBiz?.umbrellaBusinessRegistration ?? biz.umbrellaBusinessRegistration ?? null,
      umbrellaBusinessName: undefined,

      periodMonth: period.month,
      periodYear: period.year,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,

      employeeCount: entries.length,
      totalRemuneration,
      totalNssaEmployee,
      totalNssaEmployer,
      totalPaye,
      totalAidsLevy,
      totalTaxDue,
      grandTotal,

      generatedAt: new Date(),
    }

    const html = generateZimraVoucherHTML(data)

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: false,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ]
      const periodLabel = `${monthNames[period.month - 1]}-${period.year}`
      const bizLabel = biz.shortName || biz.name
      const fileName = `ZIMRA-voucher-${bizLabel}-${periodLabel}.pdf`

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (err: any) {
    console.error('[zimra/voucher] Error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to generate ZIMRA voucher' }, { status: 500 })
  }
}
