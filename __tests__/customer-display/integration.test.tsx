/**
 * Integration tests for POS -> Customer Display communication
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'

describe('POS to Customer Display Integration', () => {
  const businessId = 'test-business-123'
  const terminalId = 'test-terminal-456'

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock BroadcastChannel to simulate real communication
    const channels: Map<string, Set<any>> = new Map()

    global.BroadcastChannel = jest.fn().mockImplementation((name: string) => {
      // Get or create listener set for this channel name
      if (!channels.has(name)) {
        channels.set(name, new Set())
      }
      const listeners = channels.get(name)!

      const channel = {
        name,
        postMessage: jest.fn((message) => {
          // Simulate broadcasting to ALL listeners on this channel name
          // This includes listeners from other BroadcastChannel instances with the same name
          setTimeout(() => {
            listeners.forEach(listener => {
              try {
                listener({ data: message })
              } catch (err) {
                console.error('Error in message listener:', err)
              }
            })
          }, 0)
        }),
        close: jest.fn(() => {
          // Don't delete the channel, just clear this instance's listeners
          // Real BroadcastChannel keeps the channel alive as long as any instance exists
        }),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'message') {
            listeners.add(listener)
          }
        }),
        removeEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'message') {
            listeners.delete(listener)
          }
        })
      }

      return channel
    }) as any
  })

  it('should send and receive SET_GREETING message between POS and display', async () => {
    const displayOnMessage = jest.fn()

    // Render customer display hook
    const { result: displayResult } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId,
        mode: SyncMode.BROADCAST,
        autoConnect: true,
        onMessage: displayOnMessage
      })
    )

    // Render POS hook
    const { result: posResult } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId,
        mode: SyncMode.BROADCAST,
        autoConnect: true
      })
    )

    // Wait for both to connect
    await waitFor(() => {
      expect(displayResult.current.isConnected).toBe(true)
      expect(posResult.current.isConnected).toBe(true)
    })

    // POS sends greeting
    const greetingData = {
      employeeName: 'John Doe',
      businessName: 'HXI Eats',
      businessPhone: '+263 887787987',
      customMessage: 'All sales are final, returns not accepted',
      subtotal: 0,
      tax: 0,
      total: 0
    }

    act(() => {
      posResult.current.send('SET_GREETING', greetingData)
    })

    // Display should receive the message
    await waitFor(() => {
      expect(displayOnMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GREETING',
          payload: greetingData,
          businessId,
          terminalId,
          timestamp: expect.any(Number)
        })
      )
    }, { timeout: 2000 })
  })

  it('should send and receive CART_STATE message', async () => {
    const displayOnMessage = jest.fn()

    const { result: displayResult } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId,
        mode: SyncMode.BROADCAST,
        autoConnect: true,
        onMessage: displayOnMessage
      })
    )

    const { result: posResult } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId,
        mode: SyncMode.BROADCAST,
        autoConnect: true
      })
    )

    await waitFor(() => {
      expect(displayResult.current.isConnected).toBe(true)
      expect(posResult.current.isConnected).toBe(true)
    })

    const cartData = {
      items: [
        { id: '1', name: 'Burger', quantity: 2, price: 15.00, variant: 'Large' },
        { id: '2', name: 'Fries', quantity: 1, price: 5.00 }
      ],
      subtotal: 35.00,
      tax: 2.80,
      total: 37.80
    }

    act(() => {
      posResult.current.send('CART_STATE', cartData)
    })

    await waitFor(() => {
      expect(displayOnMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CART_STATE',
          payload: cartData,
          businessId,
          terminalId,
          timestamp: expect.any(Number)
        })
      )
    }, { timeout: 2000 })
  })

  it('should send SET_PAGE_CONTEXT message', async () => {
    const displayOnMessage = jest.fn()

    const { result: displayResult } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId,
        mode: SyncMode.BROADCAST,
        autoConnect: true,
        onMessage: displayOnMessage
      })
    )

    const { result: posResult } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId,
        mode: SyncMode.BROADCAST,
        autoConnect: true
      })
    )

    await waitFor(() => {
      expect(displayResult.current.isConnected).toBe(true)
      expect(posResult.current.isConnected).toBe(true)
    })

    const contextData = {
      pageContext: 'pos' as const,
      subtotal: 0,
      tax: 0,
      total: 0
    }

    act(() => {
      posResult.current.send('SET_PAGE_CONTEXT', contextData)
    })

    await waitFor(() => {
      expect(displayOnMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_PAGE_CONTEXT',
          payload: contextData,
          businessId,
          terminalId,
          timestamp: expect.any(Number)
        })
      )
    }, { timeout: 2000 })
  })

  it('should handle multiple messages in sequence', async () => {
    const displayOnMessage = jest.fn()

    const { result: displayResult } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId,
        mode: SyncMode.BROADCAST,
        autoConnect: true,
        onMessage: displayOnMessage
      })
    )

    const { result: posResult } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId,
        mode: SyncMode.BROADCAST,
        autoConnect: true
      })
    )

    await waitFor(() => {
      expect(displayResult.current.isConnected).toBe(true)
      expect(posResult.current.isConnected).toBe(true)
    })

    // Send greeting
    act(() => {
      posResult.current.send('SET_GREETING', {
        employeeName: 'Test User',
        businessName: 'Test Business',
        businessPhone: '123-456-7890',
        customMessage: 'Welcome!',
        subtotal: 0,
        tax: 0,
        total: 0
      })
    })

    // Send page context
    act(() => {
      posResult.current.send('SET_PAGE_CONTEXT', {
        pageContext: 'pos',
        subtotal: 0,
        tax: 0,
        total: 0
      })
    })

    // Send cart state
    act(() => {
      posResult.current.send('CART_STATE', {
        items: [{ id: '1', name: 'Item', quantity: 1, price: 10.00 }],
        subtotal: 10.00,
        tax: 0.80,
        total: 10.80
      })
    })

    await waitFor(() => {
      expect(displayOnMessage).toHaveBeenCalledTimes(3)
    }, { timeout: 2000 })

    expect(displayOnMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: 'SET_GREETING',
      businessId,
      terminalId
    }))
    expect(displayOnMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: 'SET_PAGE_CONTEXT',
      businessId,
      terminalId
    }))
    expect(displayOnMessage).toHaveBeenNthCalledWith(3, expect.objectContaining({
      type: 'CART_STATE',
      businessId,
      terminalId
    }))
  })

  it('should isolate messages between different terminals', async () => {
    const display1OnMessage = jest.fn()
    const display2OnMessage = jest.fn()

    // Terminal 1 display
    const { result: display1Result } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId: 'terminal-1',
        mode: SyncMode.BROADCAST,
        autoConnect: true,
        onMessage: display1OnMessage
      })
    )

    // Terminal 2 display
    const { result: display2Result } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId: 'terminal-2',
        mode: SyncMode.BROADCAST,
        autoConnect: true,
        onMessage: display2OnMessage
      })
    )

    // Terminal 1 POS
    const { result: pos1Result } = renderHook(() =>
      useCustomerDisplaySync({
        businessId,
        terminalId: 'terminal-1',
        mode: SyncMode.BROADCAST,
        autoConnect: true
      })
    )

    await waitFor(() => {
      expect(display1Result.current.isConnected).toBe(true)
      expect(display2Result.current.isConnected).toBe(true)
      expect(pos1Result.current.isConnected).toBe(true)
    })

    // POS 1 sends message
    act(() => {
      pos1Result.current.send('SET_GREETING', {
        employeeName: 'Terminal 1 User',
        businessName: 'Test Business',
        subtotal: 0,
        tax: 0,
        total: 0
      })
    })

    await waitFor(() => {
      expect(display1OnMessage).toHaveBeenCalled()
    }, { timeout: 2000 })

    // Display 2 should NOT receive terminal 1's message
    expect(display2OnMessage).not.toHaveBeenCalled()

    // Verify display 1 received the correct message for terminal-1
    expect(display1OnMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_GREETING',
        businessId,
        terminalId: 'terminal-1'
      })
    )
  })
})
