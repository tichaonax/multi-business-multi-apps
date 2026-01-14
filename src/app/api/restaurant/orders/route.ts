import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, auditCreate } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

import { randomBytes } from 'crypto';
// Simple in-memory idempotency store: maps idempotencyKey -> response payload
// Note: this is ephemeral (process memory). It prevents duplicate orders for
// repeated client retries while the server process is running. For durable
// idempotency across restarts, a DB table or Redis would be needed.
const idempotencyStore = new Map<string, any>()

// Get restaurant business IDs that user can access
async function getRestaurantBusinessIds(session: any, request?: NextRequest) {

  // Check if user is system admin - they can see all restaurant orders
  // If session already indicates admin (useful for dev bypass), return all restaurant businesses
  if (session?.user?.role === 'admin') {
    const allRestaurantBusinesses = await prisma.businesses.findMany({
      where: { type: 'restaurant', isActive: true },
      select: { id: true, name: true }
    })

    return allRestaurantBusinesses.map(b => b.id)
  }

  // Otherwise fetch the user record to determine memberships
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      business_memberships: {
        where: {
          businesses: { type: 'restaurant' },
          isActive: true
        },
        include: {
          businesses: { select: { id: true, name: true } }
        }
      }
    }
  })

  // If user is admin in DB, return all active restaurants
  if (user?.role === 'admin') {
    const allRestaurantBusinesses = await prisma.businesses.findMany({
      where: { type: 'restaurant', isActive: true },
      select: { id: true }
    })
    return allRestaurantBusinesses.map(b => b.id)
  }

  // For non-admin users, only return businesses they have membership to
  return user?.business_memberships?.map(m => m.businesses.id) || []
}

