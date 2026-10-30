/**
 * MBM-329 — Free menu samples with customer-specific return-purchase offers.
 *
 * Shared server helpers: offer codes, phone matching, eligibility, and the
 * read-only redemption validation used by both the /validate endpoint and the
 * order route (which re-validates before its atomic claim).
 */
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

export const DEFAULT_SAMPLE_OFFER_VALIDITY_DAYS = 7
export const DEFAULT_SAMPLE_MIN_PURCHASE = 4 // restaurant default: purchase total of $4.00 or more
export const SAMPLE_OFFER_CODE_PATTERN = /^SMP-[A-Z0-9]{8}$/i

// No 0/O/1/I — easier to read aloud or type when a barcode won't scan
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateSampleOfferCode(): string {
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return `SMP-${code}`
}

/** Compare on the last 9 digits so 0771234567, +263 77 123 4567 and 263771234567 all match. */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = (a || '').replace(/\D/g, '')
  const db = (b || '').replace(/\D/g, '')
  if (da.length < 7 || db.length < 7) return false
  return da.slice(-9) === db.slice(-9)
}

/** Business settings JSON: sampleOfferValidityDays (1–365, default 7), sampleMinPurchase (≥ 0, default 4.00). */
export async function getSampleOfferSettings(businessId: string): Promise<{ validityDays: number; minPurchase: number }> {
  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { settings: true } })
  const settings = (business?.settings as any) || {}
  const days = Number(settings.sampleOfferValidityDays)
  const min = settings.sampleMinPurchase == null ? NaN : Number(settings.sampleMinPurchase)
  return {
    validityDays: Number.isInteger(days) && days >= 1 && days <= 365 ? days : DEFAULT_SAMPLE_OFFER_VALIDITY_DAYS,
    minPurchase: Number.isFinite(min) && min >= 0 ? min : DEFAULT_SAMPLE_MIN_PURCHASE,
  }
}

export async function getSampleOfferValidityDays(businessId: string): Promise<number> {
  return (await getSampleOfferSettings(businessId)).validityDays
}

/** Derived status — EXPIRED is never stored. */
export function offerDisplayStatus(offer: { status: string; expiresAt: Date }): 'VALID' | 'EXPIRED' | 'REDEEMED' {
  if (offer.status === 'REDEEMED') return 'REDEEMED'
  return offer.expiresAt.getTime() <= Date.now() ? 'EXPIRED' : 'VALID'
}

export class SampleOfferError extends Error {
  constructor(message: string, public status = 409) {
    super(message)
  }
}

