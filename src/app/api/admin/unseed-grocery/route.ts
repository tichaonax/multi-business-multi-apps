import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = (session.user as any)?.role === 'admin' || (session.user as any)?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const confirmed = !!body.confirm
  const confirmText = typeof body.confirmText === 'string' ? body.confirmText : undefined
  if (!confirmed || !confirmText) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  if (!confirmText.startsWith('UNSEED-GROCERY-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

  try {
    const { prisma } = await import('@/lib/prisma')
    const demoBusinessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

    // Delete order items and orders for that business
    await prisma.businessOrderItems.deleteMany({ where: { order: { businessId: demoBusinessId } } }).catch(() => {})
    await prisma.businessOrders.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

    // Delete stock movements, product images, variants, attributes, products, categories
    await prisma.businessStockMovements.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

    const demoProducts = await prisma.businessProducts.findMany({ where: { businessId: demoBusinessId } }).catch(() => [])
    const demoProductIds = demoProducts.map(p => p.id)
    const demoVariantIds = demoProductIds.length ? await prisma.product_variants.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then(r => r.map(x => x.id)).catch(() => []) : []

    await prisma.productImages.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
    await prisma.product_variants.deleteMany({ where: { id: { in: demoVariantIds } } }).catch(() => {})
    await prisma.productAttributes.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
    await prisma.businessProducts.deleteMany({ where: { id: { in: demoProductIds } } }).catch(() => {})
    await prisma.businessCategories.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})
    await prisma.businesses.deleteMany({ where: { id: demoBusinessId } }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Unseed grocery failed:', err)
    return NextResponse.json({ error: 'Failed to unseed grocery demo', message: err?.message || String(err) }, { status: 500 })
  }
}
