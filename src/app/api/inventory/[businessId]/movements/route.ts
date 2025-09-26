import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

interface StockMovement {
  id: string
  businessId: string
  itemId: string
  itemName: string
  itemSku: string
  movementType: 'receive' | 'use' | 'waste' | 'adjustment' | 'transfer' | 'return'
  quantity: number
  unit: string
  unitCost?: number
  totalCost?: number
  previousStock: number
  newStock: number
  reason?: string
  notes?: string
  employeeId?: string
  employeeName?: string
  supplierId?: string
  supplierName?: string
  referenceNumber?: string
  batchNumber?: string
  expirationDate?: string
  location?: string
  createdAt: string
}

// Mock stock movements data
const mockStockMovements: Record<string, StockMovement[]> = {
  'restaurant-demo': [
    {
      id: 'mov-rest-001',
      businessId: 'restaurant-demo',
      itemId: 'inv-rest-001',
      itemName: 'Ground Beef 80/20',
      itemSku: 'PROT-BEEF-001',
      movementType: 'receive',
      quantity: 20,
      unit: 'lbs',
      unitCost: 6.99,
      totalCost: 139.80,
      previousStock: 5.5,
      newStock: 25.5,
      reason: 'Weekly delivery',
      notes: 'Fresh delivery from Prime Meats',
      employeeName: 'Chef Maria',
      supplierName: 'Prime Meats Inc.',
      referenceNumber: 'PO-2024-0914-001',
      batchNumber: 'PM240913',
      expirationDate: '2024-09-17',
      location: 'Walk-in Cooler A2',
      createdAt: '2024-09-14T08:30:00Z'
    },
    {
      id: 'mov-rest-002',
      businessId: 'restaurant-demo',
      itemId: 'inv-rest-001',
      itemName: 'Ground Beef 80/20',
      itemSku: 'PROT-BEEF-001',
      movementType: 'use',
      quantity: -10,
      unit: 'lbs',
      previousStock: 25.5,
      newStock: 15.5,
      reason: 'Burger prep',
      notes: 'Used for lunch burger patties',
      employeeName: 'Prep Cook John',
      location: 'Kitchen Prep Station',
      createdAt: '2024-09-14T11:15:00Z'
    },
    {
      id: 'mov-rest-003',
      businessId: 'restaurant-demo',
      itemId: 'inv-rest-002',
      itemName: 'Roma Tomatoes',
      itemSku: 'VEG-TOM-001',
      movementType: 'receive',
      quantity: 15,
      unit: 'lbs',
      unitCost: 2.49,
      totalCost: 37.35,
      previousStock: 3.2,
      newStock: 18.2,
      reason: 'Daily delivery',
      notes: 'Fresh produce delivery',
      employeeName: 'Receiving Clerk',
      supplierName: 'Green Fields Produce',
      referenceNumber: 'PO-2024-0914-002',
      location: 'Produce Cooler C1',
      createdAt: '2024-09-14T07:45:00Z'
    },
    {
      id: 'mov-rest-004',
      businessId: 'restaurant-demo',
      itemId: 'inv-rest-002',
      itemName: 'Roma Tomatoes',
      itemSku: 'VEG-TOM-001',
      movementType: 'use',
      quantity: -10,
      unit: 'lbs',
      previousStock: 18.2,
      newStock: 8.2,
      reason: 'Prep for salads and burgers',
      notes: 'Daily prep usage',
      employeeName: 'Prep Cook John',
      location: 'Kitchen Prep Station',
      createdAt: '2024-09-14T10:30:00Z'
    },
    {
      id: 'mov-rest-005',
      businessId: 'restaurant-demo',
      itemId: 'inv-rest-003',
      itemName: 'Mozzarella Cheese',
      itemSku: 'DAIRY-MOZ-001',
      movementType: 'waste',
      quantity: -2,
      unit: 'lbs',
      unitCost: 4.99,
      totalCost: 9.98,
      previousStock: 14,
      newStock: 12,
      reason: 'Expired',
      notes: 'Past expiration date, disposed properly',
      employeeName: 'Chef Maria',
      location: 'Dairy Cooler B1',
      createdAt: '2024-09-14T09:00:00Z'
    },
    {
      id: 'mov-rest-006',
      businessId: 'restaurant-demo',
      itemId: 'inv-rest-001',
      itemName: 'Ground Beef 80/20',
      itemSku: 'PROT-BEEF-001',
      movementType: 'adjustment',
      quantity: 0,
      unit: 'lbs',
      previousStock: 15.5,
      newStock: 15.5,
      reason: 'Physical count verification',
      notes: 'Weekly inventory count - no discrepancy',
      employeeName: 'Manager Sarah',
      location: 'Walk-in Cooler A2',
      createdAt: '2024-09-14T18:00:00Z'
    }
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    // Query parameters
    const itemId = searchParams.get('itemId')
    const movementType = searchParams.get('movementType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeName = searchParams.get('employeeName')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get movements for the business
    let movements = mockStockMovements[businessId] || []

    // Apply filters
    if (itemId) {
      movements = movements.filter(mov => mov.itemId === itemId)
    }

    if (movementType) {
      movements = movements.filter(mov => mov.movementType === movementType)
    }

    if (startDate) {
      movements = movements.filter(mov => mov.createdAt >= startDate)
    }

    if (endDate) {
      movements = movements.filter(mov => mov.createdAt <= endDate)
    }

    if (employeeName) {
      movements = movements.filter(mov =>
        mov.employeeName?.toLowerCase().includes(employeeName.toLowerCase())
      )
    }

    // Sort by date (newest first)
    movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedMovements = movements.slice(startIndex, endIndex)

    // Calculate summary statistics
    const summary = {
      totalMovements: movements.length,
      byType: {
        receive: movements.filter(m => m.movementType === 'receive').length,
        use: movements.filter(m => m.movementType === 'use').length,
        waste: movements.filter(m => m.movementType === 'waste').length,
        adjustment: movements.filter(m => m.movementType === 'adjustment').length,
        transfer: movements.filter(m => m.movementType === 'transfer').length,
        return: movements.filter(m => m.movementType === 'return').length
      },
      totalValue: movements
        .filter(m => m.totalCost)
        .reduce((sum, m) => sum + (m.totalCost || 0), 0),
      wasteValue: movements
        .filter(m => m.movementType === 'waste' && m.totalCost)
        .reduce((sum, m) => sum + (m.totalCost || 0), 0)
    }

    return NextResponse.json({
      movements: paginatedMovements,
      pagination: {
        page,
        limit,
        total: movements.length,
        totalPages: Math.ceil(movements.length / limit)
      },
      summary,
      filters: {
        itemId,
        movementType,
        startDate,
        endDate,
        employeeName
      }
    })

  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['itemId', 'itemName', 'itemSku', 'movementType', 'quantity', 'unit', 'previousStock', 'newStock']
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Create new stock movement
    const newMovement: StockMovement = {
      id: `mov-${businessId}-${Date.now()}`,
      businessId,
      itemId: body.itemId,
      itemName: body.itemName,
      itemSku: body.itemSku,
      movementType: body.movementType,
      quantity: parseFloat(body.quantity),
      unit: body.unit,
      unitCost: body.unitCost ? parseFloat(body.unitCost) : undefined,
      totalCost: body.totalCost ? parseFloat(body.totalCost) : undefined,
      previousStock: parseFloat(body.previousStock),
      newStock: parseFloat(body.newStock),
      reason: body.reason || '',
      notes: body.notes || '',
      employeeName: body.employeeName || '',
      supplierName: body.supplierName || '',
      referenceNumber: body.referenceNumber || '',
      batchNumber: body.batchNumber || '',
      expirationDate: body.expirationDate || '',
      location: body.location || '',
      createdAt: new Date().toISOString()
    }

    // Add to mock database
    if (!mockStockMovements[businessId]) {
      mockStockMovements[businessId] = []
    }
    mockStockMovements[businessId].unshift(newMovement) // Add to beginning for newest first

    return NextResponse.json({
      message: 'Stock movement recorded successfully',
      movement: newMovement
    }, { status: 201 })

  } catch (error) {
    console.error('Error recording stock movement:', error)
    return NextResponse.json(
      { error: 'Failed to record stock movement' },
      { status: 500 }
    )
  }
}