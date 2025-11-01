import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { transferEmployeesToBusiness } from '@/lib/employee-transfer-service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can transfer employees' },
        { status: 403 }
      )
    }

    const { id: sourceBusinessId } = await params
    const body = await req.json()
    const { targetBusinessId, employeeIds } = body

    if (!sourceBusinessId) {
      return NextResponse.json({ error: 'Missing source business id' }, { status: 400 })
    }

    if (!targetBusinessId) {
      return NextResponse.json({ error: 'Missing target business id' }, { status: 400 })
    }

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid employee ids' }, { status: 400 })
    }

    const result = await transferEmployeesToBusiness(
      sourceBusinessId,
      targetBusinessId,
      employeeIds,
      session.user.id
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ${result.transferredCount} employee(s)`,
      data: {
        transferredCount: result.transferredCount,
        contractRenewalsCreated: result.contractRenewalsCreated,
        businessAssignmentsUpdated: result.businessAssignmentsUpdated,
        employeeIds: result.employeeIds,
        auditLogId: result.auditLogId
      }
    })
  } catch (error) {
    console.error('Error transferring employees:', error)
    return NextResponse.json(
      { error: 'Failed to transfer employees' },
      { status: 500 }
    )
  }
}