// GET - Fetch restaurant orders using universal orders API
export async function GET(request: NextRequest) {
  try {
    let session = await getServerSession(authOptions)

    // Dev-only bypass: allow passing _devUserId for local testing when not in production
    if ((!session || !session?.user?.id) && process.env.NODE_ENV !== 'production') {
      const { searchParams } = new URL(request.url)
      const devUserId = searchParams.get('_devUserId')
      if (devUserId) {
        const devUser = await prisma.users.findUnique({ where: { id: devUserId } })
        if (devUser) {
          // Check if caller asked to be treated as admin for local testing
          const devAdminFlag = searchParams.get('_devAdmin')
          const role = devAdminFlag === '1' ? 'admin' : ((devUser.role as any) || 'user')

          // Build a minimal session-like object expected by the rest of the handler
          session = { user: { id: devUser.id, name: (devUser.name as any) || devUser.email || 'dev', role, permissions: (devUser.permissions as any) || {} } } as any
        }
      }
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const orderType = searchParams.get('orderType')
    const paymentStatus = searchParams.get('paymentStatus')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'

    // Get restaurant business IDs that user can access
    const restaurantBusinessIds = await getRestaurantBusinessIds(session, request)

    if (!restaurantBusinessIds.length) {
      return NextResponse.json({
        success: false,
        error: 'No restaurant business access found for user'
      }, { status: 403 })
    }

  // Fetch orders directly from businessOrder table (use top-level prisma import)

    // Build where clause for database query
    const whereClause: any = {
      businessId: { in: restaurantBusinessIds },
      businessType: 'restaurant'
    }

    if (status && status !== 'all') {
      // Map restaurant-specific statuses to database statuses
      const statusMap: Record<string, string> = {
        'PENDING': 'PENDING',
        'CONFIRMED': 'CONFIRMED',
        'PREPARING': 'PROCESSING',
        'READY': 'READY',
        'SERVED': 'COMPLETED',
        'COMPLETED': 'COMPLETED',
        'CANCELLED': 'CANCELLED'
      }
      whereClause.status = statusMap[status] || status
    }

    if (paymentStatus && paymentStatus !== 'all') {
      // Map restaurant payment statuses to database payment statuses
      const paymentStatusMap: Record<string, string> = {
        'PENDING': 'PENDING',
        'PAID': 'PAID',
        'PARTIAL': 'PARTIALLY_PAID',
        'REFUNDED': 'REFUNDED'
      }
      whereClause.paymentStatus = paymentStatusMap[paymentStatus] || paymentStatus
    }

    const orders = await prisma.businessOrders.findMany({
      where: whereClause,
      include: {
        businesses: {
          select: {
            name: true,
            type: true
          }
        },
        employees: {
          select: {
            fullName: true
          }
        },
        business_order_items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product_variants: {
              select: {
                name: true,
                business_products: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    })

    // Transform businessOrder data to restaurant-specific format
    const transformedOrders = orders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: 'Walk-in Customer', // businessOrder doesn't have customer info
      customerPhone: '',
      customerEmail: '',
      tableNumber: order.attributes?.tableNumber || '',
  orderType: mapOrderType(order.orderType || 'SALE'),
  // Mark kitchen tickets explicitly if the record uses the KITCHEN_TICKET enum or has ticketType attribute
  isKitchenTicket: (order.orderType === 'KITCHEN_TICKET') || (order.attributes && order.attributes.ticketType === 'KITCHEN'),
      status: mapStatus(order.status),
      subtotal: Number(order.subtotal || 0),
      taxAmount: Number(order.taxAmount || 0),
      tipAmount: order.attributes?.tipAmount || 0,
      totalAmount: Number(order.totalAmount),
      paymentStatus: mapPaymentStatus(order.paymentStatus),
      paymentMethod: order.paymentMethod || '',
      notes: order.notes || '',
      estimatedReadyTime: order.attributes?.estimatedReadyTime || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.business_order_items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        productName: item.product_variants?.business_products?.name || item.product_variants?.name || 'Unknown Item'
      }))
    }))

    // Apply restaurant-specific filters
    let filteredOrders = transformedOrders

    if (orderType && orderType !== 'all') {
      filteredOrders = filteredOrders.filter((order: any) => order.orderType === orderType)
    }

    // Calculate pagination metadata
    const totalCount = await prisma.businessOrders.count({
      where: whereClause
    })

    return NextResponse.json({
      success: true,
      data: filteredOrders,
      meta: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    })

  } catch (error) {
    console.error('Error fetching restaurant orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions to map between universal and restaurant-specific values
function mapOrderType(universalType: string): string {
  const typeMap: Record<string, string> = {
    'SALE': 'DINE_IN',
    'TAKEOUT': 'TAKEOUT',
    'DELIVERY': 'DELIVERY'
  }
  return typeMap[universalType] || 'DINE_IN'
}

function mapStatus(universalStatus: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'PENDING',
    'CONFIRMED': 'CONFIRMED',
    'PROCESSING': 'PREPARING',
    'READY': 'READY',
    'COMPLETED': 'SERVED',
    'CANCELLED': 'CANCELLED'
  }
  return statusMap[universalStatus] || universalStatus
}

function mapPaymentStatus(universalPaymentStatus: string): string {
  const paymentStatusMap: Record<string, string> = {
    'PENDING': 'PENDING',
    'PAID': 'PAID',
    'PARTIALLY_PAID': 'PARTIAL',
    'REFUNDED': 'REFUNDED',
    'FAILED': 'PENDING'
  }
  return paymentStatusMap[universalPaymentStatus] || universalPaymentStatus
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin users have all permissions by default
  const isAdmin = session.user.role === 'admin'

  if (!isAdmin) {
    // Non-admin users need specific permissions
    const userPermissions = session.user.permissions || {}
    if (!hasPermission(userPermissions, 'restaurant', 'pos')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
  }

  try {
    const { items, total, tableNumber, businessId = 'restaurant-demo', paymentMethod = 'CASH', amountReceived, idempotencyKey } = await req.json()

    // If client provided an idempotencyKey, and we've already processed it, return stored result
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      const existing = idempotencyStore.get(idempotencyKey)
      if (existing) {
        // Return a clone to avoid accidental mutation by callers
        return NextResponse.json({ ...existing })
      }
    }

    // Generate unique order number with retry logic to handle race conditions
    let orderNumber: string
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      attempts++

      // Generate order number in standard format: RST-YYYYMMDD-0001
      const todayOrderCount = await prisma.businessOrders.count({
        where: {
          businessId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })

      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      // Add a random component to reduce collision probability
      const counter = String(todayOrderCount + attempts).padStart(4, '0')
      orderNumber = `RST-${date}-${counter}`

      // Check if this order number already exists
      const existing = await prisma.businessOrders.findFirst({
        where: {
          businessId,
          orderNumber
        }
      })

      if (!existing) {
        break // We found a unique order number
      }

      // If we're on the last attempt and still have a collision, add timestamp
      if (attempts === maxAttempts) {
        const timestamp = Date.now().toString().slice(-4)
        orderNumber = `RST-${date}-${counter}-${timestamp}`
      }
    }

    // Find employee record for the current user (if exists)
    let employeeId = null
    let employeeName = session.user.name || 'Unknown'
    try {
      const employee = await prisma.employees.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true
        }
      })
      if (employee) {
        employeeId = employee.id
        employeeName = employee.fullName || session.user.name || 'Unknown'
      }
    } catch (err) {
      console.warn('Could not find employee record for user:', session.user.id)
    }

    // Determine payment status based on payment received
    let paymentStatus = 'PENDING'
    if (amountReceived && amountReceived >= total) {
      paymentStatus = 'PAID'
    }

    // Fetch AP info for WiFi tokens (if any will be sold)
    let apInfo = null
    const hasWifiTokens = items.some(item => item.wifiToken === true)
    if (hasWifiTokens) {
      try {
        const apResponse = await fetch(`${req.nextUrl.origin}/api/ap/info?businessId=${businessId}`, {
          headers: {
            'Cookie': req.headers.get('cookie') || ''
          }
        })
        if (apResponse.ok) {
          const apData = await apResponse.json()
          if (apData.success) {
            apInfo = apData.apInfo
          }
        }
      } catch (error) {
        console.warn('Could not fetch AP info for receipt:', error)
      }
    }

    // Create the order first using business_orders table
    // If unique constraint fails, add timestamp suffix to make it unique
    let newOrder
    try {
      newOrder = await prisma.businessOrders.create({
        data: {
          businessId: businessId,
          orderNumber,
          employeeId: employeeId, // Can be null if user is not an employee
          orderType: 'SALE',
          status: 'COMPLETED',
          subtotal: total,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: total,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          businessType: 'restaurant',
          attributes: {
            ...(tableNumber ? { tableNumber } : {}),
            employeeName: employeeName,
            amountReceived: amountReceived || total,
            changeDue: amountReceived ? amountReceived - total : 0
          },
          notes: null,
          updatedAt: new Date()
        }
      })
    } catch (error: any) {
      // If unique constraint violation on orderNumber, add timestamp to make it unique
      if (error.code === 'P2002' && error.meta?.target?.includes('orderNumber')) {
        const timestamp = Date.now().toString().slice(-6)
        orderNumber = `${orderNumber}-${timestamp}`
        console.warn(`Order number collision detected, using: ${orderNumber}`)

        // Retry with unique order number
        newOrder = await prisma.businessOrders.create({
          data: {
            businessId: businessId,
            orderNumber,
            employeeId: employeeId,
            orderType: 'SALE',
            status: 'COMPLETED',
            subtotal: total,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: total,
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod,
            businessType: 'restaurant',
            attributes: {
              ...(tableNumber ? { tableNumber } : {}),
              employeeName: employeeName,
              amountReceived: amountReceived || total,
              changeDue: amountReceived ? amountReceived - total : 0
            },
            notes: null,
            updatedAt: new Date()
          }
        })
      } else {
        // Re-throw if it's a different error
        throw error
      }
    }

    // Process each order item and update inventory
    const inventoryUpdates = []
    const generatedESP32Tokens = []
    const generatedR710Tokens = []

    // Get WiFi portal integration for expense account (needed for ESP32 WiFi token sales)
    let wifiExpenseAccountId: string | null = null
    const portalIntegration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
      select: { expenseAccountId: true },
    })
    if (portalIntegration) {
      wifiExpenseAccountId = portalIntegration.expenseAccountId
    }

    for (const item of items) {
      const itemPrice = Number(item.price);
      const itemQuantity = Number(item.quantity);
      const itemTotal = itemPrice * itemQuantity;

      // Check if this is a WiFi token item
      if (item.wifiToken === true) {
        try {
          // Ensure we have expense account for WiFi token sales
          if (!wifiExpenseAccountId) {
            console.error('WiFi portal integration not configured - missing expense account');
            generatedESP32Tokens.push({
              itemName: item.name,
              tokenCode: '', // No token generated
              packageName: item.name,
              duration: 0,
              success: false,
              error: 'WiFi portal integration not configured'
            });
            continue;
          }

          // Find available tokens for this token config that have NOT been sold yet
          const availableTokens = await prisma.wifiTokens.findMany({
            where: {
              businessId: businessId,
              tokenConfigId: item.tokenConfigId,
              status: 'UNUSED', // Only unused tokens
              wifi_token_sales: { none: {} }, // NOT sold yet
            },
            include: {
              token_configurations: {
                select: {
                  name: true,
                  durationMinutes: true,
                  bandwidthDownMb: true,
                  bandwidthUpMb: true,
                },
              },
            },
            take: itemQuantity,
            orderBy: { createdAt: 'asc' }, // FIFO: sell oldest tokens first
          });

          if (availableTokens.length < itemQuantity) {
            throw new Error(`Insufficient WiFi tokens: Need ${itemQuantity}, found ${availableTokens.length} available. Please reduce quantity or contact support.`);
          }

          // CRITICAL: Verify each token exists on ESP32 device before sale
          // Customer will redeem token on ESP32 later, so it MUST exist there
          const portalIntegrationForVerify = await prisma.portalIntegrations.findUnique({
            where: { businessId: businessId },
            select: {
              portalIpAddress: true,
              portalPort: true,
              apiKey: true,
              isActive: true
            },
          });

          if (!portalIntegrationForVerify || !portalIntegrationForVerify.isActive) {
            throw new Error('WiFi Portal integration not active. Cannot verify tokens.');
          }

          console.log(`🔍 Verifying ${availableTokens.length} tokens on ESP32 for business ${businessId}`);

          // Verify all tokens exist on ESP32 before proceeding
          const verifiedTokens = [];
          const failedTokens = [];

          for (const token of availableTokens) {
            try {
              console.log(`  Checking token ${token.token} on ESP32...`);

              const esp32VerifyResponse = await fetch(
                `http://${portalIntegrationForVerify.portalIpAddress}:${portalIntegrationForVerify.portalPort}/api/token/info?token=${token.token}&api_key=${portalIntegrationForVerify.apiKey}`,
                {
                  method: 'GET',
                  signal: AbortSignal.timeout(5000) // 5 second timeout
                }
              );

              if (!esp32VerifyResponse.ok) {
                console.error(`  ❌ ESP32 HTTP ${esp32VerifyResponse.status} for token ${token.token}`);
                failedTokens.push({ token: token.token, reason: `ESP32 returned ${esp32VerifyResponse.status}` });
                continue;
              }

              const esp32TokenInfo = await esp32VerifyResponse.json();
              if (!esp32TokenInfo.success) {
                console.error(`  ❌ Token ${token.token} not found on ESP32`);
                failedTokens.push({ token: token.token, reason: 'Not found on ESP32 device' });
                continue;
              }

              console.log(`  ✅ Token ${token.token} verified on ESP32`);
              verifiedTokens.push(token);
            } catch (esp32Error) {
              const errorMessage = esp32Error instanceof Error ? esp32Error.message : 'Unknown error';
              console.error(`  ❌ ESP32 verification failed for token ${token.token}:`, errorMessage);
              failedTokens.push({ token: token.token, reason: errorMessage });
            }
          }

          // If any tokens failed verification, mark them as disabled to prevent future sale attempts
          if (failedTokens.length > 0) {
            console.warn(`⚠️ Disabling ${failedTokens.length} tokens that don't exist on ESP32:`, failedTokens);

            for (const failed of failedTokens) {
              try {
                // Mark token as disabled/unusable in database
                await prisma.wifiTokens.update({
                  where: { token: failed.token },
                  data: {
                    status: 'DISABLED',
                    // Log why it was disabled in attributes
                  }
                });
                console.log(`  🔒 Disabled token ${failed.token} - Reason: ${failed.reason}`);
              } catch (disableError) {
                console.error(`  Failed to disable token ${failed.token}:`, disableError);
              }
            }
          }

          // Check if we have enough verified tokens
          if (verifiedTokens.length < itemQuantity) {
            throw new Error(
              `Insufficient verified WiFi tokens: Need ${itemQuantity}, only ${verifiedTokens.length} available on ESP32. ` +
              `${failedTokens.length} tokens were found in database but not on ESP32 device (now disabled). ` +
              `Please run token sync or contact support.`
            );
          }

          // Use only the verified tokens for sale
          const tokensToSell = verifiedTokens.slice(0, itemQuantity);

          // Create sales records for each verified token (no status change - tokens remain UNUSED until redeemed)
          for (const token of tokensToSell) {
            await prisma.wifiTokenSales.create({
              data: {
                wifiTokenId: token.id,
                businessId: businessId,
                expenseAccountId: wifiExpenseAccountId,
                soldBy: session.user.id,
                saleAmount: itemPrice,
                paymentMethod: paymentMethod,
                saleChannel: 'POS', // POS sales go through business POS
                soldAt: new Date(),
                receiptPrinted: false,
              },
            });
          }

          // Add sold ESP32 tokens to response
          for (const token of tokensToSell) {
            generatedESP32Tokens.push({
              itemName: item.name,
              tokenCode: token.token,
              packageName: token.token_configurations?.name || item.name,
              duration: token.token_configurations?.durationMinutes || 0,
              bandwidthDownMb: token.token_configurations?.bandwidthDownMb || 0,
              bandwidthUpMb: token.token_configurations?.bandwidthUpMb || 0,
              ssid: apInfo?.ssid,
              portalUrl: 'http://192.168.4.1',
              instructions: apInfo ? `Connect to WiFi network "${apInfo.ssid}" and visit http://192.168.4.1 to redeem your token.` : undefined,
              success: true
            });
          }

          // Create order item for WiFi token (no variant needed)
          await prisma.businessOrderItems.create({
            data: {
              orderId: newOrder.id,
              productVariantId: null, // WiFi tokens don't have variants
              quantity: itemQuantity,
              unitPrice: itemPrice,
              discountAmount: 0,
              totalPrice: itemTotal,
              attributes: {
                productName: item.name,
                category: item.category || 'wifi-access',
                wifiToken: true,
                tokenConfigId: item.tokenConfigId,
                businessTokenMenuItemId: item.businessTokenMenuItemId
              }
            }
          })

          // Skip inventory processing for WiFi tokens
          continue
        } catch (wifiError) {
          console.error('❌ WiFi token processing error - rolling back order:', wifiError)

          // CRITICAL: Rollback the entire order if WiFi token fails
          // Delete the order that was just created
          await prisma.businessOrderItems.deleteMany({
            where: { orderId: newOrder.id }
          });
          await prisma.businessOrders.delete({
            where: { id: newOrder.id }
          });

          const errorMessage = wifiError instanceof Error ? wifiError.message : 'Unknown error';

          // Provide specific error message based on error type
          let userMessage = errorMessage;
          if (errorMessage.includes('Insufficient WiFi tokens')) {
            userMessage = `${errorMessage}\n\nTransaction has been cancelled. Please try again or contact support.`;
          } else if (errorMessage.includes('ESP32 verification failed') || errorMessage.includes('WiFi Portal integration error')) {
            userMessage = `${errorMessage}\n\nThe WiFi device is currently unreachable. Please check the connection and try again.`;
          } else if (errorMessage.includes('not found on ESP32')) {
            userMessage = `Token validation failed: ${errorMessage}\n\nPlease contact support to resolve this issue.`;
          } else {
            userMessage = `WiFi Token Error: ${errorMessage}\n\nTransaction cancelled. Please try again or contact support.`;
          }

          return NextResponse.json({
            error: userMessage,
            success: false,
            rollback: true,
            wifiTokenError: errorMessage
          }, { status: 400 });
        }
      } else if ((item as any).r710Token === true) {
        // Handle R710 WiFi token sales
        try {
          // Verify R710 integration exists and is active
          const r710IntegrationForSale = await prisma.r710BusinessIntegrations.findFirst({
            where: {
              businessId: businessId,
              isActive: true
            }
          });

          if (!r710IntegrationForSale) {
            throw new Error('R710 integration not configured or not active');
          }

          // Look up R710 expense account using account number pattern
          const r710AccountNumber = `R710-${businessId.slice(-6)}`;
          const r710ExpenseAccount = await prisma.expenseAccounts.findFirst({
            where: { accountNumber: r710AccountNumber }
          });
          
          if (!r710ExpenseAccount) {
            throw new Error('WiFi expense account not configured. Please configure WiFi portal integration.');
          }

          const r710ExpenseAccountId = r710ExpenseAccount.id;

          // Find available R710 tokens for this config
          const availableTokens = await prisma.r710Tokens.findMany({
            where: {
              businessId: businessId,
              tokenConfigId: item.tokenConfigId,
              status: 'AVAILABLE',
              r710_token_sales: { none: {} } // Not sold yet
            },
            include: {
              r710_token_configs: {
                select: {
                  name: true,
                  durationValue: true,
                  durationUnit: true,
                  deviceLimit: true
                }
              },
              r710_wlans: {
                select: {
                  ssid: true
                }
              }
            },
            take: itemQuantity,
            orderBy: { createdAt: 'asc' }
          });

          if (availableTokens.length < itemQuantity) {
            throw new Error(`Insufficient R710 tokens: Need ${itemQuantity}, found ${availableTokens.length} available`);
          }

          const tokensToSell = availableTokens.slice(0, itemQuantity);

          // Create sales records and mark tokens as SOLD
          for (const token of tokensToSell) {
            // Mark token as SOLD
            await prisma.r710Tokens.update({
              where: { id: token.id },
              data: { status: 'SOLD' }
            });

            // Create sale record
            await prisma.r710TokenSales.create({
              data: {
                businessId: businessId,
                tokenId: token.id,
                expenseAccountId: r710ExpenseAccountId,
                saleAmount: itemPrice,
                paymentMethod: paymentMethod,
                saleChannel: 'POS',
                soldBy: session.user.id,
                soldAt: new Date()
              }
            });

            // Add to generatedR710Tokens for receipt (R710 format)
            generatedR710Tokens.push({
              itemName: item.name,
              password: token.password, // R710 password/passcode only
              packageName: token.r710_token_configs?.name || item.name,
              durationValue: token.r710_token_configs?.durationValue || 0,
              durationUnit: token.r710_token_configs?.durationUnit || 'hour_Hours',
              expiresAt: token.expiresAtR710, // R710 expiration date
              ssid: token.r710_wlans?.ssid, // VLAN name to connect to
              success: true
            });
          }

          // Create order item for R710 token
          await prisma.businessOrderItems.create({
            data: {
              orderId: newOrder.id,
              productVariantId: null,
              quantity: itemQuantity,
              unitPrice: itemPrice,
              discountAmount: 0,
              totalPrice: itemTotal,
              attributes: {
                productName: item.name,
                category: item.category || 'r710-wifi',
                r710Token: true,
                tokenConfigId: item.tokenConfigId,
                businessTokenMenuItemId: item.businessTokenMenuItemId
              }
            }
          });

          // Skip inventory processing for R710 tokens
          continue;
        } catch (r710Error) {
          console.error('❌ R710 token processing error - rolling back order:', r710Error);

          // Rollback the order
          await prisma.businessOrderItems.deleteMany({
            where: { orderId: newOrder.id }
          });
          await prisma.businessOrders.delete({
            where: { id: newOrder.id }
          });

          const errorMessage = r710Error instanceof Error ? r710Error.message : 'Unknown error';
          return NextResponse.json({
            error: `R710 Token Error: ${errorMessage}\n\nTransaction cancelled. Please try again or contact support.`,
            success: false,
            rollback: true,
            r710TokenError: errorMessage
          }, { status: 400 });
        }
      }

      // Find the product variant for this item
      // First check if it's a product ID and get its default variant
      let variantId = item.id;

      // Try to find as a product first
      const product = await prisma.businessProducts.findUnique({
        where: { id: item.id },
        include: {
          product_variants: {
            where: { isActive: true },
            take: 1
          }
        }
      }).catch(() => null)

      if (product && product.product_variants && product.product_variants.length > 0) {
        variantId = product.product_variants[0].id
      } else {
        // Check if the ID is already a variant ID
        const existingVariant = await prisma.productVariants.findUnique({
          where: { id: item.id }
        }).catch(() => null)

        if (!existingVariant) {
          console.warn('Could not find variant for item:', item.id, item.name)
          continue // Skip this item if we can't find a variant
        }
      }

      // Create order item using business_order_items table
      await prisma.businessOrderItems.create({
        data: {
          orderId: newOrder.id,
          productVariantId: variantId,
          quantity: itemQuantity,
          unitPrice: itemPrice,
          discountAmount: 0,
          totalPrice: itemTotal,
          attributes: {
            productName: item.name,
            category: item.category
          }
        }
      })

      // Get menu item ingredients to update inventory
      try {
        const menuItemResponse = await fetch(`${req.nextUrl.origin}/api/universal/products/${item.id}`)
        if (menuItemResponse.ok) {
          const menuItemData = await menuItemResponse.json()
          const menuItem = menuItemData.data

          // If menu item has ingredients (recipe), update inventory for each ingredient
          if (menuItem?.attributes?.ingredients) {
            for (const ingredient of menuItem.attributes.ingredients) {
              const quantityUsed = (ingredient.quantity || 1) * item.quantity

              // Create stock movement for ingredient usage
              const movementData = {
                businessId,
                itemId: ingredient.inventoryItemId || ingredient.id,
                itemName: ingredient.name,
                itemSku: ingredient.sku || `ING-${ingredient.id}`,
                movementType: 'use',
                quantity: -Math.abs(quantityUsed), // Negative for usage
                unit: ingredient.unit || 'units',
                reason: `Used in order ${orderNumber} - ${menuItem.name}`,
                notes: `Order item: ${item.quantity}x ${menuItem.name}`,
                employeeName: session.user.name,
                referenceNumber: orderNumber
              }

              // Call inventory movements API to record usage
              const movementResponse = await fetch(`${req.nextUrl.origin}/api/inventory/${businessId}/movements`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': req.headers.get('cookie') || ''
                },
                body: JSON.stringify(movementData)
              })

              if (movementResponse.ok) {
                inventoryUpdates.push({
                  ingredientId: ingredient.id,
                  quantityUsed,
                  success: true
                })
              } else {
                console.warn(`Failed to update inventory for ingredient ${ingredient.name}`)
                inventoryUpdates.push({
                  ingredientId: ingredient.id,
                  quantityUsed,
                  success: false,
                  error: 'Failed to record stock movement'
                })
              }
            }
          }
        }
      } catch (inventoryError) {
        console.error(`Inventory update failed for item ${item.id}:`, inventoryError)
        inventoryUpdates.push({
          itemId: item.id,
          success: false,
          error: 'Inventory update failed'
        })
      }
    }

    // Record audit entry for order creation
    try {
      await auditCreate({ userId: session.user.id }, 'Business', newOrder.id, {
        orderNumber,
        total,
        itemCount: items.length,
        inventoryUpdates: inventoryUpdates.length
      }, { tableName: 'orders', recordId: newOrder.id })
    } catch (auditErr) {
      console.warn('Audit log failed for order creation', auditErr)
    }

    // Fetch business details (address, phone) to include in response for receipt
    let businessInfo = null
    try {
      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          address: true,
          phone: true,
          email: true,
          umbrellaBusinessId: true,
          umbrellaBusinessName: true,
          umbrellaBusinessAddress: true,
          umbrellaBusinessPhone: true,
          umbrellaBusinessEmail: true
        }
      })
      if (business) {
        // Use business address/phone if available, otherwise use umbrella business fallback
        businessInfo = {
          name: business.name,
          address: business.address || business.umbrellaBusinessAddress || '',
          phone: business.phone || business.umbrellaBusinessPhone || '',
          email: business.email || business.umbrellaBusinessEmail
        }
        console.log('📍 [Order API] Business info:', businessInfo)
      }
    } catch (err) {
      console.warn('Failed to fetch business info for receipt:', err)
    }

    const responsePayload = {
      ...newOrder,
      inventoryUpdates,
      wifiTokens: generatedESP32Tokens,
      r710Tokens: generatedR710Tokens,
      businessInfo, // Include business details for receipt
      message: inventoryUpdates.some(u => !u.success) || generatedESP32Tokens.some(t => !t.success) || generatedR710Tokens.some(t => !t.success)
        ? 'Order created with some warnings'
        : 'Order created successfully'
    }

    // Store idempotency result for future deduplication (ephemeral)
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      try {
        idempotencyStore.set(idempotencyKey, responsePayload)
      } catch (err) {
        console.warn('Failed to store idempotency key', err)
      }
    }

    return NextResponse.json(responsePayload)
  } catch (error: any) {
    console.error('Order processing error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process order',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}