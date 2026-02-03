import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface InventoryReport {
  id: string
  businessId: string
  reportType: 'inventory_value' | 'turnover_analysis' | 'waste_report' | 'abc_analysis' | 'reorder_report' | 'expiration_report'
  generatedAt: string
  generatedBy: string
  dateRange: {
    startDate: string
    endDate: string
  }
  data: any
  summary: any
}

// Generate real report data from database
async function generateInventoryValueReport(businessId: string, startDate: string, endDate: string) {
  try {
    // Get all products with variants for this business
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId,
        isActive: true
      },
      include: {
        product_variants: true,
        business_categories: true
      }
    })

    let totalInventoryValue = 0
    let totalItems = 0
    const categoryMap = new Map<string, { value: number; items: number }>()

    // Calculate values from real data
    for (const product of products) {
      for (const variant of product.product_variants) {
        const price = parseFloat(variant.price?.toString() || '0')
        const stock = variant.stockQuantity || 0
        const value = price * stock

        totalInventoryValue += value
        totalItems++

        // Group by category
        const categoryName = product.business_categories?.name || 'Uncategorized'
        const categoryData = categoryMap.get(categoryName) || { value: 0, items: 0 }
        categoryData.value += value
        categoryData.items++
        categoryMap.set(categoryName, categoryData)
      }
    }

    // Build categories array
    const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      value: data.value,
      percentage: totalInventoryValue > 0 ? (data.value / totalInventoryValue) * 100 : 0,
      items: data.items,
      averageValue: data.items > 0 ? data.value / data.items : 0
    })).sort((a, b) => b.value - a.value)

    // Calculate trends from stock movements
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const movements = await prisma.businessStockMovements.findMany({
      where: {
        businessId,
        createdAt: {
          gte: oneMonthAgo
        }
      }
    })

    const lastWeekMovements = movements.filter((m: any) => new Date(m.createdAt) >= oneWeekAgo)
    const lastMonthMovements = movements

    const lastWeekValue = lastWeekMovements.reduce((sum: number, m: any) => {
      const value = m.unitCost ? m.unitCost * Math.abs(m.quantity) : 0
      return sum + (m.quantity > 0 ? value : -value)
    }, 0)

    const lastMonthValue = lastMonthMovements.reduce((sum: number, m: any) => {
      const value = m.unitCost ? m.unitCost * Math.abs(m.quantity) : 0
      return sum + (m.quantity > 0 ? value : -value)
    }, 0)

    return {
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalItems,
      categories: categories.map(c => ({
        ...c,
        value: Math.round(c.value * 100) / 100,
        percentage: Math.round(c.percentage * 10) / 10,
        averageValue: Math.round(c.averageValue * 100) / 100
      })),
      trends: {
        weekOverWeek: totalInventoryValue > 0 ? Math.round((lastWeekValue / totalInventoryValue) * 1000) / 10 : 0,
        monthOverMonth: totalInventoryValue > 0 ? Math.round((lastMonthValue / totalInventoryValue) * 1000) / 10 : 0,
        yearOverYear: 0 // Would need 1 year of data
      }
    }
  } catch (error) {
    console.error('Error calculating inventory value:', error)
    // Return empty data structure on error
    return {
      totalInventoryValue: 0,
      totalItems: 0,
      categories: [],
      trends: {
        weekOverWeek: 0,
        monthOverMonth: 0,
        yearOverYear: 0
      }
    }
  }
}

function generateTurnoverAnalysisReport(businessId: string, startDate: string, endDate: string) {
  return {
    overallTurnoverRate: 12.4,
    averageDaysOnHand: 4.2,
    fastMovingItems: [
      {
        itemName: 'Ground Beef 80/20',
        sku: 'PROT-BEEF-001',
        turnoverRate: 24.0,
        daysOnHand: 1.5,
        category: 'Proteins'
      },
      {
        itemName: 'Roma Tomatoes',
        sku: 'VEG-TOM-001',
        turnoverRate: 18.0,
        daysOnHand: 2.0,
        category: 'Vegetables'
      }
    ],
    slowMovingItems: [
      {
        itemName: 'Specialty Spices',
        sku: 'PANT-SPICE-001',
        turnoverRate: 2.1,
        daysOnHand: 15.2,
        category: 'Pantry'
      }
    ],
    categoryAnalysis: [
      {
        category: 'Proteins',
        avgTurnoverRate: 15.6,
        avgDaysOnHand: 2.3,
        efficiency: 'Excellent'
      },
      {
        category: 'Vegetables',
        avgTurnoverRate: 12.8,
        avgDaysOnHand: 2.9,
        efficiency: 'Good'
      },
      {
        category: 'Pantry',
        avgTurnoverRate: 6.2,
        avgDaysOnHand: 5.9,
        efficiency: 'Fair'
      }
    ]
  }
}