function fmt(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Checks a customer may receive a sample of this product. Throws SampleOfferError
 * with a staff-readable message; returns the customer + product on success.
 */
export async function assertSampleIssuable(businessId: string, customerId: string | null | undefined, productId: string) {
  if (!customerId) throw new SampleOfferError('A registered customer must be selected to give a free sample.', 400)
  const customer = await prisma.businessCustomers.findFirst({
    where: { id: customerId, businessId },
    select: { id: true, name: true, customerNumber: true, phone: true },
  })
  if (!customer) throw new SampleOfferError('Customer not found for this business.', 400)
  if (!customer.phone || !customer.phone.trim()) {
    throw new SampleOfferError('This customer has no phone number. Add their phone number before giving a sample.', 400)
  }
  const product = await prisma.businessProducts.findFirst({
    where: { id: productId, businessId },
    select: { id: true, name: true },
  })
  if (!product) throw new SampleOfferError('The selected sample item was not found.', 400)
  const previous = await prisma.sampleOffers.findUnique({
    where: { customerId_sampledProductId: { customerId, sampledProductId: productId } },
    select: { issuedAt: true },
  })
  if (previous) {
    throw new SampleOfferError(`${customer.name} already received a sample of ${product.name} on ${fmt(previous.issuedAt)}. Each item can only be sampled once per customer.`)
  }
  return { customer, product }
}

export async function loadOfferForRedemption(businessId: string, offerCode: string) {
  return prisma.sampleOffers.findFirst({
    where: { businessId, offerCode: offerCode.trim().toUpperCase() },
    include: {
      promo_items: { orderBy: { createdAt: 'asc' } },
      business_customers: { select: { id: true, name: true, customerNumber: true, phone: true, email: true, customerType: true } },
      redeemed_order: { select: { orderNumber: true } },
    },
  })
}

/** Read-only checks, in the order the plan specifies. Throws SampleOfferError. */
export async function validateOfferForRedemption(businessId: string, offerCode: string, phone: string) {
  if (!offerCode || !SAMPLE_OFFER_CODE_PATTERN.test(offerCode.trim())) {
    throw new SampleOfferError('This barcode is not a valid sample offer.', 404)
  }
  const offer = await loadOfferForRedemption(businessId, offerCode)
  if (!offer) throw new SampleOfferError('This barcode is not a valid sample offer.', 404)
  if (!phonesMatch(phone, offer.business_customers.phone)) {
    throw new SampleOfferError("The phone number doesn't match the customer this offer was issued to.", 403)
  }
  if (offer.status === 'REDEEMED') {
    const on = offer.redeemedAt ? ` on ${fmt(offer.redeemedAt)}` : ''
    const ord = offer.redeemed_order?.orderNumber ? ` (order ${offer.redeemed_order.orderNumber})` : ''
    throw new SampleOfferError(`This offer was already redeemed${on}${ord}.`)
  }
  if (offer.expiresAt.getTime() <= Date.now()) {
    throw new SampleOfferError(`This offer expired on ${fmt(offer.expiresAt)}.`)
  }
  return offer
}

export interface SampleSubstitutionInput {
  lineRole: 'PAID' | 'FREE'
  promoItemId?: string | null
  originalProductId: string
  substituteProductId: string
}

/**
 * Verifies the cart lines tagged with this offer match the stored offer exactly
 * (plus accepted substitutions). Returns resolved substitution rows to persist.
 */
export async function assertRedemptionLinesMatch(
  offer: NonNullable<Awaited<ReturnType<typeof loadOfferForRedemption>>>,
  items: any[],
  substitutions: SampleSubstitutionInput[]
) {
  const lines = items.filter(i => i?.sampleOfferId === offer.id)
  const paidLines = lines.filter(i => i.sampleRole === 'PROMOTED')
  const freeLines = lines.filter(i => i.sampleRole === 'FREE_PROMO')
  const mismatch = (why: string) => new SampleOfferError(`Sample offer items don't match the offer: ${why}. Cancel the redemption and scan again.`)

  // Paid promoted item (or its accepted substitute) at the normal price
  if (paidLines.length !== 1) throw mismatch('expected exactly one promoted item')
  const paid = paidLines[0]
  const paidSub = substitutions.find(s => s.lineRole === 'PAID')
  const expectedPaidId = paidSub ? paidSub.substituteProductId : offer.sampledProductId
  if (paidSub && paidSub.originalProductId !== offer.sampledProductId) throw mismatch('paid substitution is for a different item')
  if (paid.id !== expectedPaidId) throw mismatch('promoted item changed')
  const paidProduct = await prisma.businessProducts.findFirst({
    where: { id: expectedPaidId, businessId: offer.businessId },
    select: { id: true, name: true, basePrice: true, product_variants: { where: { isActive: true }, select: { price: true }, take: 1 } },
  })
  if (!paidProduct) throw mismatch('promoted item not found')
  const allowedPrices = [Number(paidProduct.basePrice), ...paidProduct.product_variants.filter(v => v.price != null).map(v => Number(v.price))]
  if (!allowedPrices.some(p => Math.abs(p - Number(paid.price)) < 0.005)) throw mismatch(`${paidProduct.name} must be charged at its normal price`)

  // Free promised items — every one present exactly once, at $0
  if (freeLines.length !== offer.promo_items.length) throw mismatch('free promotional items changed')
  const rows: Array<{ lineRole: 'PAID' | 'FREE'; promoItemId: string | null; originalProductId: string; originalProductName: string; substituteProductId: string; substituteProductName: string; substituteUnitPrice: number }> = []
  const supplied: Array<{ promoItemId: string; productId: string; productName: string }> = []
  for (const promo of offer.promo_items) {
    const line = freeLines.find(l => l.samplePromoItemId === promo.id)
    if (!line) throw mismatch(`missing free ${promo.productName}`)
    if (Number(line.price) !== 0) throw mismatch(`${promo.productName} must be free`)
    if (Number(line.quantity) !== promo.quantity) throw mismatch(`${promo.productName} quantity changed`)
    const sub = substitutions.find(s => s.lineRole === 'FREE' && s.promoItemId === promo.id)
    if (sub && sub.originalProductId !== promo.productId) throw mismatch('free substitution is for a different item')
    const expectedId = sub ? sub.substituteProductId : promo.productId
    if (line.id !== expectedId) throw mismatch(`free ${promo.productName} changed`)
    let suppliedName = promo.productName
    if (sub) {
      const subProduct = await prisma.businessProducts.findFirst({ where: { id: sub.substituteProductId, businessId: offer.businessId }, select: { name: true } })
      if (!subProduct) throw mismatch('substitute item not found')
      suppliedName = subProduct.name
      rows.push({ lineRole: 'FREE', promoItemId: promo.id, originalProductId: promo.productId, originalProductName: promo.productName, substituteProductId: sub.substituteProductId, substituteProductName: subProduct.name, substituteUnitPrice: 0 })
    }
    supplied.push({ promoItemId: promo.id, productId: expectedId, productName: suppliedName })
  }
  if (paidSub) {
    rows.push({ lineRole: 'PAID', promoItemId: null, originalProductId: offer.sampledProductId, originalProductName: offer.sampledProductName, substituteProductId: paidProduct.id, substituteProductName: paidProduct.name, substituteUnitPrice: Number(paid.price) })
  }
  return { substitutionRows: rows, suppliedPromoItems: supplied }
}

/** Admin, or an active member of the business. */
export function canAccessBusiness(user: any, businessId: string): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return !!user.businessMemberships?.some((m: any) => m.businessId === businessId && m.isActive)
}

/** Shape used by the POS to print the sample receipt (issue + reprint). */
export async function getSampleOfferReceiptData(offerId: string) {
  const offer = await prisma.sampleOffers.findUnique({
    where: { id: offerId },
    include: {
      promo_items: { orderBy: { createdAt: 'asc' } },
      business_customers: { select: { name: true, customerNumber: true } },
      businesses: { select: { name: true, address: true, phone: true } },
    },
  })
  if (!offer) return null
  return {
    id: offer.id,
    businessId: offer.businessId,
    offerCode: offer.offerCode,
    businessName: offer.businesses.name,
    businessAddress: offer.businesses.address || '',
    businessPhone: offer.businesses.phone || '',
    customerName: offer.business_customers.name,
    customerNumber: offer.business_customers.customerNumber,
    customerPhone: offer.customerPhone,
    sampledProductName: offer.sampledProductName,
    promoItems: offer.promo_items.map(p => ({ name: p.productName, quantity: p.quantity })),
    issuedAt: offer.issuedAt.toISOString(),
    expiresAt: offer.expiresAt.toISOString(),
    validityDays: offer.validityDays,
  }
}
