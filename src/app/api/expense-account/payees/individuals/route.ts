import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createIndividualPayee } from '@/lib/payee-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/expense-account/payees/individuals
 * Create new individual payee (Person record)
 *
 * Body:
 * - fullName: string (required)
 * - nationalId?: string (optional, must be unique if provided)
 * - phone?: string (optional)
 * - email?: string (optional)
 * - address?: string (optional)
 *
 * Returns newly created person as a payee
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = await getEffectivePermissions(session.user.id)
    if (!permissions.canCreateIndividualPayees) {
      return NextResponse.json(
        { error: 'You do not have permission to create individual payees' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { fullName, nationalId, phone, email, address } = body

    // Validate required fields
    if (!fullName || fullName.trim() === '') {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Validate national ID format if provided (basic validation)
    if (nationalId && nationalId.trim() !== '') {
      const trimmedId = nationalId.trim()
      // Check if it's numeric and has reasonable length (customize based on your requirements)
      if (!/^\d+$/.test(trimmedId)) {
        return NextResponse.json(
          { error: 'National ID must contain only numbers' },
          { status: 400 }
        )
      }
      if (trimmedId.length < 6 || trimmedId.length > 20) {
        return NextResponse.json(
          { error: 'National ID must be between 6 and 20 digits' },
          { status: 400 }
        )
      }
    }

    // Validate phone number format if provided (basic validation)
    if (phone && phone.trim() !== '') {
      const trimmedPhone = phone.trim()
      // Basic phone validation - adjust regex based on your requirements
      if (!/^[\d\s\-\+\(\)]+$/.test(trimmedPhone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        )
      }
    }

    // Validate email format if provided
    if (email && email.trim() !== '') {
      const trimmedEmail = email.trim()
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Create individual payee
    const result = await createIndividualPayee(
      {
        fullName: fullName.trim(),
        nationalId: nationalId?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
        address: address?.trim() || undefined,
      },
      session.user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create individual payee' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Individual payee created successfully',
        data: {
          payee: result.person,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating individual payee:', error)
    return NextResponse.json(
      { error: 'Failed to create individual payee' },
      { status: 500 }
    )
  }
}