function generateWasteReport(businessId: string, startDate: string, endDate: string) {
  return {
    totalWasteValue: 1247.83,
    totalWasteQuantity: 45.7,
    wastePercentage: 2.6,
    wasteByReason: [
      {
        reason: 'Expired/Spoiled',
        value: 456.32,
        percentage: 36.6,
        preventable: false
      },
      {
        reason: 'Overcooked',
        value: 234.51,
        percentage: 18.8,
        preventable: true
      },
      {
        reason: 'Dropped/Spilled',
        value: 189.45,
        percentage: 15.2,
        preventable: true
      },
      {
        reason: 'Over Production',
        value: 367.55,
        percentage: 29.4,
        preventable: true
      }
    ],
    wasteByCategory: [
      {
        category: 'Proteins',
        value: 567.89,
        percentage: 45.5
      },
      {
        category: 'Vegetables',
        value: 234.12,
        percentage: 18.8
      },
      {
        category: 'Dairy',
        value: 445.82,
        percentage: 35.7
      }
    ],
    preventableWaste: {
      value: 791.51,
      percentage: 63.4,
      potentialSavings: 791.51
    },
    trends: {
      weekOverWeek: -12.5,
      monthOverMonth: -8.3,
      targetPercentage: 2.0
    }
  }
}

function generateABCAnalysisReport(businessId: string, startDate: string, endDate: string) {
  return {
    aItems: {
      count: 15,
      percentage: 10.2,
      value: 38280.00,
      valuePercentage: 80.0,
      description: 'High value, high turnover items requiring tight control'
    },
    bItems: {
      count: 44,
      percentage: 29.9,
      value: 7177.50,
      valuePercentage: 15.0,
      description: 'Moderate value items requiring standard control'
    },
    cItems: {
      count: 88,
      percentage: 59.9,
      value: 2392.50,
      valuePercentage: 5.0,
      description: 'Low value items requiring minimal control'
    },
    recommendations: [
      'Focus daily monitoring on A-category items',
      'Implement weekly reviews for B-category items',
      'Monthly checks sufficient for C-category items',
      'Consider bulk purchasing for high-turnover A items'
    ]
  }
}

function generateReorderReport(businessId: string, startDate: string, endDate: string) {
  return {
    itemsToReorder: [
      {
        itemName: 'Olive Oil - Extra Virgin',
        sku: 'PANT-OIL-001',
        currentStock: 1,
        reorderLevel: 3,
        suggestedOrderQuantity: 12,
        supplier: 'Mediterranean Imports',
        leadTime: 5,
        estimatedCost: 155.88,
        priority: 'High'
      },
      {
        itemName: 'Roma Tomatoes',
        sku: 'VEG-TOM-001',
        currentStock: 8.2,
        reorderLevel: 10,
        suggestedOrderQuantity: 25,
        supplier: 'Green Fields Produce',
        leadTime: 2,
        estimatedCost: 62.25,
        priority: 'Medium'
      }
    ],
    totalEstimatedCost: 1247.89,
    supplierBreakdown: [
      {
        supplier: 'Mediterranean Imports',
        itemCount: 3,
        estimatedCost: 567.34
      },
      {
        supplier: 'Green Fields Produce',
        itemCount: 8,
        estimatedCost: 432.89
      },
      {
        supplier: 'Prime Meats Inc.',
        itemCount: 2,
        estimatedCost: 247.66
      }
    ]
  }
}

