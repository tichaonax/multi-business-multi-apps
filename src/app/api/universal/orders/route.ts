import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { hasUserPermission, isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'
import { processBusinessTransaction, initializeBusinessAccount } from '@/lib/business-balance-utils'

import { randomBytes } from 'crypto';
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
  attributes: z.record(z.string(), z.any()).optional()
})

// Generate order number based on business type
function generateOrderNumber(businessType: string, orderCount: number): string {
  const prefix = {
    clothing: 'CLO',
    hardware: 'HWD',
    grocery: 'GRC',
    restaurant: 'RST',
    consulting: 'CON'
  }[businessType] || 'BIZ'

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counter = String(orderCount + 1).padStart(4, '0')
  return `${prefix}-${date}-${counter}`
}

// GET - Fetch orders for a business
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

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
      const hasFinancialAccess = await hasUserPermission(user, 'canAccessFinancialData', businessId)
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
        productName: item.product_variants?.business_products?.name || 'Unknown Product',
        variantName: item.product_variants?.name || '',
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

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
    const regularItems = items.filter(item => item.attributes?.wifiToken !== true && item.attributes?.r710Token !== true)

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
      const variant = variants.find(v => v.id === item.productVariantId)!
      if ((variant as any).businessProducts?.productType === 'PHYSICAL' && variant.stockQuantity < item.quantity) {
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

    const totalAmount = subtotal + orderData.taxAmount - orderData.discountAmount

    // Get current order count for order number generation
    const orderCount = await prisma.businessOrders.count({
      where: { businessId: orderData.businessId }
    })

    const orderNumber = generateOrderNumber(orderData.businessType, orderCount)

    // Create order with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the order with nested items
      const order = await tx.businessOrders.create({
        data: {
          businessId: orderData.businessId,
          customerId: orderData.customerId,
          employeeId: orderData.employeeId,
          orderType: orderData.orderType,
          paymentMethod: orderData.paymentMethod,
          discountAmount: orderData.discountAmount,
          taxAmount: orderData.taxAmount,
          businessType: orderData.businessType || business.type,
          attributes: orderData.attributes,
          notes: orderData.notes,
          orderNumber,
          subtotal,
          totalAmount,
          status: 'PENDING',
          paymentStatus: 'PENDING',
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
              // For virtual items (WiFi tokens): don't set productVariantId at all
              if (item.productVariantId) {
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
                    `http://${integration.portalIpAddress}:${integration.portalPort}/api/token/info?token=${availableToken.token}&api_key=${integration.apiKey}`
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

      // Process R710 token items
      const generatedR710Tokens = []

      if (r710TokenItems.length > 0) {
        // Fetch R710 integration
        const r710Integration = await tx.r710Integrations.findFirst({
          where: { businessId: orderData.businessId, isActive: true }
        })

        if (r710Integration) {
          for (const item of r710TokenItems) {
            const itemPrice = item.unitPrice
            const itemQuantity = item.quantity
            const tokenConfigId = item.attributes?.tokenConfigId

            if (!tokenConfigId) {
              console.error('Missing tokenConfigId in R710 token item attributes')
              generatedR710Tokens.push({
                itemName: item.attributes?.productName || 'R710 WiFi Token',
                success: false,
                error: 'Missing token configuration ID'
              })
              continue
            }

            // Get R710 token configuration
            const r710Config = await tx.r710TokenConfigs.findUnique({
              where: { id: tokenConfigId }
            })

            if (!r710Config) {
              generatedR710Tokens.push({
                itemName: item.attributes?.productName || 'R710 WiFi Token',
                success: false,
                error: 'Token configuration not found'
              })
              continue
            }

            // Find available R710 tokens (AVAILABLE status, not yet sold)
            for (let i = 0; i < itemQuantity; i++) {
              try {
                const availableR710Token = await tx.r710Tokens.findFirst({
                  where: {
                    businessId: orderData.businessId,
                    tokenConfigId: tokenConfigId,
                    status: 'AVAILABLE',
                    r710_token_sales: {
                      none: {} // No sales records = not sold
                    }
                  }
                })

                if (!availableR710Token) {
                  throw new Error('No available R710 tokens. Please create more tokens in R710 Portal.')
                }

                // Mark token as USED and create sale record
                await tx.r710Tokens.update({
                  where: { id: availableR710Token.id },
                  data: { status: 'USED' }
                })

                // Create R710 sale record
                await tx.r710TokenSales.create({
                  data: {
                    businessId: orderData.businessId,
                    r710TokenId: availableR710Token.id,
                    saleAmount: itemPrice,
                    paymentMethod: orderData.paymentMethod || 'CASH',
                    saleChannel: 'POS',
                    soldBy: user.id,
                    soldAt: new Date()
                  }
                })

                // Add to response
                generatedR710Tokens.push({
                  itemName: item.attributes?.productName || 'R710 WiFi Token',
                  username: availableR710Token.username,
                  password: availableR710Token.password,
                  packageName: r710Config.name,
                  durationValue: r710Config.durationValue,
                  durationUnit: r710Config.durationUnit,
                  deviceLimit: r710Config.deviceLimit,
                  success: true
                })

                console.log(`✅ R710 token sold: ${availableR710Token.username}`)
              } catch (tokenError) {
                console.error('Error processing R710 token:', tokenError)
                generatedR710Tokens.push({
                  itemName: item.attributes?.productName || 'R710 WiFi Token',
                  success: false,
                  error: tokenError instanceof Error ? tokenError.message : 'Failed to process R710 token'
                })
              }
            }
          }
        } else {
          console.error('No R710 integration configured for business:', orderData.businessId)
          // Add error tokens for all requested quantities
          for (const item of r710TokenItems) {
            for (let i = 0; i < item.quantity; i++) {
              generatedR710Tokens.push({
                itemName: item.attributes?.productName || 'R710 WiFi Token',
                success: false,
                error: 'R710 integration not configured for this business'
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
    })

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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const body = await request.json()
    const validatedData = UpdateOrderSchema.parse(body)

    const { id, ...updateData } = validatedData

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
        await initializeBusinessAccount(existingOrder.businessId, 0, session.user.id)

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
          createdBy: session.user.id
        })
        console.log(`Credited $${orderTotal} to business ${existingOrder.businessId} for order ${order.orderNumber}`)
      } catch (balanceError) {
        console.error('Failed to credit business balance for order:', balanceError)
        // Don't fail the order update - balance can be fixed later
      }
    }

    // Handle refunds - debit the business account
    if (updateData.status === 'REFUNDED' && existingOrder.status === 'COMPLETED') {
      try {
        const refundAmount = Number(existingOrder.totalAmount)
        await processBusinessTransaction({
          businessId: existingOrder.businessId,
          amount: refundAmount,
          type: 'withdrawal',
          description: `Order refund - ${existingOrder.orderNumber}`,
          referenceId: existingOrder.id,
          referenceType: 'order',
          notes: `Refund for completed order`,
          createdBy: session.user.id
        })
        console.log(`Debited $${refundAmount} from business ${existingOrder.businessId} for refund`)
      } catch (balanceError) {
        console.error('Failed to debit business balance for refund:', balanceError)
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
        productName: item.product_variants?.business_products?.name || 'Unknown Product',
        variantName: item.product_variants?.name || '',
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