import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hasPermission, isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { processBusinessTransaction, initializeBusinessAccount } from '@/lib/business-balance-utils'
import { generateAndSellR710Token } from '@/lib/r710/generate-and-sell-token'
import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
// Validation schemas
const CreateOrderItemSchema = z.object({
  productVariantId: z.string().min(1).nullable(), // Nullable for WiFi tokens
  quantity: z.number().min(0.001),  // Changed from int to decimal to support weight-based items
  unitPrice: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) {
        throw new Error('Invalid unit price: must be a valid number');
      }
      return parsed;
    }
    return val;
  }).refine((val) => val >= 0, 'Unit price must be non-negative'),
  discountAmount: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) {
        throw new Error('Invalid discount amount: must be a valid number');
      }
      return parsed;
    }
    return val;
  }).refine((val) => val >= 0, 'Discount amount must be non-negative').default(0),
  attributes: z.record(z.string(), z.any()).optional() // Business-specific order item data
})

const CreateOrderSchema = z.object({
  businessId: z.string().min(1),
  customerId: z.string().nullable().optional(), // Legacy: BusinessCustomer ID - nullable for walk-in customers
  divisionAccountId: z.string().nullable().optional(), // New: CustomerDivisionAccount ID - nullable for walk-in customers
  employeeId: z.string().nullable().optional(),
  orderType: z.enum(['SALE', 'RETURN', 'EXCHANGE', 'SERVICE', 'RENTAL', 'SUBSCRIPTION']).default('SALE'),
  paymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'STORE_CREDIT', 'LAYAWAY', 'NET_30', 'CHECK']).optional(),
  discountAmount: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) {
        throw new Error('Invalid discount amount: must be a valid number');
      }
      return parsed;
    }
    return val;
  }).refine((val) => val >= 0, 'Discount amount must be non-negative').default(0),
  taxAmount: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) {
        throw new Error('Invalid tax amount: must be a valid number');
      }
      return parsed;
    }
    return val;
  }).refine((val) => val >= 0, 'Tax amount must be non-negative').default(0),
  businessType: z.string().min(1),
  attributes: z.record(z.string(), z.any()).optional(), // Business-specific order data
  notes: z.string().optional(),
  items: z.array(CreateOrderItemSchema).min(1)
})

const UpdateOrderSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'REFUNDED', 'FAILED']).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'STORE_CREDIT', 'LAYAWAY', 'NET_30', 'CHECK']).optional(),
  notes: z.string().optional(),
  attributes: z.record(z.string(), z.any()).optional(),
  // Partial refund fields
  refundItems: z.array(z.object({
    orderItemId: z.string().min(1),
    quantity: z.number().int().min(1)
  })).optional(),
  refundReason: z.string().optional()
})

// Generate order number based on business type
function generateOrderNumber(businessType: string, orderCount: number): string {
  const prefix = {
    clothing: 'CLO',
    hardware: 'HWD',
    grocery: 'GRC',
    restaurant: 'RST',
    consulting: 'CON',
    services: 'SVC',
    retail: 'RTL',
    construction: 'CTN',
    vehicles: 'VEH'
  }[businessType] || 'BIZ'

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counter = String(orderCount + 1).padStart(4, '0')
  return `${prefix}-${date}-${counter}`
}