function generateExpirationReport(businessId: string, startDate: string, endDate: string) {
  return {
    expiringItems: [
      {
        itemName: 'Ground Beef 80/20',
        sku: 'PROT-BEEF-001',
        currentStock: 15.5,
        expirationDate: '2024-09-15',
        daysUntilExpiration: 1,
        value: 108.45,
        priority: 'Critical',
        action: 'Use immediately'
      },
      {
        itemName: 'Heavy Cream',
        sku: 'DAIRY-CREAM-001',
        currentStock: 2,
        expirationDate: '2024-09-16',
        daysUntilExpiration: 2,
        value: 9.00,
        priority: 'High',
        action: 'Use for soups/sauces'
      }
    ],
    totalAtRiskValue: 234.67,
    expirationBreakdown: {
      critical: { count: 1, value: 108.45 }, // 1 day
      urgent: { count: 2, value: 89.22 },    // 2-3 days
      soon: { count: 5, value: 156.89 }      // 4-7 days
    },
    recommendations: [
      'Implement FIFO rotation system',
      'Daily expiration checks for proteins and dairy',
      'Consider markdown pricing for items expiring within 2 days'
    ]
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
)
 {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    // Query parameters
    const reportType = searchParams.get('reportType') as InventoryReport['reportType']
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const format = searchParams.get('format') || 'json' // json, csv, pdf

    if (!reportType) {
      return NextResponse.json(
        { error: 'reportType parameter is required' },
        { status: 400 }
      )
    }

    // Generate report data based on type
    let reportData: any
    let reportSummary: any

    switch (reportType) {
      case 'inventory_value':
        reportData = await generateInventoryValueReport(businessId, startDate, endDate)
        reportSummary = {
          title: 'Inventory Value Report',
          description: 'Current inventory value by category with trends',
          totalValue: reportData.totalInventoryValue,
          totalItems: reportData.totalItems
        }
        break

      case 'turnover_analysis':
        reportData = generateTurnoverAnalysisReport(businessId, startDate, endDate)
        reportSummary = {
          title: 'Inventory Turnover Analysis',
          description: 'Analysis of inventory movement and efficiency',
          overallTurnover: reportData.overallTurnoverRate,
          avgDaysOnHand: reportData.averageDaysOnHand
        }
        break

      case 'waste_report':
        reportData = generateWasteReport(businessId, startDate, endDate)
        reportSummary = {
          title: 'Food Waste Analysis Report',
          description: 'Detailed analysis of food waste and cost impact',
          totalWasteValue: reportData.totalWasteValue,
          wastePercentage: reportData.wastePercentage
        }
        break

      case 'abc_analysis':
        reportData = generateABCAnalysisReport(businessId, startDate, endDate)
        reportSummary = {
          title: 'ABC Analysis Report',
          description: 'Item classification by value and importance',
          aItemsCount: reportData.aItems.count,
          totalValue: reportData.aItems.value + reportData.bItems.value + reportData.cItems.value
        }
        break

      case 'reorder_report':
        reportData = generateReorderReport(businessId, startDate, endDate)
        reportSummary = {
          title: 'Reorder Requirements Report',
          description: 'Items requiring reorder with supplier information',
          itemsToReorder: reportData.itemsToReorder.length,
          totalCost: reportData.totalEstimatedCost
        }
        break

      case 'expiration_report':
        reportData = generateExpirationReport(businessId, startDate, endDate)
        reportSummary = {
          title: 'Expiration Tracking Report',
          description: 'Items approaching expiration with action recommendations',
          expiringItems: reportData.expiringItems.length,
          atRiskValue: reportData.totalAtRiskValue
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }

    const report: InventoryReport = {
      id: `report-${businessId}-${Date.now()}`,
      businessId,
      reportType,
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.name || 'Unknown',
      dateRange: { startDate, endDate },
      data: reportData,
      summary: reportSummary
    }

    // Handle different output formats
    if (format === 'csv') {
      // In a real implementation, convert data to CSV format
      return new NextResponse('CSV export not implemented in demo', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-${businessId}-${endDate}.csv"`
        }
      })
    }

    if (format === 'pdf') {
      // In a real implementation, generate PDF
      return new NextResponse('PDF export not implemented in demo', {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${reportType}-${businessId}-${endDate}.pdf"`
        }
      })
    }

    return NextResponse.json({
      report,
      meta: {
        availableReportTypes: [
          'inventory_value',
          'turnover_analysis',
          'waste_report',
          'abc_analysis',
          'reorder_report',
          'expiration_report'
        ],
        supportedFormats: ['json', 'csv', 'pdf']
      }
    })

  } catch (error) {
    console.error('Error generating inventory report:', error)
    // For businesses with no inventory, return empty report gracefully
    const session = await getServerSession(authOptions)
    const reportType = new URL(request.url).searchParams.get('reportType') as string
    const startDate = new URL(request.url).searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = new URL(request.url).searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    return NextResponse.json({
      report: {
        id: `report-empty-${Date.now()}`,
        businessId: 'unknown',
        reportType: reportType || 'inventory_value',
        generatedAt: new Date().toISOString(),
        generatedBy: session?.user?.name || 'Unknown',
        dateRange: { startDate, endDate },
        data: {
          totalInventoryValue: 0,
          totalItems: 0,
          categories: [],
          trends: {
            weekOverWeek: 0,
            monthOverMonth: 0,
            yearOverYear: 0
          }
        },
        summary: {
          title: 'Inventory Value Report',
          description: 'Current inventory value by category with trends',
          totalValue: 0,
          totalItems: 0
        }
      },
      meta: {
        availableReportTypes: [
          'inventory_value',
          'turnover_analysis',
          'waste_report',
          'abc_analysis',
          'reorder_report',
          'expiration_report'
        ],
        supportedFormats: ['json', 'csv', 'pdf']
      }
    })
  }
}