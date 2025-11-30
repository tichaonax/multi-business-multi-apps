/**
 * Currency formatting utilities
 * Provide a lightweight client-safe formatter to avoid pulling server-only modules
 */

export function formatCurrency(amount: number): string {
	const num = Number(amount || 0)
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num)
}

// For compatibility, also provide a default export to match previous usage
export default formatCurrency