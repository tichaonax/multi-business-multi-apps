import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as any
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const confirmed = !!body.confirm
  const confirmText = typeof body.confirmText === 'string' ? body.confirmText : undefined
  if (!confirmed || !confirmText) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  if (!confirmText.startsWith('UNSEED-RESTAURANT-') && !confirmText.startsWith('UNSEED-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

  try {
    const { prisma } = await import('@/lib/prisma')
  const demoBusinessId = 'restaurant-demo'

    // Delete order items -> orders -> stock movements -> variants -> attributes -> products -> categories -> business
    const demoOrderIds = await prisma.businessOrder.findMany({ where: { businessId: demoBusinessId }, select: { id: true } }).then(r => r.map(x => x.id)).catch(() => [])
    if (demoOrderIds.length > 0) {
      await prisma.businessOrderItem.deleteMany({ where: { orderId: { in: demoOrderIds } } }).catch(() => {})
    }
    await prisma.businessOrder.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})
    await prisma.businessStockMovement.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})

  const demoProducts = await prisma.businessProduct.findMany({ where: { businessId: demoBusinessId } })
  const demoProductIds = demoProducts.map(p => p.id)
  const demoVariantIds = await prisma.productVariant.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then(r => r.map(x => x.id)).catch(() => [])

  // Delete product images first to avoid FK restriction
  await prisma.productImage.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
  await prisma.productVariant.deleteMany({ where: { id: { in: demoVariantIds } } }).catch(() => {})
  await prisma.productAttribute.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => {})
  await prisma.businessProduct.deleteMany({ where: { id: { in: demoProductIds } } }).catch(() => {})
    await prisma.businessCategory.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => {})
    await prisma.business.deleteMany({ where: { id: demoBusinessId } }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Unseed restaurant failed:', err)
    return NextResponse.json({ error: 'Failed to unseed restaurant demo', message: err?.message || String(err) }, { status: 500 })
  }
}
