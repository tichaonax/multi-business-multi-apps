import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const BulkPriceUpdateSchema = z.object({
  action: z.literal('update_price'),
  productIds: z.array(z.string()).min(1),
  basePrice: z.number().min(0).nullable().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  priceMultiplier: z.number().min(0).optional() // e.g., 1.5 for 50% markup
})

const BulkBarcodeUpdateSchema = z.object({
  action: z.literal('update_barcode'),
  productIds: z.array(z.string()).min(1),
  barcodeAssignments: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    barcodes: z.array(z.object({
      code: z.string(),
      type: z.enum(['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8', 'CODE128', 'CODE39', 'QR_CODE', 'CUSTOM']),
      isPrimary: z.boolean().optional(),
      isUniversal: z.boolean().optional(),
      label: z.string().optional()
    }))
  })).optional(),
  barcodePrefix: z.string().optional(), // Auto-generate with prefix
  barcodeType: z.enum(['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8', 'CODE128', 'CODE39', 'QR_CODE', 'CUSTOM']).optional()
})

const BulkCsvImportSchema = z.object({
  action: z.literal('csv_import'),
  csvData: z.string(), // Base64 encoded CSV content
  businessId: z.string(),
  options: z.object({
    skipDuplicates: z.boolean().optional(),
    updateExisting: z.boolean().optional(),
    validateBarcodes: z.boolean().optional()
  }).optional()
})

const BulkAvailabilityUpdateSchema = z.object({
  action: z.literal('update_availability'),
  productIds: z.array(z.string()).min(1),
  isAvailable: z.boolean()
})

const BulkUpdateSchema = z.discriminatedUnion('action', [
  BulkPriceUpdateSchema,
  BulkBarcodeUpdateSchema,
  BulkCsvImportSchema,
  BulkAvailabilityUpdateSchema
])

// Helper function to parse CSV line (handles quoted values)
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i += 2
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current)
      current = ''
      i++
    } else {
      current += char
      i++
    }
  }

  result.push(current) // Add the last field
  return result
}

// Helper function to validate barcode format
function isValidBarcode(code: string, type: string): boolean {
  switch (type) {
    case 'UPC_A':
      return /^\d{12}$/.test(code) && isValidUpcCheckDigit(code)
    case 'UPC_E':
      return /^\d{6,8}$/.test(code)
    case 'EAN_13':
      return /^\d{13}$/.test(code) && isValidEanCheckDigit(code)
    case 'EAN_8':
      return /^\d{8}$/.test(code) && isValidEanCheckDigit(code)
    case 'CODE128':
    case 'CODE39':
    case 'QR_CODE':
    case 'CUSTOM':
      return code.length > 0 && code.length <= 100 // Basic length validation
    default:
      return false
  }
}

// Helper function to validate UPC check digit
function isValidUpcCheckDigit(upc: string): boolean {
  if (upc.length !== 12) return false

  let sum = 0
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(upc[i])
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(upc[11])
}

