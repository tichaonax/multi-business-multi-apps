/**
 * MBM-296 — reads/writes the review/approval workflow state for pricing
 * exceptions (`product_exception_reviews`). One row per (product, exception
 * type); an APPROVED row with a past `expiresAt` is treated as expired back
 * to OPEN at read time rather than via a cron job.
 */

import { prisma } from '@/lib/prisma'
import type { CatalogSource } from '@/lib/inventory/product-catalog-view'

export type ExceptionReviewStatus = 'OPEN' | 'REVIEWED' | 'CORRECTED' | 'APPROVED' | 'IGNORED' | 'FOLLOW_UP'

export interface ExceptionReviewState {
  status: ExceptionReviewStatus
  reason: string | null
  notes: string | null
  actedByUserId: string | null
  actedAt: string | null
  expiresAt: string | null
}

/**
 * Keyed as `${catalogSource}:${productRefId}:${exceptionType}` — one entry
 * per (product, exception type) pair, so a caller iterating a report's
 * detected flags can look up each flag's review state directly.
 */
export async function getReviewStates(
  businessId: string,
  refs: { catalogSource: CatalogSource; productRefId: string }[]
): Promise<Map<string, ExceptionReviewState>> {
  const result = new Map<string, ExceptionReviewState>()
  if (refs.length === 0) return result

  const rows = await prisma.productExceptionReviews.findMany({
    where: {
      businessId,
      OR: refs.map(r => ({ catalogSource: r.catalogSource, productRefId: r.productRefId })),
    },
  })

  const now = Date.now()
  for (const row of rows) {
    const expired = row.status === 'APPROVED' && row.expiresAt !== null && row.expiresAt.getTime() < now
    const key = `${row.catalogSource}:${row.productRefId}:${row.exceptionType}`
    result.set(key, {
      status: expired ? 'OPEN' : (row.status as ExceptionReviewStatus),
      reason: row.reason,
      notes: row.notes,
      actedByUserId: row.actedByUserId,
      actedAt: row.actedAt ? row.actedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    })
  }
  return result
}

export interface UpsertReviewParams {
  businessId: string
  catalogSource: CatalogSource
  productRefId: string
  exceptionType: string
  status: ExceptionReviewStatus
  reason?: string | null
  notes?: string | null
  actedByUserId: string
  expiresAt?: Date | null
}

export async function upsertReview(params: UpsertReviewParams) {
  const { businessId, catalogSource, productRefId, exceptionType, status, reason, notes, actedByUserId, expiresAt } = params
  return prisma.productExceptionReviews.upsert({
    where: {
      businessId_catalogSource_productRefId_exceptionType: { businessId, catalogSource, productRefId, exceptionType },
    },
    create: {
      businessId,
      catalogSource,
      productRefId,
      exceptionType,
      status,
      reason: reason ?? null,
      notes: notes ?? null,
      actedByUserId,
      actedAt: new Date(),
      expiresAt: expiresAt ?? null,
    },
    update: {
      status,
      reason: reason ?? null,
      notes: notes ?? null,
      actedByUserId,
      actedAt: new Date(),
      expiresAt: expiresAt ?? null,
    },
  })
}
