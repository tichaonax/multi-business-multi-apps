/**
 * Currency formatting utilities
 * Provide a lightweight client-safe formatter to avoid pulling server-only modules
 */

export const CURRENCY_CODE = 'USD'
export const CURRENCY_SYMBOL = '$'

export function formatCurrency(amount: number, currencyCode?: string): string {
	const num = Number(amount || 0)
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currencyCode || CURRENCY_CODE,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num)
}

// For compatibility, also provide a default export to match previous usage
export default formatCurrency