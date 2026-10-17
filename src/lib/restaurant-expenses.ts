/**
 * MBM-319 — restaurant expenses recorded at purchase time (even with no
 * funds) and paid later through combo payment requests. Shared helpers for
 * the /api/restaurant/expenses routes.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/permission-utils'

export type PayeeType = 'PERSON' | 'USER' | 'EMPLOYEE' | 'BUSINESS' | 'SUPPLIER'
export const PAYEE_TYPES: PayeeType[] = ['PERSON', 'USER', 'EMPLOYEE', 'BUSINESS', 'SUPPLIER']

// Line statuses live with the combo hooks (no next/server import there) — re-exported here.
export { LINE_STATUS, OPEN_LINE_STATUSES } from './restaurant-expense-combo'

/** Same normalisation as the restaurant_expense_items backfill: lower(trim(name)). */
export const itemNameKey = (name: string) => name.trim().toLowerCase()

/**
 * The user must be a member of this business (or an admin), and the
 * business must be a restaurant. Returns an error response, or null if OK.
 */
export async function checkRestaurantAccess(user: SessionUser, businessId: string | null) {
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  const business = await prisma.businesses.findFirst({
    where: { id: businessId, type: 'restaurant', isActive: true },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: 'Restaurant business not found' }, { status: 404 })
  const isMember = user.businessMemberships?.some(m => m.businessId === businessId && m.isActive)
  if (!isMember && user.role !== 'admin') {
    return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }
  return null
}

/** The restaurant's default expense account — the oldest active GENERAL one
 * (existing convention), falling back to the oldest active account. */
export async function getDefaultExpenseAccount(businessId: string) {
  return (
    (await prisma.expenseAccounts.findFirst({
      where: { businessId, isActive: true, accountType: 'GENERAL' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, accountName: true, balance: true },
    })) ??
    (await prisma.expenseAccounts.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, accountName: true, balance: true },
    }))
  )
}

type PayeeColumns = {
  payeeType: string | null
  payeePersonId: string | null
  payeeUserId: string | null
  payeeEmployeeId: string | null
  payeeBusinessId: string | null
  payeeSupplierId: string | null
}

/** {type, id} → the payee*Id columns (all null when no payee). */
export function payeeColumns(payee: { type: string; id: string } | null | undefined): PayeeColumns {
  const type = payee && PAYEE_TYPES.includes(payee.type as PayeeType) ? payee.type : null
  return {
    payeeType: type,
    payeePersonId: type === 'PERSON' ? payee!.id : null,
    payeeUserId: type === 'USER' ? payee!.id : null,
    payeeEmployeeId: type === 'EMPLOYEE' ? payee!.id : null,
    payeeBusinessId: type === 'BUSINESS' ? payee!.id : null,
    payeeSupplierId: type === 'SUPPLIER' ? payee!.id : null,
  }
}

/** The payee*Id columns → {type, id}, or null. */
export function payeeRef(r: Partial<PayeeColumns>): { type: PayeeType; id: string } | null {
  const id =
    r.payeeType === 'PERSON' ? r.payeePersonId
    : r.payeeType === 'USER' ? r.payeeUserId
    : r.payeeType === 'EMPLOYEE' ? r.payeeEmployeeId
    : r.payeeType === 'BUSINESS' ? r.payeeBusinessId
    : r.payeeType === 'SUPPLIER' ? r.payeeSupplierId
    : null
  return id ? { type: r.payeeType as PayeeType, id } : null
}

export const payeeKey = (p: { type: string; id: string }) => `${p.type}:${p.id}`

/** Display names for a set of payees, keyed by payeeKey(). */
export async function resolvePayeeNames(payees: { type: string; id: string }[]) {
  const ids = (t: string) => Array.from(new Set(payees.filter(p => p.type === t).map(p => p.id)))
  const [persons, users, employees, businesses, suppliers] = await Promise.all([
    ids('PERSON').length ? prisma.persons.findMany({ where: { id: { in: ids('PERSON') } }, select: { id: true, fullName: true } }) : [],
    ids('USER').length ? prisma.users.findMany({ where: { id: { in: ids('USER') } }, select: { id: true, name: true } }) : [],
    ids('EMPLOYEE').length ? prisma.employees.findMany({ where: { id: { in: ids('EMPLOYEE') } }, select: { id: true, fullName: true } }) : [],
    ids('BUSINESS').length ? prisma.businesses.findMany({ where: { id: { in: ids('BUSINESS') } }, select: { id: true, name: true } }) : [],
    ids('SUPPLIER').length ? prisma.businessSuppliers.findMany({ where: { id: { in: ids('SUPPLIER') } }, select: { id: true, name: true } }) : [],
  ])
  const names = new Map<string, string>()
  persons.forEach(p => names.set(`PERSON:${p.id}`, p.fullName))
  users.forEach(u => names.set(`USER:${u.id}`, u.name))
  employees.forEach(e => names.set(`EMPLOYEE:${e.id}`, e.fullName))
  businesses.forEach(b => names.set(`BUSINESS:${b.id}`, b.name))
  suppliers.forEach(s => names.set(`SUPPLIER:${s.id}`, s.name))
  return names
}

/**
 * Next transaction reference, REX-YYYYMMDD-NNN (date = purchase date). The
 * reference is globally unique; callers retry on a P2002 collision.
 */
export async function nextReference(tx: any, purchaseDateStr: string) {
  const prefix = `REX-${purchaseDateStr.replace(/-/g, '')}-`
  const count = await tx.restaurantExpenseTransactions.count({ where: { reference: { startsWith: prefix } } })
  return `${prefix}${String(count + 1).padStart(3, '0')}`
}
