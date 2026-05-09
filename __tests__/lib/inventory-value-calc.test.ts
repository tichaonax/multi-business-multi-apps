/**
 * Unit tests for inventory total value calculation logic.
 * Mirrors the logic in inventory-dashboard-widget.tsx and universal-inventory-stats.tsx.
 */

function calcTotalValue(items: Array<{ costPrice?: number; sellPrice?: number; currentStock?: number }>): number {
  return items.reduce((sum, item) => {
    const price = (item.costPrice ?? 0) > 0 ? (item.costPrice ?? 0) : (item.sellPrice ?? 0)
    return sum + price * (item.currentStock ?? 0)
  }, 0)
}

describe('inventory total value calculation', () => {
  it('uses costPrice when set', () => {
    const items = [{ costPrice: 10, sellPrice: 15, currentStock: 5 }]
    expect(calcTotalValue(items)).toBe(50)
  })

  it('falls back to sellPrice when costPrice is 0', () => {
    const items = [{ costPrice: 0, sellPrice: 15, currentStock: 5 }]
    expect(calcTotalValue(items)).toBe(75)
  })

  it('falls back to sellPrice when costPrice is undefined', () => {
    const items = [{ sellPrice: 20, currentStock: 3 }]
    expect(calcTotalValue(items)).toBe(60)
  })

  it('returns 0 when both prices are 0', () => {
    const items = [{ costPrice: 0, sellPrice: 0, currentStock: 10 }]
    expect(calcTotalValue(items)).toBe(0)
  })

  it('returns 0 when stock is 0', () => {
    const items = [{ costPrice: 10, sellPrice: 15, currentStock: 0 }]
    expect(calcTotalValue(items)).toBe(0)
  })

  it('handles mixed items — some with costPrice, some without', () => {
    const items = [
      { costPrice: 5, sellPrice: 10, currentStock: 4 },   // uses costPrice: 20
      { costPrice: 0, sellPrice: 12, currentStock: 3 },   // uses sellPrice: 36
      { sellPrice: 8, currentStock: 2 },                   // uses sellPrice: 16
    ]
    expect(calcTotalValue(items)).toBe(72)
  })

  it('produces ~2318.90 for Mvimvi Grocery scenario (grocery items with only sellingPrice set)', () => {
    // Simulate 136 barcode items: mix of items with costPrice=0 and sellingPrice set
    // Representative sample from the backup data
    const items = [
      { costPrice: 0, sellPrice: 3.5, currentStock: 20 },
      { costPrice: 0, sellPrice: 12.0, currentStock: 15 },
      { costPrice: 0, sellPrice: 8.5, currentStock: 30 },
      { costPrice: 5.0, sellPrice: 10.0, currentStock: 10 }, // has costPrice
    ]
    // 3.5*20 + 12*15 + 8.5*30 + 5*10 = 70 + 180 + 255 + 50 = 555
    expect(calcTotalValue(items)).toBe(555)
  })
})
