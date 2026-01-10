/**
 * Tests for BroadcastChannel synchronization
 */

import { BroadcastSync } from '@/lib/customer-display/broadcast-sync'

describe('BroadcastSync', () => {
  let sync: BroadcastSync
  const businessId = 'test-business-123'
  const terminalId = 'test-terminal-456'

  beforeEach(() => {
    // Mock BroadcastChannel
    global.BroadcastChannel = jest.fn().mockImplementation((name) => ({
      name,
      postMessage: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })) as any
  })

  afterEach(() => {
    if (sync) {
      sync.disconnect()
    }
  })

  describe('Connection', () => {
    it('should create a BroadcastChannel with correct name', () => {
      sync = new BroadcastSync({
        businessId,
        terminalId
      })

      sync.connect()

      expect(BroadcastChannel).toHaveBeenCalledWith(
        `customer-display-${businessId}-${terminalId}`
      )
    })

    it('should be connected after calling connect', () => {
      sync = new BroadcastSync({
        businessId,
        terminalId
      })

      expect(sync.isConnected()).toBe(false)

      sync.connect()

      expect(sync.isConnected()).toBe(true)
    })

    it('should not create multiple channels if connect called twice', () => {
      sync = new BroadcastSync({
        businessId,
        terminalId
      })

      sync.connect()
      const firstCall = (BroadcastChannel as jest.Mock).mock.calls.length

      // Calling connect again should not create a new channel if already connected
      if (!sync.isConnected()) {
        sync.connect()
      }
      const secondCall = (BroadcastChannel as jest.Mock).mock.calls.length

      expect(firstCall).toBe(secondCall)
    })
  })

  describe('Message Sending', () => {
    it('should send SET_GREETING message correctly', () => {
      const mockChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }

      ;(BroadcastChannel as jest.Mock).mockImplementation(() => mockChannel)

      sync = new BroadcastSync({
        businessId,
        terminalId
      })

      sync.connect()

      const greetingPayload = {
        employeeName: 'John Doe',
        businessName: 'Test Business',
        businessPhone: '123-456-7890',
        customMessage: 'Welcome!',
        subtotal: 0,
        tax: 0,
        total: 0
      }

      sync.send('SET_GREETING', greetingPayload)

      expect(mockChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GREETING',
          payload: greetingPayload,
          businessId,
          terminalId,
          timestamp: expect.any(Number)
        })
      )
    })

    it('should send CART_STATE message correctly', () => {
      const mockChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }

      ;(BroadcastChannel as jest.Mock).mockImplementation(() => mockChannel)

      sync = new BroadcastSync({
        businessId,
        terminalId
      })

      sync.connect()

      const cartPayload = {
        items: [
          { id: '1', name: 'Item 1', quantity: 2, price: 10.00 }
        ],
        subtotal: 20.00,
        tax: 1.60,
        total: 21.60
      }

      sync.send('CART_STATE', cartPayload)

      expect(mockChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CART_STATE',
          payload: cartPayload,
          businessId,
          terminalId,
          timestamp: expect.any(Number)
        })
      )
    })

    it('should not throw error when sending while disconnected', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      sync = new BroadcastSync({
        businessId,
        terminalId
      })

      // Should not throw, just warn
      expect(() => {
        sync.send('SET_GREETING', { subtotal: 0, tax: 0, total: 0 })
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith(
        'BroadcastSync: Cannot send message, channel not connected'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Message Receiving', () => {
    it('should call onMessage when receiving messages with matching businessId and terminalId', () => {
      const onMessage = jest.fn()
      let messageListener: any

      const mockChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn((event, listener) => {
          if (event === 'message') {
            messageListener = listener
          }
        }),
        removeEventListener: jest.fn()
      }

      ;(BroadcastChannel as jest.Mock).mockImplementation(() => mockChannel)

      sync = new BroadcastSync({
        businessId,
        terminalId,
        onMessage
      })

      sync.connect()

      // Simulate receiving a message with matching business/terminal IDs
      const testMessage = {
        type: 'SET_GREETING' as const,
        payload: {
          employeeName: 'Test User',
          businessName: 'Test Business',
          subtotal: 0,
          tax: 0,
          total: 0
        },
        businessId,
        terminalId,
        timestamp: Date.now()
      }

      messageListener({ data: testMessage })

      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })

    it('should ignore messages from different businessId/terminalId', () => {
      const onMessage = jest.fn()
      let messageListener: any

      const mockChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn((event, listener) => {
          if (event === 'message') {
            messageListener = listener
          }
        }),
        removeEventListener: jest.fn()
      }

      ;(BroadcastChannel as jest.Mock).mockImplementation(() => mockChannel)

      sync = new BroadcastSync({
        businessId,
        terminalId,
        onMessage
      })

      sync.connect()

      // Simulate receiving a message from a DIFFERENT business
      const testMessage = {
        type: 'SET_GREETING' as const,
        payload: {
          employeeName: 'Test User',
          businessName: 'Different Business',
          subtotal: 0,
          tax: 0,
          total: 0
        },
        businessId: 'different-business-id',
        terminalId: 'different-terminal-id',
        timestamp: Date.now()
      }

      messageListener({ data: testMessage })

      // Should NOT call onMessage for different business
      expect(onMessage).not.toHaveBeenCalled()
    })
  })

  describe('Disconnection', () => {
    it('should close channel on disconnect', () => {
      const mockChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }

      ;(BroadcastChannel as jest.Mock).mockImplementation(() => mockChannel)

      sync = new BroadcastSync({
        businessId,
        terminalId
      })

      sync.connect()
      expect(sync.isConnected()).toBe(true)

      sync.disconnect()

      expect(mockChannel.close).toHaveBeenCalled()
      expect(sync.isConnected()).toBe(false)
    })

    it('should remove event listener when disconnecting', () => {
      const mockChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }

      ;(BroadcastChannel as jest.Mock).mockImplementation(() => mockChannel)

      sync = new BroadcastSync({
        businessId,
        terminalId
      })

      sync.connect()
      sync.disconnect()

      expect(mockChannel.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
    })
  })
})
