import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * PATCH /api/expense-account/lenders/[lenderId]
 * Update a lender (name, phone, email, notes, isActive)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lenderId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { lenderId } = await params
    const body = await request.json()
    const { name, lenderType, phone, email, notes, isActive } = body

    const existing = await prisma.expenseAccountLenders.findUnique({ where: { id: lenderId } })
    if (!existing) return NextResponse.json({ error: 'Lender not found' }, { status: 404 })

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (lenderType !== undefined) updateData.lenderType = lenderType
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive

    const lender = await prisma.expenseAccountLenders.update({
      where: { id: lenderId },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: { lender } })
  } catch (error) {
    console.error('Error updating lender:', error)
    return NextResponse.json({ error: 'Failed to update lender' }, { status: 500 })
  }
}
