import { NextRequest, NextResponse } from 'next/server'

// In-memory cart storage (keyed by businessId)
// In production, this should be Redis or a database
const cartStore = new Map<string, {
  cart: any[]
  timestamp: number
}>()

// Cleanup old carts (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  for (const [businessId, data] of cartStore.entries()) {
    if (data.timestamp < oneHourAgo) {
      cartStore.delete(businessId)
    }
  }
}, 5 * 60 * 1000) // Cleanup every 5 minutes

// GET - Fetch current cart for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const cartData = cartStore.get(businessId)

    if (!cartData) {
      return NextResponse.json({
        success: true,
        cart: [],
        timestamp: Date.now()
      })
    }

    return NextResponse.json({
      success: true,
      cart: cartData.cart,
      timestamp: cartData.timestamp
    })
  } catch (error) {
    console.error('[CartAPI] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    )
  }
}

// POST - Update cart for a business
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, cart } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(cart)) {
      return NextResponse.json(
        { error: 'cart must be an array' },
        { status: 400 }
      )
    }

    // Store cart
    cartStore.set(businessId, {
      cart,
      timestamp: Date.now()
    })

    console.log(`[CartAPI] Updated cart for business ${businessId}:`, cart.length, 'items')

    return NextResponse.json({
      success: true,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('[CartAPI] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update cart' },
      { status: 500 }
    )
  }
}
