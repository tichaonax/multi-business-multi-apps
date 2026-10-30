import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * MBM-330 — GET /api/expense-account/payees/match?text=...
 * Known receipt payees (Individuals/Contractors, Businesses, Suppliers) whose
 * name appears as whole words in the text, e.g. a combo line item
 * "Mr Sunday Labour For Truck Daina" → Mr Sunday. Longest names first.
 */
export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!getEffectivePermissions(user).canAccessExpenseAccount && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const text = (new URL(request.url).searchParams.get('text') || '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (text.length < 3) return NextResponse.json({ success: true, data: [] })

  const [persons, businesses, suppliers] = await Promise.all([
    prisma.persons.findMany({ where: { isActive: true }, select: { id: true, fullName: true } }),
    prisma.businesses.findMany({ where: { isActive: true, isUmbrellaBusiness: false }, select: { id: true, name: true } }),
    prisma.businessSuppliers.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ])

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const appears = (name: string) => {
    const n = name.toLowerCase().replace(/\s+/g, ' ').trim()
    if (n.length < 3) return false
    return new RegExp(`(^|[^a-z0-9])${escape(n)}($|[^a-z0-9])`).test(text)
  }

  const seen = new Set<string>()
  const matches = [
    ...persons.filter(p => appears(p.fullName)).map(p => ({ type: 'PERSON', id: p.id, name: p.fullName })),
    ...businesses.filter(b => appears(b.name)).map(b => ({ type: 'BUSINESS', id: b.id, name: b.name })),
    ...suppliers.filter(s => appears(s.name)).map(s => ({ type: 'SUPPLIER', id: s.id, name: s.name })),
  ]
    .filter(m => { const k = `${m.type}:${m.id}`; if (seen.has(k)) return false; seen.add(k); return true })
    .sort((a, b) => b.name.length - a.name.length)
    .slice(0, 5)

  return NextResponse.json({ success: true, data: matches })
}