// GET - Fetch orders for a business
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const customerId = searchParams.get('customerId')
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const orderType = searchParams.get('orderType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeItems = searchParams.get('includeItems') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Check if user has permission to access financial data for this business
    const isAdmin = isSystemAdmin(user)
    console.log('User permissions check:', {
      userId: user.id,
      userRole: user.role,
      isSystemAdmin: isAdmin,
      businessId,
      businessMemberships: user.businessMemberships?.map(m => ({
        businessId: m.businessId,
        role: m.role,
        permissions: m.permissions
      }))
    })

    if (!isAdmin) {
      const hasFinancialAccess = hasPermission(user, 'canAccessFinancialData', businessId)
      console.log('Non-admin user financial access check:', { businessId, hasFinancialAccess })
      if (!hasFinancialAccess) {
        return NextResponse.json({ error: 'Insufficient permissions to access financial data' }, { status: 403 })
      }
    }

    const where: any = { businessId }

    if (customerId) where.customerId = customerId
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status as any
    if (paymentStatus) where.paymentStatus = paymentStatus as any
    if (orderType) where.orderType = orderType as any

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [orders, totalCount] = await Promise.all([
      prisma.businessOrders.findMany({
        where,
        include: {
          businesses: {
            select: { name: true, type: true }
          },
          business_customers: {
            select: { id: true, name: true, customerNumber: true }
          },
          employees: {
            select: { id: true, fullName: true, employeeNumber: true }
          },
          ...(includeItems && {
            business_order_items: {
              include: {
                product_variants: {
                  include: {
                    business_products: {
                      select: { name: true, productType: true }
                    }
                  }
                }
              }
            }
          })
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.businessOrders.count({ where })
    ])

    // Calculate summary statistics
    const summary = await prisma.businessOrders.aggregate({
      where,
      _sum: {
        totalAmount: true,
        subtotal: true,
        taxAmount: true,
        discountAmount: true
      },
      _count: true
    })

    // Calculate completed and pending revenue for all orders matching filters
    const completedRevenueResult = await prisma.businessOrders.aggregate({
      where: {
        ...where,
        status: 'COMPLETED'
      },
      _sum: {
        totalAmount: true
      }
    })

    const pendingRevenueResult = await prisma.businessOrders.aggregate({
      where: {
        ...where,
        status: {
          not: 'COMPLETED'
        }
      },
      _sum: {
        totalAmount: true
      }
    })

    // Count pending orders
    const pendingOrdersCount = await prisma.businessOrders.count({
      where: {
        ...where,
        status: 'PENDING'
      }
    })

    // Transform orders to match expected frontend structure
    const transformedOrders = orders.map(order => ({
      ...order,
      items: order.business_order_items?.map(item => ({
        id: item.id,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        totalPrice: item.totalPrice,
        productName: item.product_variants?.business_products?.name || (item.attributes as any)?.productName || 'Unknown Product',
        variantName: item.product_variants?.name || (item.attributes as any)?.variantName || '',
        attributes: item.attributes
      })) || []
    }))

    return NextResponse.json({
      success: true,
      data: transformedOrders,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + orders.length < totalCount,
        summary: {
          totalOrders: summary._count,
          totalAmount: summary._sum.totalAmount || 0,
          totalSubtotal: summary._sum.subtotal || 0,
          totalTax: summary._sum.taxAmount || 0,
          totalDiscount: summary._sum.discountAmount || 0,
          completedRevenue: completedRevenueResult._sum.totalAmount || 0,
          pendingRevenue: pendingRevenueResult._sum.totalAmount || 0,
          pendingOrders: pendingOrdersCount
        }
      }
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const validatedData = CreateOrderSchema.parse(body)

    const { items, ...orderData } = validatedData

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: orderData.businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify customer exists if specified (supports both old and new systems)
    if (orderData.customerId) {
      const customer = await prisma.businessCustomers.findFirst({
        where: {
          id: orderData.customerId,
          businessId: orderData.businessId
        }
      })

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found in BusinessCustomer table' },
          { status: 404 }
        )
      }
    }

    // Verify division account exists if specified (new system)
    if (orderData.divisionAccountId) {
      const divisionAccount = await prisma.customerDivisionAccount.findFirst({
        where: {
          id: orderData.divisionAccountId,
          businessId: orderData.businessId,
          isActive: true
        }
      })

      if (!divisionAccount) {
        return NextResponse.json(
          { error: 'Customer division account not found or inactive' },
          { status: 404 }
        )
      }
    }

    // Verify employee exists if specified (but don't fail if not found - might be admin/user ID)
    if (orderData.employeeId) {
      const employee = await prisma.employees.findUnique({
        where: { id: orderData.employeeId }
      })

      if (!employee) {
        console.warn(`Employee ID ${orderData.employeeId} not found in employees table - might be admin/user. Order will proceed without employee link.`)
        // Remove employeeId if not found so order creation doesn't fail
        orderData.employeeId = undefined
      }
    }

    // Separate WiFi tokens (ESP32), R710 tokens, and regular products
    const wifiTokenItems = items.filter(item => item.attributes?.wifiToken === true)
    const r710TokenItems = items.filter(item => item.attributes?.r710Token === true)
    const regularItems = items.filter(item => item.attributes?.wifiToken !== true && item.attributes?.r710Token !== true && item.attributes?.businessService !== true && item.attributes?.isService !== true && !item.attributes?.baleId)

    // Verify all product variants exist and get their details (for regular items only)
    const variantIds = regularItems.map(item => item.productVariantId).filter(Boolean) as string[]
    const variants = await prisma.productVariants.findMany({
      where: {
        id: { in: variantIds },
        isActive: true,
        productId: {
          in: (await prisma.businessProducts.findMany({
            where: {
              businessId: orderData.businessId,
              isActive: true
            },
            select: { id: true }
          })).map(p => p.id)
        }
      },
      include: {
        business_products: {
          select: { name: true, productType: true, businessType: true }
        }
      }
    })

    if (variants.length !== variantIds.length) {
      const foundIds = variants.map(v => v.id)
      const missingIds = variantIds.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Product variants not found: ${missingIds.join(', ')}` },
        { status: 404 }
      )
    }

    // Check stock availability for physical products (regular items only)
    const stockIssues = []
    for (const item of regularItems) {
      if (!item.productVariantId) continue
      const variant = variants.find(v => v.id === item.productVariantId)
      if (!variant) continue
      if ((variant as any).business_products?.productType === 'PHYSICAL' && variant.stockQuantity < item.quantity) {
        stockIssues.push({
          variantId: item.productVariantId,
          requested: item.quantity,
          available: variant.stockQuantity
        })
      }
    }

    if (stockIssues.length > 0) {
      return NextResponse.json(
        { error: 'Insufficient stock', details: stockIssues },
        { status: 409 }
      )
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = items.map(item => {
      const itemTotal = (item.unitPrice * item.quantity) - item.discountAmount
      subtotal += itemTotal
      return {
        ...item,
        totalPrice: itemTotal
      }
    })

    // Cap discount so it never exceeds order value (prevents negative totals from oversized coupons)
    const effectiveDiscount = Math.min(orderData.discountAmount, subtotal + orderData.taxAmount)
    const totalAmount = subtotal + orderData.taxAmount - effectiveDiscount

    // Get current order count for order number generation
    const orderCount = await prisma.businessOrders.count({
      where: { businessId: orderData.businessId }
    })

    const orderNumber = generateOrderNumber(orderData.businessType, orderCount)

    // Create order with items in a transaction
    // Extended timeout for R710 on-the-fly token generation (external device API call)
    const result = await prisma.$transaction(async (tx) => {
      // Create the order with nested items
      const order = await tx.businessOrders.create({
        data: {
          businessId: orderData.businessId,
          customerId: orderData.customerId,
          employeeId: orderData.employeeId,
          orderType: orderData.orderType,
          paymentMethod: orderData.paymentMethod,
          discountAmount: effectiveDiscount,
          taxAmount: orderData.taxAmount,
          businessType: orderData.businessType || business.type,
          attributes: orderData.attributes,
          notes: orderData.notes,
          orderNumber,
          subtotal,
          totalAmount,
          // POS orders with immediate payment are completed right away
          status: orderData.attributes?.posOrder && orderData.paymentMethod ? 'COMPLETED' : 'PENDING',
          paymentStatus: orderData.attributes?.posOrder && orderData.paymentMethod ? 'PAID' : 'PENDING',
          updatedAt: new Date(),
          business_order_items: {
            create: orderItems.map(item => {
              const orderItem: any = {
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountAmount: item.discountAmount,
                totalPrice: item.totalPrice,
                attributes: item.attributes
              };

              // For regular products: use connect (Prisma sets productVariantId automatically)
              // For virtual items (WiFi tokens, services): don't set productVariantId at all
              const isVirtualItem = item.attributes?.wifiToken || item.attributes?.r710Token || item.attributes?.businessService || item.attributes?.isService
              if (item.productVariantId && !isVirtualItem) {
                orderItem.product_variants = {
                  connect: { id: item.productVariantId }
                };
              }
              // If productVariantId is null, don't set anything - let Prisma handle it

              return orderItem;
            })
          }
        },
        include: {
          businesses: { select: { name: true, type: true } },
          business_customers: { select: { id: true, name: true, customerNumber: true } },
          employees: { select: { id: true, fullName: true, employeeNumber: true } },
          business_order_items: true
        }
      })

      // Get the created items from the order
      const createdItems = order.business_order_items

      // Update stock for physical products (regular items only)
      for (const item of regularItems) {
        const variant = variants.find(v => v.id === item.productVariantId)!
        if ((variant as any).businessProducts?.productType === 'PHYSICAL') {
          await tx.product_variants.update({
            where: { id: item.productVariantId },
            data: {
              stockQuantity: {
                decrement: item.quantity
              }
            }
          })

          // Create stock movement record
          await tx.businessStockMovements.create({
            data: {
              businessId: orderData.businessId,
              productVariantId: item.productVariantId,
              movementType: 'SALE',
              quantity: -item.quantity,
              unitCost: item.unitPrice,
              reference: orderNumber,
              employeeId: orderData.employeeId,
              businessType: orderData.businessType,
              attributes: {
                orderId: order.id,
                orderType: orderData.orderType
              }
            }
          })
        }
      }

      // Decrement bale remaining counts for clothing bale items
      const baleItems = items.filter(item => item.attributes?.baleId)
      if (baleItems.length > 0) {
        // Group by baleId and sum quantities (exclude BOGO free items)
        const baleQuantities: Record<string, number> = {}
        for (const item of baleItems) {
          const baleId = item.attributes!.baleId as string
          if (!item.attributes?.isBOGOFree) {
            baleQuantities[baleId] = (baleQuantities[baleId] || 0) + item.quantity
          }
        }

        for (const [baleId, qty] of Object.entries(baleQuantities)) {
          await tx.clothingBales.update({
            where: { id: baleId },
            data: {
              remainingCount: { decrement: qty }
            }
          })
        }
      }

      // Record coupon usage if a coupon was applied
      if (orderData.attributes?.couponId) {
        const couponId = orderData.attributes.couponId as string
        const couponDiscount = Math.min(
          Number(orderData.attributes.couponDiscount) || orderData.discountAmount,
          effectiveDiscount
        )

        // Verify coupon exists and is active
        const coupon = await tx.coupons.findUnique({
          where: { id: couponId }
        })

        if (coupon && coupon.isActive) {
          const couponCustomerPhone = orderData.attributes.couponCustomerPhone as string | undefined
          await tx.couponUsages.create({
            data: {
              couponId: coupon.id,
              orderId: order.id,
              appliedAmount: couponDiscount,
              approvedBy: orderData.employeeId || null,
              customerPhone: couponCustomerPhone || null
            }
          })
        }
      }

      // Process WiFi token items - USE EXISTING TOKENS from database
      const generatedWifiTokens = []

      if (wifiTokenItems.length > 0) {
        // Fetch WiFi portal integration to get expense account ID
        const integration = await tx.portalIntegrations.findUnique({
          where: { businessId: orderData.businessId }
        })

        if (integration && integration.expenseAccountId) {
          const expenseAccountId = integration.expenseAccountId

          // Fetch SSID from ESP32 Access Point
          let esp32Ssid = 'Guest WiFi'
          try {
            const apInfoResponse = await fetch(`http://${integration.portalIpAddress}:${integration.portalPort}/api/ap/info`)
            if (apInfoResponse.ok) {
              const apInfo = await apInfoResponse.json()
              if (apInfo.success && apInfo.ap_ssid) {
                esp32Ssid = apInfo.ap_ssid
                console.log('Fetched ESP32 SSID:', esp32Ssid)
              }
            }
          } catch (apError) {
            console.warn('Failed to fetch ESP32 SSID, using default:', apError)
          }

          for (const item of wifiTokenItems) {
            const itemPrice = item.unitPrice
            const itemQuantity = item.quantity
            const tokenConfigId = item.attributes?.tokenConfigId

            if (!tokenConfigId) {
              console.error('Missing tokenConfigId in WiFi token item attributes')
              generatedWifiTokens.push({
                itemName: item.attributes?.productName || 'WiFi Token',
                success: false,
                error: 'Missing token configuration ID'
              })
              continue
            }

            // Get token configuration
            const tokenConfig = await tx.tokenConfigurations.findUnique({
              where: { id: tokenConfigId }
            })

            if (!tokenConfig) {
              console.error('Token configuration not found:', tokenConfigId)
              generatedWifiTokens.push({
                itemName: item.attributes?.productName || 'WiFi Token',
                success: false,
                error: 'Token configuration not found'
              })
              continue
            }

            // Find available tokens (ACTIVE status, not yet sold)
            for (let i = 0; i < itemQuantity; i++) {
              try {
                // Find an UNUSED token that hasn't been sold yet
                const availableToken = await tx.wifiTokens.findFirst({
                  where: {
                    businessId: orderData.businessId,
                    tokenConfigId: tokenConfigId,
                    status: 'UNUSED',
                    wifi_token_sales: {
                      none: {} // No sales records = not sold
                    }
                  },
                  include: {
                    token_configurations: true
                  }
                })

                if (!availableToken) {
                  throw new Error('No available tokens. Please create more tokens in WiFi Portal.')
                }

                // CRITICAL: Verify token exists on ESP32 before completing sale
                try {
                  const esp32VerifyResponse = await fetch(
                    `http://${integration.portalIpAddress}:${integration.portalPort}/api/token/info?token=${availableToken.token}&api_key=${integration.apiKey}`,
                    {
                      signal: AbortSignal.timeout(3000) // 3 second timeout
                    }
                  )

                  if (!esp32VerifyResponse.ok) {
                    throw new Error(`ESP32 verification failed: ${esp32VerifyResponse.status}`)
                  }

                  const esp32TokenInfo = await esp32VerifyResponse.json()

                  if (!esp32TokenInfo.success) {
                    throw new Error('Token not found on ESP32 device')
                  }

                  console.log('✅ ESP32 verified token:', availableToken.token)
                } catch (esp32Error) {
                  console.error('❌ ESP32 verification failed for token:', availableToken.token, esp32Error)

                  // More specific error messages
                  if (esp32Error instanceof Error) {
                    if (esp32Error.name === 'AbortError' || esp32Error.message.includes('timeout')) {
                      throw new Error(`WiFi Portal not responding. Please check ESP32 device is online at ${integration.portalIpAddress}:${integration.portalPort}`)
                    } else if (esp32Error.message.includes('ECONNREFUSED') || esp32Error.message.includes('fetch failed')) {
                      throw new Error(`Cannot connect to WiFi Portal at ${integration.portalIpAddress}:${integration.portalPort}. Please check device is powered on.`)
                    }
                  }

                  throw new Error(`WiFi Portal integration error: ${esp32Error instanceof Error ? esp32Error.message : 'Cannot verify token'}`)
                }

                // Create sale record to mark token as sold
                await tx.wifiTokenSales.create({
                  data: {
                    businessId: orderData.businessId,
                    wifiTokenId: availableToken.id,
                    expenseAccountId: expenseAccountId,
                    saleAmount: itemPrice,
                    paymentMethod: orderData.paymentMethod || 'CASH',
                    saleChannel: 'POS',
                    soldBy: user.id,
                    soldAt: new Date(),
                    receiptPrinted: false
                  }
                })

                // Add to response with ESP32 SSID
                generatedWifiTokens.push({
                  itemName: item.attributes?.productName || 'WiFi Token',
                  tokenCode: availableToken.token,
                  packageName: tokenConfig.name,
                  duration: tokenConfig.durationMinutes,
                  ssid: esp32Ssid,
                  success: true
                })

              } catch (tokenError) {
                const errorMessage = tokenError instanceof Error ? tokenError.message : 'Unknown error'
                console.error('❌ WiFi token processing error:', errorMessage)

                // WiFi token errors should rollback the entire transaction
                // User needs to retry without WiFi token or fix ESP32 integration
                throw new Error(`WiFi Token Error: ${errorMessage}. Transaction cancelled - please remove WiFi tokens from order or fix WiFi Portal connection.`)
              }
            }
          }
        } else {
          console.error('No WiFi portal integration or expense account configured for business:', orderData.businessId)
          // Add error tokens for all requested quantities
          for (const item of wifiTokenItems) {
            for (let i = 0; i < item.quantity; i++) {
              generatedWifiTokens.push({
                itemName: item.attributes?.productName || 'WiFi Token',
                success: false,
                error: 'WiFi Portal not configured for this business'
              })
            }
          }
        }
      }

      // Process R710 token items on-the-fly using shared utility
      const generatedR710Tokens: any[] = []

      if (r710TokenItems.length > 0) {
        for (const item of r710TokenItems) {
          const tokenConfigId = item.attributes?.tokenConfigId

          if (!tokenConfigId) {
            generatedR710Tokens.push({
              itemName: item.attributes?.productName || 'R710 WiFi Token',
              success: false,
              error: 'Missing token configuration ID'
            })
            continue
          }

          for (let i = 0; i < item.quantity; i++) {
            try {
              // Reuse shared generate-and-sell utility (same as /api/r710/direct-sale)
              // Passing tx so DB writes participate in this transaction
              const saleResult = await generateAndSellR710Token({
                businessId: orderData.businessId,
                tokenConfigId,
                saleAmount: item.unitPrice,
                paymentMethod: orderData.paymentMethod || 'CASH',
                soldBy: user.id,
                saleChannel: 'POS'
              }, tx)

              generatedR710Tokens.push({
                itemName: item.attributes?.productName || 'R710 WiFi Token',
                username: saleResult.token.username,
                password: saleResult.token.password,
                packageName: saleResult.token.tokenConfig.name,
                durationValue: saleResult.token.tokenConfig.durationValue,
                durationUnit: saleResult.token.tokenConfig.durationUnit,
                deviceLimit: saleResult.token.tokenConfig.deviceLimit,
                expiresAt: saleResult.token.expiresAt,
                ssid: saleResult.wlanSsid,
                success: true
              })
            } catch (tokenError) {
              console.error('Error generating R710 token:', tokenError)
              generatedR710Tokens.push({
                itemName: item.attributes?.productName || 'R710 WiFi Token',
                success: false,
                error: tokenError instanceof Error ? tokenError.message : 'Failed to generate R710 token'
              })
            }
          }
        }
      }

      return {
        ...order,
        items: createdItems,
        wifiTokens: generatedWifiTokens,
        r710Tokens: generatedR710Tokens
      }
    }, { timeout: 30000 }) // Extended timeout for R710 device API calls

    // Credit business account when order is created as COMPLETED with PAID status
    if (result.status === 'COMPLETED' && result.paymentStatus === 'PAID' && Number(result.totalAmount) > 0) {
      try {
        await initializeBusinessAccount(orderData.businessId, 0, user.id)
        await processBusinessTransaction({
          businessId: orderData.businessId,
          amount: Number(result.totalAmount),
          type: 'deposit',
          description: `Order revenue - ${result.orderNumber}`,
          referenceId: result.id,
          referenceType: 'order',
          notes: 'Completed order payment received',
          createdBy: user.id
        })
      } catch (balanceError) {
        console.error('Failed to credit business balance for order:', balanceError)
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Order created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update order
export async function PUT(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const validatedData = UpdateOrderSchema.parse(body)

    const { id, refundItems, refundReason, ...updateData } = validatedData

    // Verify order exists
    const existingOrder = await prisma.businessOrders.findUnique({
      where: { id },
      include: { business_order_items: true }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to manage orders in this business
    const isAdmin = isSystemAdmin(user)
    if (!isAdmin) {
      const userRole = getUserRoleInBusiness(user, existingOrder.businessId)
      if (!userRole || !['business-owner', 'business-manager'].includes(userRole)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to manage orders' },
          { status: 403 }
        )
      }
    }

    // Check if order can be updated based on current status
    if (existingOrder.status === 'COMPLETED' && updateData.status !== 'REFUNDED') {
      return NextResponse.json(
        { error: 'Completed orders can only be refunded' },
        { status: 409 }
      )
    }

    if (existingOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot update cancelled orders' },
        { status: 409 }
      )
    }

    // Handle status changes that affect inventory
    if (updateData.status === 'CANCELLED' && existingOrder.status !== 'CANCELLED') {
      // Restore inventory for cancelled orders
      await prisma.$transaction(async (tx) => {
        for (const item of existingOrder.business_order_items) {
          await tx.product_variants.update({
            where: { id: item.productVariantId },
            data: {
              stockQuantity: {
                increment: item.quantity
              }
            }
          })

          // Create stock movement record
          await tx.businessStockMovements.create({
            data: {
              businessId: existingOrder.businessId,
              productVariantId: item.productVariantId,
              movementType: 'RETURN_IN',
              quantity: item.quantity,
              reference: existingOrder.orderNumber,
              reason: 'Order cancelled',
              businessType: existingOrder.businessType,
              attributes: {
                orderId: existingOrder.id,
                originalOrderType: existingOrder.orderType
              }
            }
          })
        }
      })
    }

    // Update the order
    const order = await prisma.businessOrders.update({
      where: { id },
      data: updateData,
      include: {
        businesses: { select: { name: true, type: true } },
        business_customers: { select: { id: true, name: true, customerNumber: true } },
        employees: { select: { id: true, fullName: true, employeeNumber: true } },
        business_order_items: {
          include: {
            product_variants: {
              include: {
                business_products: {
                  select: { name: true, productType: true }
                }
              }
            }
          }
        }
      }
    })

    // Credit business account when order is COMPLETED with PAID status
    // This tracks revenue in the business account for loan payments etc.
    const wasNotCompleted = existingOrder.status !== 'COMPLETED'
    const isNowCompleted = order.status === 'COMPLETED'
    const isPaid = order.paymentStatus === 'PAID'

    if (wasNotCompleted && isNowCompleted && isPaid) {
      try {
        // Ensure business account exists
        await initializeBusinessAccount(existingOrder.businessId, 0, user.id)

        // Credit the order amount to business account
        const orderTotal = Number(order.totalAmount)
        await processBusinessTransaction({
          businessId: existingOrder.businessId,
          amount: orderTotal,
          type: 'deposit',
          description: `Order revenue - ${order.orderNumber}`,
          referenceId: order.id,
          referenceType: 'order',
          notes: `Completed order payment received`,
          createdBy: user.id
        })
        console.log(`Credited $${orderTotal} to business ${existingOrder.businessId} for order ${order.orderNumber}`)
      } catch (balanceError) {
        console.error('Failed to credit business balance for order:', balanceError)
        // Don't fail the order update - balance can be fixed later
      }
    }

    // Handle refunds - debit the business account and restore stock
    if (updateData.status === 'REFUNDED' && existingOrder.status === 'COMPLETED') {
      try {
        let refundAmount: number
        const isPartialRefund = refundItems && refundItems.length > 0

        if (isPartialRefund) {
          // Partial refund: calculate amount from selected items
          refundAmount = 0
          for (const ri of refundItems) {
            const orderItem = existingOrder.business_order_items.find(i => i.id === ri.orderItemId)
            if (!orderItem) continue
            if (ri.quantity > orderItem.quantity) continue
            refundAmount += Number(orderItem.unitPrice) * ri.quantity
          }
        } else {
          // Full refund
          refundAmount = Number(existingOrder.totalAmount)
        }

        if (refundAmount > 0) {
          await processBusinessTransaction({
            businessId: existingOrder.businessId,
            amount: refundAmount,
            type: 'withdrawal',
            description: `Order refund - ${existingOrder.orderNumber}${isPartialRefund ? ' (partial)' : ''}`,
            referenceId: existingOrder.id,
            referenceType: 'order',
            notes: refundReason || 'Refund for completed order',
            createdBy: user.id
          })
          console.log(`Debited $${refundAmount} from business ${existingOrder.businessId} for refund`)
        }

        // Restore stock for refunded items
        const itemsToRestore = isPartialRefund
          ? refundItems.map(ri => {
              const oi = existingOrder.business_order_items.find(i => i.id === ri.orderItemId)
              return oi ? { productVariantId: oi.productVariantId, quantity: ri.quantity } : null
            }).filter(Boolean) as { productVariantId: string; quantity: number }[]
          : existingOrder.business_order_items.map(i => ({ productVariantId: i.productVariantId, quantity: i.quantity }))

        await prisma.$transaction(async (tx) => {
          for (const item of itemsToRestore) {
            if (!item.productVariantId) continue // Skip virtual items (services)
            try {
              await tx.product_variants.update({
                where: { id: item.productVariantId },
                data: { stockQuantity: { increment: item.quantity } }
              })
              await tx.businessStockMovements.create({
                data: {
                  businessId: existingOrder.businessId,
                  productVariantId: item.productVariantId,
                  movementType: 'RETURN_IN',
                  quantity: item.quantity,
                  reference: existingOrder.orderNumber,
                  reason: refundReason || 'Order refund',
                  businessType: existingOrder.businessType,
                  attributes: { orderId: existingOrder.id, refund: true }
                }
              })
            } catch (stockErr) {
              console.warn(`Failed to restore stock for variant ${item.productVariantId}:`, stockErr)
            }
          }
        })

        // For partial refund: keep order COMPLETED, store refund info in attributes
        if (isPartialRefund) {
          const existingAttrs = (existingOrder.attributes as any) || {}
          const refunds = existingAttrs.refunds || []
          refunds.push({
            items: refundItems,
            reason: refundReason,
            amount: refundAmount,
            date: new Date().toISOString(),
            refundedBy: user.id
          })
          await prisma.businessOrders.update({
            where: { id },
            data: {
              status: 'COMPLETED', // Keep as completed for partial
              attributes: { ...existingAttrs, refunds, partialRefund: true }
            }
          })
        }
      } catch (balanceError) {
        console.error('Failed to process refund:', balanceError)
      }
    }

    // Transform the updated order to match expected frontend structure
    const transformedOrder = {
      ...order,
      items: order.business_order_items?.map(item => ({
        id: item.id,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        totalPrice: item.totalPrice,
        productName: item.product_variants?.business_products?.name || (item.attributes as any)?.productName || 'Unknown Product',
        variantName: item.product_variants?.name || (item.attributes as any)?.variantName || '',
        attributes: item.attributes
      })) || []
    }

    return NextResponse.json({
      success: true,
      data: transformedOrder,
      message: 'Order updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}