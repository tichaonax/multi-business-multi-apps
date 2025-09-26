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
  if (!confirmText.startsWith('UNSEED-CONTRACTORS-')) return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })

  try {
    const { prisma } = await import('@/lib/prisma')
    const demoBusinessId = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'contractors-demo-business'

    // Remove project contractor assignments for projects owned by the demo business
    const demoProjects = await prisma.project.findMany({ where: { businessId: demoBusinessId }, select: { id: true } }).catch(() => [])
    const demoProjectIds = demoProjects.map(p => p.id)
    if (demoProjectIds.length) {
      await prisma.projectContractor.deleteMany({ where: { projectId: { in: demoProjectIds } } }).catch(() => {})
    }

    // Remove projects for business
    await prisma.project.deleteMany({ where: { id: { in: demoProjectIds } } }).catch(() => {})

    // Remove person records whose id starts with the demo business id prefix
    await prisma.person.deleteMany({ where: { id: { startsWith: demoBusinessId } } }).catch(() => {})

    // Finally remove the business record
    await prisma.business.deleteMany({ where: { id: demoBusinessId } }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Unseed contractors failed:', err)
    return NextResponse.json({ error: 'Failed to unseed contractors demo', message: err?.message || String(err) }, { status: 500 })
  }
}
