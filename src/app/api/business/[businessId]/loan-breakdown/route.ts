import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const user = session.user as SessionUser

    // Check permissions
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId,
          isActive: true
        }
      })
      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get loans where this business is the BORROWER
    const loansAsBorrower = await prisma.interBusinessLoans.findMany({
      where: {
        borrowerBusinessId: businessId
      },
      include: {
        businesses_inter_business_loans_lenderBusinessIdTobusinesses: {
          select: { name: true }
        },
        persons_lender: {
          select: { fullName: true }
        }
      },
      orderBy: { loanDate: 'desc' }
    })

    if (loansAsBorrower.length === 0) {
      return NextResponse.json({
        hasLoans: false,
        summary: null,
        loans: []
      })
    }

    // Calculate summary
    const activeLoans = loansAsBorrower.filter(l => l.status === 'active')
    const totalPrincipalReceived = loansAsBorrower.reduce((sum, l) => sum + Number(l.principalAmount), 0)
    const totalInterestAccrued = loansAsBorrower.reduce((sum, l) => {
      const interest = Number(l.totalAmount) - Number(l.principalAmount)
      return sum + interest
    }, 0)
    const totalOutstanding = activeLoans.reduce((sum, l) => sum + Number(l.remainingBalance), 0)

    // Format loans for response
    const loans = loansAsBorrower.map(loan => {
      let lenderName = 'Unknown'
      let lenderType: 'business' | 'bank' | 'individual' = loan.lenderType as 'business' | 'bank' | 'individual'

      if (loan.lenderType === 'business' && loan.businesses_inter_business_loans_lenderBusinessIdTobusinesses) {
        lenderName = loan.businesses_inter_business_loans_lenderBusinessIdTobusinesses.name
      } else if (loan.persons_lender) {
        lenderName = loan.persons_lender.fullName
      }

      const principal = Number(loan.principalAmount)
      const total = Number(loan.totalAmount)
      const interestAmount = total - principal

      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        lenderName,
        lenderType,
        principalAmount: principal,
        interestRate: Number(loan.interestRate),
        interestAmount,
        totalAmount: total,
        remainingBalance: Number(loan.remainingBalance),
        loanDate: loan.loanDate?.toISOString().split('T')[0] || null,
        dueDate: loan.dueDate?.toISOString().split('T')[0] || null,
        status: loan.status
      }
    })

    return NextResponse.json({
      hasLoans: true,
      summary: {
        totalLoansReceived: totalPrincipalReceived,
        totalInterestAccrued,
        totalOutstanding,
        activeLoansCount: activeLoans.length,
        totalLoansCount: loansAsBorrower.length
      },
      loans
    })
  } catch (error) {
    console.error('Loan breakdown fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loan breakdown' },
      { status: 500 }
    )
  }
}
