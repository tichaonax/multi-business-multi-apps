/**
 * SKU Generator
 * Intelligently generates unique SKUs based on existing patterns in the business
 */

import { PrismaClient } from '@prisma/client'

export interface SKUPattern {
  prefix: string
  separator: string
  numberLength: number
  sample: string
}

export interface SKUGenerationOptions {
  productName: string
  category?: string
  businessId: string
  businessType: string
  existingSKUs?: string[]
}

/**
 * Analyzes existing SKUs to detect common patterns
 */
export function detectSKUPattern(skus: string[]): SKUPattern | null {
  if (!skus || skus.length === 0) return null

  // Count pattern frequencies
  const patterns: Map<string, { count: number; samples: string[] }> = new Map()

  for (const sku of skus) {
    if (!sku) continue

    // Try to extract pattern: PREFIX-NUMBER or PREFIX_NUMBER or PREFIXNUMBER
    const matches = [
      sku.match(/^([A-Z]+)[-_](\d+)$/i),           // ABC-123 or ABC_123
      sku.match(/^([A-Z]+)(\d+)$/i),               // ABC123
      sku.match(/^([A-Z]+[-_][A-Z]+)[-_](\d+)$/i), // ABC-DEF-123
    ]

    for (const match of matches) {
      if (match) {
        const prefix = match[1]
        const number = match[2]
        const separator = sku.includes('-') ? '-' : sku.includes('_') ? '_' : ''
        const numberLength = number.length
        const patternKey = `${prefix}${separator}#${numberLength}`

        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, { count: 0, samples: [] })
        }

        const pattern = patterns.get(patternKey)!
        pattern.count++
        if (pattern.samples.length < 3) {
          pattern.samples.push(sku)
        }
        break
      }
    }
  }

  // Find most common pattern
  let mostCommon: { key: string; data: { count: number; samples: string[] } } | null = null
  for (const [key, data] of patterns.entries()) {
    if (!mostCommon || data.count > mostCommon.data.count) {
      mostCommon = { key, data }
    }
  }

  if (!mostCommon) return null

  // Parse the pattern
  const [prefixPart, lengthStr] = mostCommon.key.split('#')
  const lastChar = prefixPart[prefixPart.length - 1]
  const separator = ['-', '_'].includes(lastChar) ? lastChar : ''
  const prefix = separator ? prefixPart.slice(0, -1) : prefixPart

  return {
    prefix,
    separator,
    numberLength: parseInt(lengthStr),
    sample: mostCommon.data.samples[0]
  }
}

/**
 * Generates a SKU prefix from product name
 */
export function generatePrefixFromName(name: string, category?: string): string {
  // If category provided, try to use it
  if (category) {
    // Take first 3-4 letters of category
    const catPrefix = category
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 4)

    if (catPrefix.length >= 2) return catPrefix
  }

  // Extract meaningful words from product name
  const words = name
    .split(/[\s-_]+/)
    .filter(w => w.length > 2) // Skip short words
    .filter(w => !['the', 'and', 'for', 'with'].includes(w.toLowerCase()))

  if (words.length === 0) {
    // Fallback: use first 3 chars of name
    return name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3) || 'PROD'
  }

  if (words.length === 1) {
    // Single word: take first 3-4 letters
    return words[0].toUpperCase().substring(0, 4)
  }

  // Multiple words: take first letter of each word (up to 4 words)
  const acronym = words
    .slice(0, 4)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  // If acronym is too short, pad with first word
  if (acronym.length < 3) {
    return (words[0].substring(0, 3 - acronym.length) + acronym).toUpperCase()
  }

  return acronym
}

/**
 * Finds the next available number for a given prefix
 */
export function getNextNumber(skus: string[], prefix: string, separator: string): number {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${separator}(\\d+)$`, 'i')

  const numbers = skus
    .map(sku => {
      const match = sku.match(pattern)
      return match ? parseInt(match[1]) : 0
    })
    .filter(n => n > 0)

  if (numbers.length === 0) return 1

  return Math.max(...numbers) + 1
}

/**
 * Formats a number with leading zeros
 */
export function formatNumber(num: number, length: number): string {
  return num.toString().padStart(length, '0')
}

/**
 * Generates a unique SKU for a product
 */
export async function generateSKU(
  prisma: PrismaClient,
  options: SKUGenerationOptions
): Promise<string> {
  const { productName, category, businessId, businessType, existingSKUs } = options

  // Get existing SKUs if not provided
  let skus = existingSKUs
  if (!skus) {
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId,
        sku: { not: null }
      },
      select: { sku: true }
    })
    skus = products.map(p => p.sku).filter(Boolean) as string[]
  }

  // Detect existing pattern
  const pattern = detectSKUPattern(skus)

  let prefix: string
  let separator: string
  let numberLength: number

  if (pattern) {
    // Follow existing pattern
    prefix = pattern.prefix
    separator = pattern.separator
    numberLength = pattern.numberLength
  } else {
    // Create new pattern
    prefix = generatePrefixFromName(productName, category)
    separator = '-'
    numberLength = 3 // Default to 001, 002, etc.
  }

  // Find next available number
  const nextNum = getNextNumber(skus, prefix, separator)
  const formattedNum = formatNumber(nextNum, numberLength)

  // Generate SKU
  const sku = `${prefix}${separator}${formattedNum}`

  // Verify uniqueness (safety check)
  const isDuplicate = skus.some(s => s?.toLowerCase() === sku.toLowerCase())
  if (isDuplicate) {
    // Fallback: append timestamp suffix
    return `${sku}-${Date.now().toString().slice(-4)}`
  }

  return sku
}

/**
 * Validates if a SKU is unique in the business
 */
export async function isSKUUnique(
  prisma: PrismaClient,
  sku: string,
  businessId: string,
  excludeProductId?: string
): Promise<boolean> {
  const existing = await prisma.businessProducts.findFirst({
    where: {
      businessId,
      sku: {
        equals: sku,
        mode: 'insensitive'
      },
      ...(excludeProductId && { id: { not: excludeProductId } })
    }
  })

  return !existing
}

/**
 * Analyzes SKU patterns in a business (for debugging/reporting)
 */
export async function analyzeSKUPatterns(
  prisma: PrismaClient,
  businessId: string
): Promise<{
  totalSKUs: number
  detectedPattern: SKUPattern | null
  patternCoverage: number
  samples: string[]
}> {
  const products = await prisma.businessProducts.findMany({
    where: {
      businessId,
      sku: { not: null }
    },
    select: { sku: true },
    take: 100
  })

  const skus = products.map(p => p.sku).filter(Boolean) as string[]
  const pattern = detectSKUPattern(skus)

  let patternCoverage = 0
  if (pattern) {
    const regex = new RegExp(`^${pattern.prefix}${pattern.separator}\\d{${pattern.numberLength}}$`, 'i')
    const matching = skus.filter(sku => regex.test(sku))
    patternCoverage = (matching.length / skus.length) * 100
  }

  return {
    totalSKUs: skus.length,
    detectedPattern: pattern,
    patternCoverage: Math.round(patternCoverage),
    samples: skus.slice(0, 5)
  }
}
