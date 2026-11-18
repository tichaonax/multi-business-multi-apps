/**
 * MBM-336 — when a cashier corrects a submitted combo request before
 * approving it, describe what changed in plain words so the requester can
 * see it (e.g. `fridge: amount $145.00 → $150.00`).
 *
 * Items are matched by id (the edit form sends each saved item's id back).
 * The payee compared is the one the item is effectively paid to: its own,
 * else its section's.
 */
type PayeeKey = { type: string | null; id: string | null }

interface ItemLike {
  id?: string | null
  description: string
  quantity?: unknown
  estimatedAmount?: unknown
  categoryId?: string | null
  subcategoryId?: string | null
  payee: PayeeKey
}

const PAYEE_COLUMNS: Record<string, string> = {
  PERSON: 'payeePersonId', USER: 'payeeUserId', EMPLOYEE: 'payeeEmployeeId',
  BUSINESS: 'payeeBusinessId', SUPPLIER: 'payeeSupplierId',
}

function payeeOf(row: any): PayeeKey {
  const type = row?.payeeType || null
  const id = type ? (row[PAYEE_COLUMNS[type]] ?? null) : null
  return { type, id }
}

function effectivePayee(item: any, section: any): PayeeKey {
  const own = payeeOf(item)
  return own.type && own.id ? own : payeeOf(section)
}

const money = (v: unknown) => `$${Number(v ?? 0).toFixed(2)}`
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))

async function payeeNames(db: any, keys: PayeeKey[]): Promise<Map<string, string>> {
  const ids = (type: string) => [...new Set(keys.filter(k => k.type === type && k.id).map(k => k.id as string))]
  const names = new Map<string, string>()
  const [persons, users, employees, businesses, suppliers] = await Promise.all([
    ids('PERSON').length ? db.persons.findMany({ where: { id: { in: ids('PERSON') } }, select: { id: true, fullName: true } }) : [],
    ids('USER').length ? db.users.findMany({ where: { id: { in: ids('USER') } }, select: { id: true, name: true } }) : [],
    ids('EMPLOYEE').length ? db.employees.findMany({ where: { id: { in: ids('EMPLOYEE') } }, select: { id: true, fullName: true } }) : [],
    ids('BUSINESS').length ? db.businesses.findMany({ where: { id: { in: ids('BUSINESS') } }, select: { id: true, name: true } }) : [],
    ids('SUPPLIER').length ? db.businessSuppliers.findMany({ where: { id: { in: ids('SUPPLIER') } }, select: { id: true, name: true } }) : [],
  ])
  for (const p of persons) names.set(`PERSON:${p.id}`, p.fullName)
  for (const u of users) names.set(`USER:${u.id}`, u.name)
  for (const e of employees) names.set(`EMPLOYEE:${e.id}`, e.fullName)
  for (const b of businesses) names.set(`BUSINESS:${b.id}`, b.name)
  for (const s of suppliers) names.set(`SUPPLIER:${s.id}`, s.name)
  return names
}

/**
 * @param oldRequest  the request before the save, with sections → items
 * @param newTitle    the title sent (undefined = unchanged)
 * @param newSections the sections payload sent (undefined = unchanged)
 * @returns one line per change; empty when nothing the requester cares about changed
 */
export async function describeComboChanges(
  db: any,
  oldRequest: { title: string; sections: any[] },
  newTitle: string | undefined,
  newSections: any[] | undefined,
): Promise<string[]> {
  const lines: string[] = []
  if (newTitle !== undefined && newTitle.trim() !== oldRequest.title) {
    lines.push(`title "${oldRequest.title}" → "${newTitle.trim()}"`)
  }
  if (newSections === undefined) return lines

  const oldItems: ItemLike[] = oldRequest.sections.flatMap(s => s.items.map((i: any) => ({
    id: i.id, description: i.description, quantity: i.quantity, estimatedAmount: i.estimatedAmount,
    categoryId: i.categoryId, subcategoryId: i.subcategoryId, payee: effectivePayee(i, s),
  })))
  const newItems: ItemLike[] = newSections.flatMap(s => (s.items || []).map((i: any) => ({
    id: i.id || null, description: String(i.description ?? '').trim(), quantity: i.quantity, estimatedAmount: i.estimatedAmount,
    categoryId: i.categoryId || null, subcategoryId: i.subcategoryId || null, payee: effectivePayee(i, s),
  })))

  const names = await payeeNames(db, [...oldItems, ...newItems].map(i => i.payee))
  const payeeLabel = (p: PayeeKey) => (p.type && p.id ? (names.get(`${p.type}:${p.id}`) ?? p.type) : 'no payee')

  const newById = new Map(newItems.filter(i => i.id).map(i => [i.id as string, i]))
  for (const o of oldItems) {
    const n = o.id ? newById.get(o.id) : undefined
    if (!n) { lines.push(`removed "${o.description}" (${money(o.estimatedAmount)})`); continue }
    const label = n.description || o.description
    if (n.description !== o.description) lines.push(`"${o.description}" renamed to "${n.description}"`)
    if (num(n.estimatedAmount) !== num(o.estimatedAmount)) lines.push(`${label}: amount ${money(o.estimatedAmount)} → ${money(n.estimatedAmount)}`)
    if (num(n.quantity) !== num(o.quantity)) lines.push(`${label}: quantity ${num(o.quantity) ?? '—'} → ${num(n.quantity) ?? '—'}`)
    if (`${n.payee.type}:${n.payee.id}` !== `${o.payee.type}:${o.payee.id}`) lines.push(`${label}: payee ${payeeLabel(o.payee)} → ${payeeLabel(n.payee)}`)
    if ((n.categoryId ?? null) !== (o.categoryId ?? null) || (n.subcategoryId ?? null) !== (o.subcategoryId ?? null)) lines.push(`${label}: classification changed`)
  }
  const oldIds = new Set(oldItems.map(i => i.id))
  for (const n of newItems) {
    if (!n.id || !oldIds.has(n.id)) lines.push(`added "${n.description}" (${money(n.estimatedAmount)})`)
  }
  return lines
}
