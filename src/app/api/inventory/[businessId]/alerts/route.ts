import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface InventoryAlert {
  id: string
  businessId: string
  alertType: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'overstock' | 'price_change'
  priority: 'critical' | 'high' | 'medium' | 'low'
  itemId: string
  itemName: string
  itemSku: string
  category: string
  currentStock: number
  threshold?: number
  unit: string
  message: string
  actionRequired: string
  value?: number
  expirationDate?: string
  daysUntilExpiration?: number
  isAcknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  createdAt: string
  updatedAt: string
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    // Query parameters
    const alertType = searchParams.get('alertType')
    const priority = searchParams.get('priority')
    const acknowledged = searchParams.get('acknowledged')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // For now, return empty alerts array until inventory items are set up
    let alerts: InventoryAlert[] = []

    try {
      // Try to get basic products without complex relationships
      const products = await prisma.businessProduct.findMany({
        where: {
          businessId,
          isActive: true
        },
        take: 10 // Limit to avoid performance issues
      })

      // Generate simple demo alerts if products exist
      products.forEach((product, index) => {
        if (index < 3) { // Only create a few demo alerts
          alerts.push({
            id: `alert-${product.id}-demo`,
            businessId,
            alertType: 'low_stock',
            priority: 'medium',
            itemId: product.id,
            itemName: product.name,
            itemSku: product.sku || '',
            category: 'General',
            currentStock: 5,
            threshold: 10,
            unit: 'units',
            message: `${product.name} stock is running low`,
            actionRequired: 'Consider reordering soon',
            value: 50,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
      })
    } catch (dbError) {
      console.log('Database query failed for alerts, returning empty:', dbError)
      alerts = []
    }

    // Apply filters
    if (alertType) {
      alerts = alerts.filter(alert => alert.alertType === alertType)
    }

    if (priority) {
      alerts = alerts.filter(alert => alert.priority === priority)
    }

    if (acknowledged !== null) {
      const isAcknowledged = acknowledged === 'true'
      alerts = alerts.filter(alert => alert.isAcknowledged === isAcknowledged)
    }

    if (category) {
      alerts = alerts.filter(alert =>
        alert.category.toLowerCase().includes(category.toLowerCase())
      )
    }

    // Sort by priority (critical first) then by creation date (newest first)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    alerts.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedAlerts = alerts.slice(startIndex, endIndex)

    // Calculate summary statistics
    const summary = {
      total: alerts.length,
      unacknowledged: alerts.filter(a => !a.isAcknowledged).length,
      byPriority: {
        critical: alerts.filter(a => a.priority === 'critical').length,
        high: alerts.filter(a => a.priority === 'high').length,
        medium: alerts.filter(a => a.priority === 'medium').length,
        low: alerts.filter(a => a.priority === 'low').length
      },
      byType: {
        lowStock: alerts.filter(a => a.alertType === 'low_stock').length,
        outOfStock: alerts.filter(a => a.alertType === 'out_of_stock').length,
        expiringSoon: alerts.filter(a => a.alertType === 'expiring_soon').length,
        expired: alerts.filter(a => a.alertType === 'expired').length,
        overstock: alerts.filter(a => a.alertType === 'overstock').length,
        priceChange: alerts.filter(a => a.alertType === 'price_change').length
      },
      totalValue: alerts
        .filter(a => a.value)
        .reduce((sum, a) => sum + (a.value || 0), 0)
    }

    return NextResponse.json({
      alerts: paginatedAlerts,
      pagination: {
        page,
        limit,
        total: alerts.length,
        totalPages: Math.ceil(alerts.length / limit)
      },
      summary,
      filters: {
        alertType,
        priority,
        acknowledged,
        category
      }
    })

  } catch (error) {
    console.error('Error fetching inventory alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory alerts' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    // For acknowledging alerts
    if (body.action === 'acknowledge') {
      const { alertIds } = body

      if (!alertIds || !Array.isArray(alertIds)) {
        return NextResponse.json(
          { error: 'Alert IDs array is required for acknowledgment' },
          { status: 400 }
        )
      }

      // Update alerts in mock database
      const alerts = mockAlerts[businessId] || []
      let acknowledgedCount = 0

      for (const alertId of alertIds) {
        const alertIndex = alerts.findIndex(alert => alert.id === alertId)
        if (alertIndex !== -1) {
          alerts[alertIndex] = {
            ...alerts[alertIndex],
            isAcknowledged: true,
            acknowledgedBy: session.user.name || 'Unknown',
            acknowledgedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          acknowledgedCount++
        }
      }

      return NextResponse.json({
        message: `${acknowledgedCount} alerts acknowledged successfully`,
        acknowledgedCount
      })
    }

    // For creating new alerts (system-generated or manual)
    const requiredFields = ['alertType', 'priority', 'itemId', 'itemName', 'itemSku', 'category', 'currentStock', 'unit', 'message', 'actionRequired']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Create new alert
    const newAlert: InventoryAlert = {
      id: `alert-${businessId}-${Date.now()}`,
      businessId,
      alertType: body.alertType,
      priority: body.priority,
      itemId: body.itemId,
      itemName: body.itemName,
      itemSku: body.itemSku,
      category: body.category,
      currentStock: parseFloat(body.currentStock),
      threshold: body.threshold ? parseFloat(body.threshold) : undefined,
      unit: body.unit,
      message: body.message,
      actionRequired: body.actionRequired,
      value: body.value ? parseFloat(body.value) : undefined,
      expirationDate: body.expirationDate,
      daysUntilExpiration: body.daysUntilExpiration ? parseInt(body.daysUntilExpiration) : undefined,
      isAcknowledged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Add to mock database
    if (!mockAlerts[businessId]) {
      mockAlerts[businessId] = []
    }
    mockAlerts[businessId].unshift(newAlert) // Add to beginning for newest first

    return NextResponse.json({
      message: 'Alert created successfully',
      alert: newAlert
    }, { status: 201 })

  } catch (error) {
    console.error('Error processing inventory alert:', error)
    return NextResponse.json(
      { error: 'Failed to process inventory alert' },
      { status: 500 }
    )
  }
}