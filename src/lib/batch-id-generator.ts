/**
 * Generate a unique 3-character batch ID
 * Format: Alphanumeric (A-Z, 0-9)
 * Examples: A01, B12, Z99, X7K
 */
export function generateBatchId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  // Generate 3 random characters
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Format batch ID with quantity prefix
 * @param quantity - Number of items in this batch
 * @param batchId - The batch identifier
 * @returns Formatted string like "50-A01" or "100-B12"
 */
export function formatBatchWithQuantity(quantity: number, batchId: string): string {
  return `${quantity}-${batchId}`;
}

/**
 * Validate batch ID format
 * Must be 1-10 alphanumeric characters
 */
export function isValidBatchId(batchId: string): boolean {
  if (!batchId || batchId.length < 1 || batchId.length > 10) {
    return false;
  }

  // Only alphanumeric characters and hyphens allowed
  return /^[A-Z0-9-]+$/i.test(batchId);
}
