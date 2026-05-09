/**
 * EcoCash Utility Tests
 *
 * These functions are on the critical path for every EcoCash checkout across
 * all businesses. A bug here means every customer pays the wrong amount.
 */

import { describe, it, expect } from '@jest/globals'
import {
  getEcocashConfig,
  calcEcocashFee,
  calcEcocashFeeFromBusiness,
  getEcocashSummary,
} from '@/lib/ecocash-utils'

// ── getEcocashConfig ─────────────────────────────────────────────────────────

describe('getEcocashConfig', () => {
  it('extracts config from a full business object', () => {
    const business = { ecocashFeeType: 'PERCENTAGE', ecocashFeeValue: 3.5, ecocashMinimumFee: 0.5 }
    expect(getEcocashConfig(business)).toEqual({ feeType: 'PERCENTAGE', feeValue: 3.5, minimumFee: 0.5 })
  })

  it('defaults to FIXED / 0 / 0 when fields are missing', () => {
    expect(getEcocashConfig({})).toEqual({ feeType: 'FIXED', feeValue: 0, minimumFee: 0 })
  })

  it('defaults to FIXED / 0 / 0 when business is null', () => {
    expect(getEcocashConfig(null)).toEqual({ feeType: 'FIXED', feeValue: 0, minimumFee: 0 })
  })

  it('coerces string numbers to numbers', () => {
    const config = getEcocashConfig({ ecocashFeeType: 'FIXED', ecocashFeeValue: '2.00', ecocashMinimumFee: '0.50' })
    expect(typeof config.feeValue).toBe('number')
    expect(typeof config.minimumFee).toBe('number')
    expect(config.feeValue).toBe(2)
    expect(config.minimumFee).toBe(0.5)
  })
})

// ── calcEcocashFee ───────────────────────────────────────────────────────────

describe('calcEcocashFee — FIXED type', () => {
  it('returns the flat fee value regardless of amount', () => {
    expect(calcEcocashFee(100, 'FIXED', 2.5, 0)).toBe(2.5)
    expect(calcEcocashFee(1.70, 'FIXED', 0.50, 0)).toBe(0.50)
    expect(calcEcocashFee(0, 'FIXED', 2.5, 0)).toBe(2.5)
  })

  it('ignores minimumFee for FIXED type', () => {
    // minimumFee is only relevant for PERCENTAGE — passing it for FIXED changes nothing
    expect(calcEcocashFee(100, 'FIXED', 1, 999)).toBe(1)
  })

  it('returns 0 when feeValue is 0', () => {
    expect(calcEcocashFee(50, 'FIXED', 0, 0)).toBe(0)
  })
})

describe('calcEcocashFee — PERCENTAGE type', () => {
  it('calculates percentage of amount', () => {
    // 10% of $10 = $1
    expect(calcEcocashFee(10, 'PERCENTAGE', 10, 0)).toBe(1)
  })

  it('applies minimumFee floor when calculated fee is below it', () => {
    // Mvimvi Groceries: 3.5% of $1.70 = $0.059 → below $0.50 minimum → returns $0.50
    expect(calcEcocashFee(1.70, 'PERCENTAGE', 3.5, 0.50)).toBe(0.50)
  })

  it('returns calculated fee when it exceeds minimumFee', () => {
    // 3.5% of $20 = $0.70 → above $0.50 minimum → returns $0.70
    expect(calcEcocashFee(20, 'PERCENTAGE', 3.5, 0.50)).toBeCloseTo(0.70)
  })

  it('returns calculated fee when minimumFee is 0', () => {
    // 5% of $10 = $0.50, minimumFee=0 → returns $0.50
    expect(calcEcocashFee(10, 'PERCENTAGE', 5, 0)).toBe(0.50)
  })

  it('returns 0 for zero amount with no minimum', () => {
    expect(calcEcocashFee(0, 'PERCENTAGE', 5, 0)).toBe(0)
  })

  it('returns minimumFee for zero amount when minimum is set', () => {
    expect(calcEcocashFee(0, 'PERCENTAGE', 5, 0.50)).toBe(0.50)
  })
})

// ── calcEcocashFeeFromBusiness ───────────────────────────────────────────────

describe('calcEcocashFeeFromBusiness', () => {
  it('calculates FIXED fee from business object', () => {
    const business = { ecocashFeeType: 'FIXED', ecocashFeeValue: 1.00, ecocashMinimumFee: 0 }
    expect(calcEcocashFeeFromBusiness(50, business)).toBe(1.00)
  })

  it('calculates PERCENTAGE fee with minimumFee from business object', () => {
    // Mvimvi scenario: 3.5%, min $0.50, purchase $1.70
    const business = { ecocashFeeType: 'PERCENTAGE', ecocashFeeValue: 3.5, ecocashMinimumFee: 0.50 }
    expect(calcEcocashFeeFromBusiness(1.70, business)).toBe(0.50)
  })

  it('returns 0 for null/undefined business', () => {
    expect(calcEcocashFeeFromBusiness(100, null)).toBe(0)
  })

  it('returns 0 for business with no ecocash config', () => {
    expect(calcEcocashFeeFromBusiness(100, {})).toBe(0)
  })
})

// ── getEcocashSummary ────────────────────────────────────────────────────────

describe('getEcocashSummary', () => {
  it('returns correct fee, total, and feeLabel for FIXED type', () => {
    const business = { ecocashFeeType: 'FIXED', ecocashFeeValue: 0.50, ecocashMinimumFee: 0 }
    const summary = getEcocashSummary(10, business)
    expect(summary.fee).toBe(0.50)
    expect(summary.total).toBe(10.50)
    expect(summary.feeLabel).toBe('Fixed')
  })

  it('returns correct fee, total, and feeLabel for PERCENTAGE type without minimum', () => {
    const business = { ecocashFeeType: 'PERCENTAGE', ecocashFeeValue: 5, ecocashMinimumFee: 0 }
    const summary = getEcocashSummary(100, business)
    expect(summary.fee).toBe(5)
    expect(summary.total).toBe(105)
    expect(summary.feeLabel).toBe('5%')
  })

  it('returns correct fee, total, and feeLabel for PERCENTAGE type with minimum', () => {
    const business = { ecocashFeeType: 'PERCENTAGE', ecocashFeeValue: 3.5, ecocashMinimumFee: 0.50 }
    const summary = getEcocashSummary(1.70, business)
    expect(summary.fee).toBe(0.50)
    expect(summary.total).toBeCloseTo(2.20)
    expect(summary.feeLabel).toBe('3.5%, min $0.50')
  })

  it('total = amount + fee', () => {
    const business = { ecocashFeeType: 'PERCENTAGE', ecocashFeeValue: 10, ecocashMinimumFee: 0 }
    const summary = getEcocashSummary(50, business)
    expect(summary.total).toBe(summary.fee + 50)
  })

  it('handles null business gracefully', () => {
    const summary = getEcocashSummary(100, null)
    expect(summary.fee).toBe(0)
    expect(summary.total).toBe(100)
    expect(summary.feeLabel).toBe('Fixed')
  })
})