// Helper function to validate EAN check digit
function isValidEanCheckDigit(ean: string): boolean {
  const length = ean.length
  if (length !== 8 && length !== 13) return false

  let sum = 0
  for (let i = 0; i < length - 1; i++) {
    const digit = parseInt(ean[i])
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(ean[length - 1])
}

// POST - Bulk operations on products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = BulkUpdateSchema.parse(body)

    let result: any
    let message: string

    switch (validatedData.action) {
      case 'update_price': {
        const updates: any = {}

        if (validatedData.basePrice !== undefined) {
          updates.basePrice = validatedData.basePrice
        }

        if (validatedData.costPrice !== undefined) {
          updates.costPrice = validatedData.costPrice
        }

        // If price multiplier provided, calculate basePrice from costPrice
        if (validatedData.priceMultiplier) {
          // Get products to calculate individual prices
          const products = await prisma.businessProducts.findMany({
            where: {
              id: { in: validatedData.productIds },
              businessType: 'clothing'
            },
            select: { id: true, costPrice: true }
          })

          // Update each product with calculated price
          const updatePromises = products.map(product => {
            if (product.costPrice) {
              const newPrice = Number(product.costPrice) * validatedData.priceMultiplier!
              return prisma.businessProducts.update({
                where: { id: product.id },
                data: {
                  basePrice: newPrice,
                  updatedAt: new Date()
                }
              })
            }
            return null
          })

          result = await Promise.all(updatePromises.filter(p => p !== null))
          message = `Bulk price update completed for ${result.length} products`
        } else {
          // Simple bulk update with fixed values
          result = await prisma.businessProducts.updateMany({
            where: {
              id: { in: validatedData.productIds },
              businessType: 'clothing'
            },
            data: {
              ...updates,
              updatedAt: new Date()
            }
          })
          message = `Bulk price update completed for ${result.count} products`
        }

        break
      }

      case 'update_barcode': {
        if (validatedData.barcodeAssignments) {
          // Update with specific barcode assignments
          const results = []

          for (const assignment of validatedData.barcodeAssignments) {
            const { productId, variantId, barcodes } = assignment

            // Verify product exists
            const product = await prisma.businessProducts.findUnique({
              where: { id: productId },
              include: { productVariants: true }
            })

            if (!product) {
              throw new Error(`Product ${productId} not found`)
            }

            // Determine target ID (product or variant)
            const targetId = variantId || productId
            const isVariant = !!variantId

            // Remove existing barcodes for this target
            await prisma.productBarcodes.deleteMany({
              where: {
                [isVariant ? 'variantId' : 'productId']: targetId
              }
            })

            // Create new barcodes
            const barcodePromises = barcodes.map((barcode, index) => {
              const isFirst = index === 0
              return prisma.productBarcodes.create({
                data: {
                  [isVariant ? 'variantId' : 'productId']: targetId,
                  code: barcode.code,
                  type: barcode.type,
                  isPrimary: barcode.isPrimary !== undefined ? barcode.isPrimary : isFirst,
                  isUniversal: barcode.isUniversal || false,
                  label: barcode.label || null,
                  businessId: barcode.isUniversal ? null : product.businessId,
                  createdAt: new Date()
                }
              })
            })

            const createdBarcodes = await Promise.all(barcodePromises)
            results.push({
              productId,
              variantId,
              barcodesCreated: createdBarcodes.length
            })

            // Update legacy barcode field for backward compatibility
            const primaryBarcode = barcodes.find(b => b.isPrimary) || barcodes[0]
            if (primaryBarcode) {
              if (isVariant) {
                await prisma.productVariants.update({
                  where: { id: variantId! },
                  data: { barcode: primaryBarcode.code }
                })
              } else {
                await prisma.businessProducts.update({
                  where: { id: productId },
                  data: { barcode: primaryBarcode.code }
                })
              }
            }
          }

          result = results
          message = `Bulk barcode assignment completed for ${results.length} products/variants`
        } else if (validatedData.barcodePrefix) {
          // Auto-generate barcodes with prefix
          const products = await prisma.businessProducts.findMany({
            where: {
              id: { in: validatedData.productIds },
              businessType: 'clothing'
            },
            include: { productVariants: true }
          })

          const results = []

          for (let i = 0; i < products.length; i++) {
            const product = products[i]
            const barcodeType = validatedData.barcodeType || 'CODE128'
            const barcodeCode = `${validatedData.barcodePrefix}${String(i + 1).padStart(6, '0')}`

            // Create barcode record
            const barcode = await prisma.productBarcodes.create({
              data: {
                productId: product.id,
                code: barcodeCode,
                type: barcodeType,
                isPrimary: true,
                isUniversal: false,
                label: 'Auto-generated',
                businessId: product.businessId,
                createdAt: new Date()
              }
            })

            // Update legacy field
            await prisma.businessProducts.update({
              where: { id: product.id },
              data: { barcode: barcodeCode }
            })

            results.push({
              productId: product.id,
              barcode: barcodeCode,
              type: barcodeType
            })
          }

          result = results
          message = `Auto-generated barcodes for ${results.length} products`
        } else {
          return NextResponse.json(
            { success: false, error: 'Either barcodeAssignments or barcodePrefix must be provided' },
            { status: 400 }
          )
        }

        break
      }

      case 'csv_import': {
        // Parse CSV data
        const csvContent = Buffer.from(validatedData.csvData, 'base64').toString('utf-8')
        const lines = csvContent.split('\n').filter(line => line.trim())

        if (lines.length < 2) {
          return NextResponse.json(
            { success: false, error: 'CSV must contain at least a header row and one data row' },
            { status: 400 }
          )
        }

        // Parse header row
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        const requiredHeaders = ['name', 'sku']
        const optionalHeaders = ['description', 'basePrice', 'costPrice', 'category', 'barcode1', 'barcode1Type', 'barcode1Label', 'barcode2', 'barcode2Type', 'barcode2Label', 'barcode3', 'barcode3Type', 'barcode3Label']

        for (const required of requiredHeaders) {
          if (!headers.includes(required)) {
            return NextResponse.json(
              { success: false, error: `CSV must contain required column: ${required}` },
              { status: 400 }
            )
          }
        }

        // Parse data rows
        const importResults = {
          imported: 0,
          skipped: 0,
          errors: [] as string[]
        }

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCsvLine(lines[i])
            if (values.length !== headers.length) continue

            const rowData: any = {}
            headers.forEach((header, index) => {
              rowData[header] = values[index]?.trim().replace(/"/g, '') || ''
            })

            // Validate required fields
            if (!rowData.name || !rowData.sku) {
              importResults.errors.push(`Row ${i + 1}: Missing required fields (name or sku)`)
              continue
            }

            // Check for existing product
            const existingProduct = await prisma.businessProducts.findFirst({
              where: {
                businessId: validatedData.businessId,
                sku: rowData.sku
              }
            })

            if (existingProduct && !validatedData.options?.updateExisting) {
              if (validatedData.options?.skipDuplicates) {
                importResults.skipped++
                continue
              } else {
                importResults.errors.push(`Row ${i + 1}: Product with SKU ${rowData.sku} already exists`)
                continue
              }
            }

            // Find or create category
            let categoryId = null
            if (rowData.category) {
              const category = await prisma.businessCategories.upsert({
                where: {
                  businessId_name: {
                    businessId: validatedData.businessId,
                    name: rowData.category
                  }
                },
                update: {},
                create: {
                  businessId: validatedData.businessId,
                  name: rowData.category,
                  businessType: 'clothing'
                }
              })
              categoryId = category.id
            }

            // Create or update product
            const productData = {
              businessId: validatedData.businessId,
              businessType: 'clothing' as const,
              name: rowData.name,
              sku: rowData.sku,
              description: rowData.description || null,
              basePrice: rowData.basePrice ? parseFloat(rowData.basePrice) : 0,
              costPrice: rowData.costPrice ? parseFloat(rowData.costPrice) : null,
              categoryId,
              barcode: null, // Will be set by barcode creation
              isActive: true,
              isAvailable: true
            }

            const product = existingProduct
              ? await prisma.businessProducts.update({
                  where: { id: existingProduct.id },
                  data: productData
                })
              : await prisma.businessProducts.create({ data: productData })

            // Create barcodes
            const barcodesToCreate = []

            for (let j = 1; j <= 3; j++) {
              const barcodeKey = `barcode${j}`
              const typeKey = `barcode${j}Type`
              const labelKey = `barcode${j}Label`

              if (rowData[barcodeKey]) {
                const barcodeType = rowData[typeKey] || 'CUSTOM'
                const isValidType = ['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8', 'CODE128', 'CODE39', 'QR_CODE', 'CUSTOM'].includes(barcodeType)

                if (!isValidType) {
                  importResults.errors.push(`Row ${i + 1}: Invalid barcode type ${barcodeType} for ${barcodeKey}`)
                  continue
                }

                // Validate barcode format if requested
                if (validatedData.options?.validateBarcodes) {
                  if (!isValidBarcode(rowData[barcodeKey], barcodeType)) {
                    importResults.errors.push(`Row ${i + 1}: Invalid ${barcodeType} format for barcode: ${rowData[barcodeKey]}`)
                    continue
                  }
                }

                barcodesToCreate.push({
                  productId: product.id,
                  code: rowData[barcodeKey],
                  type: barcodeType,
                  isPrimary: j === 1, // First barcode is primary
                  isUniversal: barcodeType.startsWith('UPC') || barcodeType.startsWith('EAN'),
                  label: rowData[labelKey] || null,
                  businessId: barcodeType.startsWith('UPC') || barcodeType.startsWith('EAN') ? null : validatedData.businessId
                })
              }
            }

            // Remove existing barcodes if updating
            if (existingProduct) {
              await prisma.productBarcodes.deleteMany({
                where: { productId: product.id }
              })
            }

            // Create new barcodes
            if (barcodesToCreate.length > 0) {
              await prisma.productBarcodes.createMany({
                data: barcodesToCreate
              })

              // Set legacy barcode field to primary barcode
              const primaryBarcode = barcodesToCreate.find(b => b.isPrimary) || barcodesToCreate[0]
              await prisma.businessProducts.update({
                where: { id: product.id },
                data: { barcode: primaryBarcode.code }
              })
            }

            importResults.imported++

          } catch (error: any) {
            importResults.errors.push(`Row ${i + 1}: ${error.message}`)
          }
        }

        result = importResults
        message = `CSV import completed: ${importResults.imported} imported, ${importResults.skipped} skipped, ${importResults.errors.length} errors`

        break
      }

      case 'update_availability': {
        result = await prisma.businessProducts.updateMany({
          where: {
            id: { in: validatedData.productIds },
            businessType: 'clothing'
          },
          data: {
            isAvailable: validatedData.isAvailable,
            updatedAt: new Date()
          }
        })

        message = `Bulk availability update completed for ${result.count} products`
        break
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message
    })
  } catch (error: any) {
    console.error('Error in bulk operation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid bulk operation data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
