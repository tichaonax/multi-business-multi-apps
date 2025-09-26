import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Use the same mock data structure from the parent route
// In real implementation, this would use the same database
const mockInventoryItems: Record<string, any[]> = {
  'restaurant-demo': [
    {
      id: 'inv-rest-001',
      businessId: 'restaurant-demo',
      businessType: 'restaurant',
      name: 'Ground Beef 80/20',
      sku: 'PROT-BEEF-001',
      description: 'Fresh ground beef, 80% lean',
      category: 'Proteins',
      currentStock: 15.5,
      unit: 'lbs',
      costPrice: 6.99,
      sellPrice: 12.99,
      supplier: 'Prime Meats Inc.',
      location: 'Walk-in Cooler A2',
      isActive: true,
      createdAt: '2024-09-01T10:00:00Z',
      updatedAt: '2024-09-14T14:30:00Z',
      attributes: {
        allergens: [],
        preparationTime: 8,
        recipeYield: 4,
        expirationDays: 3,
        storageTemp: 'refrigerated'
      }
    }
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params

    // Find the specific item
    const items = mockInventoryItems[businessId] || []
    const item = items.find(item => item.id === itemId)

    if (!item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      item,
      // Include related data for detailed view
      relatedData: {
        recentMovements: [], // Stock movements history
        recipes: [], // Recipes using this ingredient
        suppliers: [], // Alternative suppliers
        analytics: {
          averageUsage: 0,
          turnoverRate: 0,
          costTrend: 'stable'
        }
      }
    })

  } catch (error) {
    console.error('Error fetching inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { businessId: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params
    const updates = await request.json()

    // Find and update the specific item
    const items = mockInventoryItems[businessId] || []
    const itemIndex = items.findIndex(item => item.id === itemId)

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Update item
    const updatedItem = {
      ...items[itemIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    mockInventoryItems[businessId][itemIndex] = updatedItem

    return NextResponse.json({
      message: 'Inventory item updated successfully',
      item: updatedItem
    })

  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { businessId: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params

    // Find and remove the specific item
    const items = mockInventoryItems[businessId] || []
    const itemIndex = items.findIndex(item => item.id === itemId)

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Remove item (or mark as inactive in real implementation)
    const deletedItem = items.splice(itemIndex, 1)[0]

    return NextResponse.json({
      message: 'Inventory item deleted successfully',
      item: deletedItem
    })

  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}