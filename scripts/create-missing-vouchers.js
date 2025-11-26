const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createMissingVouchers() {
  console.log('🔍 Finding payments without vouchers...\n')

  try {
    // Find all payments
    const payments = await prisma.payrollPayments.findMany({
      include: {
        payment_vouchers: true,
        employees: {
          select: {
            employeeNumber: true,
            fullName: true,
            firstName: true,
            lastName: true,
            nationalId: true,
          },
        },
      },
    })

    const paymentsWithoutVouchers = payments.filter(
      (p) => p.payment_vouchers.length === 0
    )

    console.log(`Found ${paymentsWithoutVouchers.length} payment(s) without vouchers`)

    if (paymentsWithoutVouchers.length === 0) {
      console.log('\n✅ All payments already have vouchers!')
      return
    }

    console.log('\n📝 Creating vouchers...\n')

    let created = 0
    let failed = 0

    for (const payment of paymentsWithoutVouchers) {
      try {
        // Generate voucher number
        const today = new Date(payment.paymentDate)
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')

        // Get count of vouchers created on this payment date
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))

        const todayCount = await prisma.payrollPaymentVouchers.count({
          where: {
            issuedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        })

        const seqNumber = String(todayCount + 1).padStart(4, '0')
        const voucherNumber = `PV-${dateStr}-${seqNumber}`

        // Create voucher
        await prisma.payrollPaymentVouchers.create({
          data: {
            paymentId: payment.id,
            voucherNumber,
            employeeNumber: payment.employees.employeeNumber,
            employeeName:
              payment.employees.fullName ||
              `${payment.employees.firstName} ${payment.employees.lastName}`,
            employeeNationalId: payment.employees.nationalId,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            issuedAt: new Date(),
            regenerationCount: 0,
          },
        })

        created++
        console.log(
          `  ✓ Created voucher ${voucherNumber} for ${payment.employees.fullName || payment.employees.firstName} ($${Number(payment.amount).toFixed(2)})`
        )
      } catch (error) {
        failed++
        console.error(
          `  ✗ Failed to create voucher for payment ${payment.id}:`,
          error.message
        )
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Successfully created: ${created}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📈 Total processed: ${paymentsWithoutVouchers.length}`)

    if (created > 0) {
      console.log('\n🎉 Vouchers created successfully!')
    }
  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createMissingVouchers()
