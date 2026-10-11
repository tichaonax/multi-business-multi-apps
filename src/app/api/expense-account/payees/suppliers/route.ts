import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/expense-account/payees/suppliers
 * Create a new supplier payee with no business association — for expense
 * accounts (e.g. personal/petty-cash accounts) that aren't linked to a
 * specific business. Mirrors the business-scoped
 * POST /api/business/[businessId]/suppliers, but uses businessType
 * 'GENERAL' instead of a real business's type, so these suppliers dedupe
 * and share against each other rather than against any one business.
 *
 * Body: name (required), phone (required), notes (required),
 * email?, taxId?, address?, productsSupplied?, supplierType?, emoji?
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, email, taxId, address, productsSupplied, notes, supplierType, emoji } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
    }
    if (!phone || !String(phone).trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }
    if (!notes || !String(notes).trim()) {
      return NextResponse.json({ error: 'Notes are required — describe what this supplier provides' }, { status: 400 })
    }

    const trimmedName = String(name).trim()

    const existingSupplier = await prisma.businessSuppliers.findFirst({
      where: {
        businessType: 'GENERAL',
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    })
    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Duplicate supplier', message: `A supplier named "${trimmedName}" already exists.` },
        { status: 409 }
      )
    }

    const newId = randomUUID()
    const shortCode = newId.replace(/-/g, '').substring(0, 8).toUpperCase()
    const supplierNumber = `GEN-SUP-${shortCode}`

    const supplier = await prisma.businessSuppliers.create({
      data: {
        id: newId,
        businessId: null,
        supplierNumber,
        name: trimmedName,
        emoji: emoji || null,
        email: email?.trim() || null,
        phone: phone.trim(),
        taxId: taxId?.trim() || null,
        address: address?.trim() || null,
        productsSupplied: productsSupplied?.trim() || null,
        notes: notes.trim(),
        isActive: true,
        businessType: 'GENERAL',
        supplierType: supplierType || null,
        attributes: {},
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Supplier created successfully',
        data: {
          payee: {
            id: supplier.id,
            type: 'SUPPLIER',
            name: supplier.name,
            displayName: `${supplier.name} (${supplier.supplierNumber})`,
            identifier: supplier.supplierNumber,
            isActive: supplier.isActive,
            phone: supplier.phone,
            email: supplier.email,
            supplierType: supplier.supplierType,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating supplier payee:', error)
    return NextResponse.json({ error: 'Failed to create supplier payee' }, { status: 500 })
  }
}
