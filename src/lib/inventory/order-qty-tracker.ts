/**
 * Updates lastOrderQty, maxOrderQty, and lastOrderedAt on a BarcodeInventoryItem
 * whenever stock is added (stock take, bulk receive, direct edit, etc.).
 *
 * maxOrderQty is the highest single addition ever recorded (stored on the row).
 * It is updated if the current addition exceeds the stored value.
 */
export function orderQtyFields(addedQty: number, currentMax: number) {
  return {
    lastOrderQty: addedQty,
    maxOrderQty: Math.max(currentMax, addedQty),
    lastOrderedAt: new Date(),
  }
}
