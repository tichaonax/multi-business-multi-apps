import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
    // Allow dev bypass when FORCE_ADMIN_SESSION=true and request includes _forceAdmin
    const body = await request.json().catch(() => ({}))
    const devBypass = process.env.FORCE_ADMIN_SESSION === 'true' && body._forceAdmin
    if (!devBypass) {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const isAdmin = (session.user as any)?.role === 'admin' || (session.user as any)?.isAdmin
        if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const confirmed = !!body.confirm
    const confirmText = typeof body.confirmText === 'string' ? body.confirmText : undefined
    if (!confirmed || !confirmText) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
    if (!confirmText.startsWith('UNSEED-CLOTHING-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

    try {
        const { prisma } = await import('@/lib/prisma')
        const demoBusinessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'clothing-demo-business'

        // Delete order items and orders for that business
        await prisma.businessOrderItem.deleteMany({ where: { order: { businessId: demoBusinessId } } }).catch(() => { })
        await prisma.businessOrder.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => { })

        // Delete stock movements, product images, variants, attributes, products, categories
        await prisma.businessStockMovement.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => { })

        // Find products for the demo business (may be none)
        const demoProducts = await prisma.businessProduct.findMany({ where: { businessId: demoBusinessId } }).catch(() => [])
        const demoProductIds = demoProducts.map(p => p.id)

        // Defensive deletes in order to avoid FK constraint issues
        // 1) product images
        if (demoProductIds.length) {
            await prisma.productImage.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => { })
            await prisma.productAttribute.deleteMany({ where: { productId: { in: demoProductIds } } }).catch(() => { })
        }

        // 2) variants (lookup variant ids) and variant-specific stock movements
        const demoVariantIds = demoProductIds.length ? await prisma.productVariant.findMany({ where: { productId: { in: demoProductIds } }, select: { id: true } }).then(r => r.map(x => x.id)).catch(() => []) : []
        if (demoVariantIds.length) {
            // delete stock movements tied to variants (if any)
            await prisma.businessStockMovement.deleteMany({ where: { productVariantId: { in: demoVariantIds } } }).catch(() => { })
            await prisma.productVariant.deleteMany({ where: { id: { in: demoVariantIds } } }).catch(() => { })
        }

        // 3) products
        if (demoProductIds.length) {
            await prisma.businessProduct.deleteMany({ where: { id: { in: demoProductIds } } }).catch(() => { })
        }

        // 4) categories and finally the demo business itself
        await prisma.businessCategory.deleteMany({ where: { businessId: demoBusinessId } }).catch(() => { })
        await prisma.business.deleteMany({ where: { id: demoBusinessId } }).catch(() => { })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Unseed clothing failed:', err)
        return NextResponse.json({ error: 'Failed to unseed clothing demo', message: err?.message || String(err) }, { status: 500 })
    }
}
