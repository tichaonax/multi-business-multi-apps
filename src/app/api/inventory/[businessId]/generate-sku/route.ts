import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSKU, analyzeSKUPatterns } from '@/lib/sku-generator'

/**
 * POST /api/inventory/[businessId]/generate-sku
 * Generate a unique SKU based on product name and existing patterns
 *
 * Body: {
 *   productName: string
 *   category?: string
 * }
 */
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
    const { productName, category } = body

    if (!productName) {
      return NextResponse.json(
        { error: 'Missing required field: productName' },
        { status: 400 }
      )
    }

    // Verify business exists and user has access
    const business = await prisma.businesses.findFirst({
      where: {
        id: businessId,
        OR: [
          { business_memberships: { some: { userId: session.user.id, isActive: true } } },
          { id: businessId } // Allow if user is admin
        ]
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Generate SKU
    const sku = await generateSKU(prisma, {
      productName,
      category,
      businessId,
      businessType: business.type
    })

    // Get pattern analysis for context
    const analysis = await analyzeSKUPatterns(prisma, businessId)

    return NextResponse.json({
      sku,
      pattern: analysis.detectedPattern,
      confidence: analysis.patternCoverage,
      message: analysis.detectedPattern
        ? `Generated SKU following existing pattern: ${analysis.detectedPattern.sample}`
        : 'Generated SKU using default pattern'
    })

  } catch (error: any) {
    console.error('Error generating SKU:', error)
    return NextResponse.json(
      { error: 'Failed to generate SKU', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/inventory/[businessId]/generate-sku?analyze=true
 * Analyze SKU patterns in the business (for debugging/reporting)
 */
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
    const analyze = searchParams.get('analyze') === 'true'

    if (!analyze) {
      return NextResponse.json(
        { error: 'Use POST to generate SKU or GET?analyze=true to analyze patterns' },
        { status: 400 }
      )
    }

    // Verify business access
    const business = await prisma.businesses.findFirst({
      where: {
        id: businessId,
        OR: [
          { business_memberships: { some: { userId: session.user.id, isActive: true } } },
          { id: businessId }
        ]
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Analyze patterns
    const analysis = await analyzeSKUPatterns(prisma, businessId)

    return NextResponse.json({
      businessId,
      businessName: business.name,
      analysis: {
        totalSKUs: analysis.totalSKUs,
        detectedPattern: analysis.detectedPattern,
        patternCoverage: `${analysis.patternCoverage}%`,
        samples: analysis.samples,
        recommendation: analysis.detectedPattern
          ? `New products will follow pattern: ${analysis.detectedPattern.prefix}${analysis.detectedPattern.separator}${Array(analysis.detectedPattern.numberLength).fill('#').join('')}`
          : 'No consistent pattern detected. New SKUs will use format: PREFIX-001'
      }
    })

  } catch (error: any) {
    console.error('Error analyzing SKU patterns:', error)
    return NextResponse.json(
      { error: 'Failed to analyze patterns', details: error.message },
      { status: 500 }
    )
  }
}
