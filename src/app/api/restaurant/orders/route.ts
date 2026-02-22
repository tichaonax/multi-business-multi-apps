import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog, auditCreate } from '@/lib/audit'
import { processBusinessTransaction, initializeBusinessAccount } from '@/lib/business-balance-utils'
import { hasPermission } from '@/lib/rbac'
import { R710SessionManager } from '@/lib/r710-session-manager'
import { generateDirectSaleUsername } from '@/lib/r710/username-generator'
import { getOrCreateR710ExpenseAccount } from '@/lib/r710-expense-account-utils'
import { decrypt } from '@/lib/encryption'
import { generateAndSellR710Token } from '@/lib/r710/generate-and-sell-token'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'

// R710 session manager for on-the-fly token generation
const r710SessionManager = new R710SessionManager()
// Simple in-memory idempotency store: maps idempotencyKey -> response payload
// Note: this is ephemeral (process memory). It prevents duplicate orders for
// repeated client retries while the server process is running. For durable
// idempotency across restarts, a DB table or Redis would be needed.
const idempotencyStore = new Map<string, any>()

// Get restaurant business IDs that user can access
async function getRestaurantBusinessIds(currentUser: any) {

  // Check if user is system admin - they can see all restaurant orders
  if (currentUser?.role === 'admin') {
    const allRestaurantBusinesses = await prisma.businesses.findMany({
      where: { type: 'restaurant', isActive: true },
      select: { id: true, name: true }
    })

    return allRestaurantBusinesses.map(b => b.id)
  }

  // Otherwise fetch the user record to determine memberships
  const dbUser = await prisma.users.findUnique({
    where: { id: currentUser.id },
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
  if (dbUser?.role === 'admin') {
    const allRestaurantBusinesses = await prisma.businesses.findMany({
      where: { type: 'restaurant', isActive: true },
      select: { id: true }
    })
    return allRestaurantBusinesses.map(b => b.id)
  }

  // For non-admin users, only return businesses they have membership to
  return dbUser?.business_memberships?.map(m => m.businesses.id) || []
}

// GET - Fetch restaurant orders using universal orders API
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const orderType = searchParams.get('orderType')
    const paymentStatus = searchParams.get('paymentStatus')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'

    // Get restaurant business IDs that user can access
    const restaurantBusinessIds = await getRestaurantBusinessIds(user)

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
  const user = await getServerUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin users have all permissions by default
  const isAdmin = user.role === 'admin'

  if (!isAdmin) {
    // Non-admin users need specific permissions via RBAC or active business membership
    const userPermissions = user.permissions || {}
    const hasRbacPos = hasPermission(userPermissions, 'restaurant', 'pos')
    const hasActiveMembership = user.businessMemberships?.some(
      (m: any) => m.isActive
    )
    if (!hasRbacPos && !hasActiveMembership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
  }

  try {
    const { items, total, tableNumber, businessId = 'restaurant-demo', paymentMethod = 'CASH', amountReceived, idempotencyKey, customerId, discountAmount: reqDiscountAmount = 0, rewardId, couponId, couponCode: reqCouponCode, couponDiscount: reqCouponDiscount = 0, couponCustomerPhone, timezone } = await req.json()

    // Derive local date string (YYYYMMDD) for receipt prefix — falls back to UTC if no timezone sent
    const localDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()).replace(/-/g, '')

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

      // Add a random component to reduce collision probability
      const counter = String(todayOrderCount + attempts).padStart(4, '0')
      orderNumber = `RST-${localDateStr}-${counter}`

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
    let employeeName = user.name || 'Unknown'
    try {
      const employee = await prisma.employees.findFirst({
        where: {
          userId: user.id,
          businessId: businessId,
          isActive: true
        }
      })
      if (employee) {
        employeeId = employee.id
        employeeName = employee.fullName || user.name || 'Unknown'
      }
    } catch (err) {
      console.warn('Could not find employee record for user:', user.id)
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
          customerId: customerId || null,
          createdBy: user.id,
          orderType: 'SALE',
          status: 'COMPLETED',
          subtotal: total,
          taxAmount: 0,
          discountAmount: reqDiscountAmount,
          totalAmount: total,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          businessType: 'restaurant',
          transactionDate: new Date(),
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
            customerId: customerId || null,
            createdBy: user.id,
            orderType: 'SALE',
            status: 'COMPLETED',
            subtotal: total,
            taxAmount: 0,
            discountAmount: reqDiscountAmount,
            totalAmount: total,
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod,
            businessType: 'restaurant',
            transactionDate: new Date(),
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
                soldBy: user.id,
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
                soldBy: user.id,
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
      } else if ((item as any).isCombo === true) {
        // Handle combo items - check if combo contains WiFi tokens
        try {
          const comboItems = (item as any).comboItems || [];

          // Find any WiFi tokens in the combo items
          const wifiTokenItems = comboItems.filter((ci: any) => ci.tokenConfigId);

          if (wifiTokenItems.length > 0) {
            // Verify R710 integration exists and is active
            const r710IntegrationForCombo = await prisma.r710BusinessIntegrations.findFirst({
              where: {
                businessId: businessId,
                isActive: true
              },
              include: {
                device_registry: true
              }
            });

            if (!r710IntegrationForCombo) {
              throw new Error('R710 integration not configured or not active for WiFi tokens in combo');
            }

            if (!r710IntegrationForCombo.device_registry) {
              throw new Error('R710 device not found in registry');
            }

            // Get or create R710 expense account
            const r710ExpenseAccount = await getOrCreateR710ExpenseAccount(businessId, user.id);

            // Decrypt device password for on-the-fly token generation
            const decryptedPassword = decrypt(r710IntegrationForCombo.device_registry.encryptedAdminPassword);

            // Duration unit mapping for R710 API
            const durationUnitMap: { [key: string]: 'hour' | 'day' | 'week' } = {
              'hour_Hours': 'hour',
              'day_Days': 'day',
              'week_Weeks': 'week'
            };

            // Process each WiFi token in the combo - generate on-the-fly
            for (const wifiItem of wifiTokenItems) {
              const tokenQuantity = (wifiItem.quantity || 1) * itemQuantity; // Multiply by combo quantity

              // Get token config details
              const tokenConfig = await prisma.r710TokenConfigs.findUnique({
                where: { id: wifiItem.tokenConfigId },
                include: {
                  r710_wlans: {
                    select: {
                      id: true,
                      ssid: true,
                      wlanId: true
                    }
                  }
                }
              });

              if (!tokenConfig) {
                throw new Error(`Token configuration not found: ${wifiItem.tokenConfigId}`);
              }

              const apiDurationUnit = durationUnitMap[tokenConfig.durationUnit] || 'hour';

              // Generate tokens on-the-fly for the combo
              for (let i = 0; i < tokenQuantity; i++) {
                const customUsername = generateDirectSaleUsername();

                console.log(`[Combo WiFi Token] Generating token on-the-fly: ${customUsername}`);
                console.log(`[Combo WiFi Token] WLAN SSID: ${tokenConfig.r710_wlans?.ssid}`);

                // Generate token on R710 device
                const tokenResult = await r710SessionManager.withSession(
                  {
                    ipAddress: r710IntegrationForCombo.device_registry!.ipAddress,
                    adminUsername: r710IntegrationForCombo.device_registry!.adminUsername,
                    adminPassword: decryptedPassword
                  },
                  async (r710Service) => {
                    return await r710Service.generateSingleGuestPass({
                      wlanName: tokenConfig.r710_wlans?.ssid || '',
                      username: customUsername,
                      duration: tokenConfig.durationValue,
                      durationUnit: apiDurationUnit,
                      deviceLimit: tokenConfig.deviceLimit || 2
                    });
                  }
                );

                if (!tokenResult.success || !tokenResult.token) {
                  throw new Error(`Failed to generate WiFi token on R710 device: ${tokenResult.error || 'Unknown error'}`);
                }

                console.log(`[Combo WiFi Token] Token generated successfully: ${tokenResult.token.username}`);

                // Save token to database as SOLD
                const newToken = await prisma.r710Tokens.create({
                  data: {
                    businessId,
                    wlanId: tokenConfig.r710_wlans!.id,
                    tokenConfigId: tokenConfig.id,
                    username: tokenResult.token.username,
                    password: tokenResult.token.password,
                    status: 'SOLD',
                    expiresAtR710: tokenResult.token.expiresAt,
                    createdAt: new Date()
                  }
                });

                // Create sale record
                await prisma.r710TokenSales.create({
                  data: {
                    businessId: businessId,
                    tokenId: newToken.id,
                    expenseAccountId: r710ExpenseAccount.id,
                    saleAmount: 0, // Complimentary in combo
                    paymentMethod: paymentMethod,
                    saleChannel: 'POS',
                    soldBy: user.id,
                    soldAt: new Date()
                  }
                });

                // Add to generatedR710Tokens for receipt
                generatedR710Tokens.push({
                  itemName: `${item.name} - WiFi Access`,
                  password: tokenResult.token.password,
                  packageName: tokenConfig.name || 'WiFi Access',
                  durationValue: tokenConfig.durationValue || 0,
                  durationUnit: tokenConfig.durationUnit || 'hour_Hours',
                  expiresAt: tokenResult.token.expiresAt,
                  ssid: tokenConfig.r710_wlans?.ssid,
                  success: true,
                  fromCombo: true
                });
              }
            }
          }

          // Create order item for the combo
          await prisma.businessOrderItems.create({
            data: {
              orderId: newOrder.id,
              productVariantId: null, // Combos don't have variants
              quantity: itemQuantity,
              unitPrice: itemPrice,
              discountAmount: 0,
              totalPrice: itemTotal,
              attributes: {
                productName: item.name,
                category: 'combos',
                isCombo: true,
                comboId: (item as any).comboId,
                comboItems: comboItems.map((ci: any) => ({
                  name: ci.name || ci.business_products?.name || ci.r710_token_configs?.name,
                  quantity: ci.quantity,
                  isWifiToken: !!ci.tokenConfigId
                }))
              }
            }
          });

          // Skip regular product handling for combos
          continue;
        } catch (comboError) {
          console.error('❌ Combo processing error - rolling back order:', comboError);

          // Rollback the order
          await prisma.businessOrderItems.deleteMany({
            where: { orderId: newOrder.id }
          });
          await prisma.businessOrders.delete({
            where: { id: newOrder.id }
          });

          const errorMessage = comboError instanceof Error ? comboError.message : 'Unknown error';
          return NextResponse.json({
            error: `Combo Error: ${errorMessage}\n\nTransaction cancelled. Please try again or contact support.`,
            success: false,
            rollback: true,
            comboError: errorMessage
          }, { status: 400 });
        }
      }

      // Find the product variant for this item
      let variantId: string | null = null

      // Try to find as a product first and get its default variant
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

        if (existingVariant) {
          variantId = existingVariant.id
        } else {
          // No variant found — still create the order item with productId in attributes
          console.warn('No variant for item:', item.id, item.name, '— creating order item without variant link')
        }
      }

      // Create order item (always, even without a variant)
      await prisma.businessOrderItems.create({
        data: {
          orderId: newOrder.id,
          productVariantId: variantId,
          quantity: itemQuantity,
          unitPrice: itemPrice,
          discountAmount: 0,
          totalPrice: itemTotal,
          attributes: {
            productId: item.id,
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
                employeeName: user.name,
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

    // Handle reward redemption (mark as REDEEMED, generate free WiFi token, add free product item)
    let rewardFreeItem: { name: string; price: number; quantity: number } | null = null
    if (rewardId) {
      try {
        const reward = await prisma.customerRewards.findUnique({
          where: { id: rewardId },
          select: { id: true, status: true, rewardType: true, rewardAmount: true, rewardProductId: true, wifiTokenConfigId: true, couponCode: true }
        })
        if (reward && reward.status === 'ISSUED') {
          // Mark reward as REDEEMED
          await prisma.customerRewards.update({
            where: { id: rewardId },
            data: { status: 'REDEEMED', redeemedAt: new Date(), redeemedOrderId: newOrder.id }
          })

          // Store rewardCouponCode in order attributes for receipt history tracing
          await prisma.businessOrders.update({
            where: { id: newOrder.id },
            data: {
              attributes: {
                ...(newOrder.attributes as any || {}),
                rewardCouponCode: reward.couponCode
              }
            }
          })

          // Free WiFi token (R710) — generate on-the-fly, same as R710 WiFi Sales direct sale flow
          if (reward.wifiTokenConfigId) {
            try {
              const tokenResult = await generateAndSellR710Token({
                businessId,
                tokenConfigId: reward.wifiTokenConfigId,
                saleAmount: 0, // Free reward
                paymentMethod,
                soldBy: user.id,
                saleChannel: 'POS'
              })
              generatedR710Tokens.push({
                itemName: 'Free WiFi (Reward)',
                password: tokenResult.token.password,
                packageName: tokenResult.token.tokenConfig.name || 'Reward WiFi',
                durationValue: tokenResult.token.tokenConfig.durationValue || 0,
                durationUnit: tokenResult.token.tokenConfig.durationUnit || 'hour_Hours',
                expiresAt: tokenResult.token.expiresAt,
                ssid: tokenResult.wlanSsid,
                success: true
              })
            } catch (wifiErr) {
              console.warn('Free WiFi token generation failed (non-critical):', wifiErr)
            }
          }

          // Free product if campaign has rewardProductId
          if (reward.rewardProductId) {
            try {
              const freeProduct = await prisma.businessProducts.findUnique({
                where: { id: reward.rewardProductId },
                select: { id: true, name: true, sku: true }
              })
              if (freeProduct) {
                await prisma.businessOrderItems.create({
                  data: {
                    orderId: newOrder.id,
                    productVariantId: null,
                    quantity: 1,
                    unitPrice: 0,
                    discountAmount: 0,
                    totalPrice: 0,
                    attributes: {
                      productId: freeProduct.id,
                      productName: freeProduct.name,
                      category: 'promo-free-item',
                      rewardCouponCode: reward.couponCode
                    }
                  }
                })
                rewardFreeItem = { name: `${freeProduct.name} (Free Reward)`, price: 0, quantity: 1 }
              }
            } catch (productErr) {
              console.warn('Free product item creation failed (non-critical):', productErr)
            }
          }
        }
      } catch (rewardErr) {
        console.warn('Reward redemption failed (non-critical):', rewardErr)
      }
    }

    // Record audit entry for order creation
    try {
      await auditCreate({ userId: user.id }, 'Business', newOrder.id, {
        orderNumber,
        total,
        itemCount: items.length,
        inventoryUpdates: inventoryUpdates.length
      }, { tableName: 'orders', recordId: newOrder.id })
    } catch (auditErr) {
      console.warn('Audit log failed for order creation', auditErr)
    }

    // Record coupon usage if a coupon was applied
    if (couponId && reqCouponDiscount > 0) {
      try {
        const coupon = await prisma.coupons.findUnique({ where: { id: couponId } })
        if (coupon && coupon.isActive) {
          await prisma.couponUsages.create({
            data: {
              couponId: coupon.id,
              orderId: newOrder.id,
              appliedAmount: reqCouponDiscount,
              customerPhone: couponCustomerPhone || null
            }
          })
          // Store couponCode in order attributes for receipt history tracing
          await prisma.businessOrders.update({
            where: { id: newOrder.id },
            data: {
              attributes: {
                ...(newOrder.attributes as any || {}),
                rewardCouponCode: reqCouponCode
              }
            }
          })
        }
      } catch (couponErr) {
        console.warn('Failed to record coupon usage:', couponErr)
      }
    }

    // Credit business account when order is COMPLETED with PAID status
    if (paymentStatus === 'PAID' && total > 0) {
      try {
        await initializeBusinessAccount(businessId, 0, user.id)
        await processBusinessTransaction({
          businessId,
          amount: total,
          type: 'deposit',
          description: `Order revenue - ${orderNumber}`,
          referenceId: newOrder.id,
          referenceType: 'order',
          notes: 'Completed order payment received',
          createdBy: user.id
        })
      } catch (balanceError) {
        console.error('Failed to credit business balance for order:', balanceError)
      }
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
      discountAmount: reqDiscountAmount,
      inventoryUpdates,
      wifiTokens: generatedESP32Tokens,
      r710Tokens: generatedR710Tokens,
      rewardFreeItem,  // Free product from reward (if any)
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