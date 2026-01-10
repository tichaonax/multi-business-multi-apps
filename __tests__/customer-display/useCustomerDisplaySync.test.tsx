/**
 * Tests for useCustomerDisplaySync hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'

describe('useCustomerDisplaySync', () => {
  const businessId = 'test-business-123'
  const terminalId = 'test-terminal-456'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useCustomerDisplaySync({
          businessId,
          terminalId,
          mode: SyncMode.BROADCAST,
          autoConnect: false
        })
      )

      expect(result.current.isConnected).toBe(false)
      expect(result.current.syncMode).toBe(null)
      expect(result.current.error).toBe(null)
    })

    it('should auto-connect when autoConnect is true', async () => {
      const { result } = renderHook(() =>
        useCustomerDisplaySync({
          businessId,
          terminalId,
          mode: SyncMode.BROADCAST,
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.syncMode).toBe('broadcast')
      })
    })

    it('should not reconnect when callbacks change', async () => {
      const { result, rerender } = renderHook(
        ({ onError }) =>
          useCustomerDisplaySync({
            businessId,
            terminalId,
            mode: SyncMode.BROADCAST,
            autoConnect: true,
            onError
          }),
        {
          initialProps: { onError: jest.fn() }
        }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const initialSyncMode = result.current.syncMode

      // Change the callback
      rerender({ onError: jest.fn() })

      // Wait a bit to ensure no reconnection
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still be the same sync mode (not reconnected)
      expect(result.current.syncMode).toBe(initialSyncMode)
    })
  })

  describe('Message Sending', () => {
    it('should send SET_GREETING message', async () => {
      const { result } = renderHook(() =>
        useCustomerDisplaySync({
          businessId,
          terminalId,
          mode: SyncMode.BROADCAST,
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        result.current.send('SET_GREETING', {
          employeeName: 'Test User',
          businessName: 'Test Business',
          businessPhone: '123-456-7890',
          customMessage: 'Welcome!',
          subtotal: 0,
          tax: 0,
          total: 0
        })
      })

      // Send function should execute without errors
      expect(result.current.error).toBe(null)
    })

    it('should send CART_STATE message', async () => {
      const { result } = renderHook(() =>
        useCustomerDisplaySync({
          businessId,
          terminalId,
          mode: SyncMode.BROADCAST,
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        result.current.send('CART_STATE', {
          items: [
            { id: '1', name: 'Item 1', quantity: 2, price: 10.00 }
          ],
          subtotal: 20.00,
          tax: 1.60,
          total: 21.60
        })
      })

      expect(result.current.error).toBe(null)
    })

    it('should handle send when not connected gracefully', async () => {
      const onError = jest.fn()

      const { result } = renderHook(() =>
        useCustomerDisplaySync({
          businessId,
          terminalId,
          mode: SyncMode.BROADCAST,
          autoConnect: false, // Don't auto-connect
          onError
        })
      )

      // Try to send without connecting
      act(() => {
        result.current.send('SET_GREETING', { subtotal: 0, tax: 0, total: 0 })
      })

      // Should not throw or call onError, just log a warning
      expect(result.current.error).toBe(null)
      expect(onError).not.toHaveBeenCalled()
    })
  })

  describe('Connection Management', () => {
    it('should connect manually when connect is called', async () => {
      const { result } = renderHook(() =>
        useCustomerDisplaySync({
          businessId,
          terminalId,
          mode: SyncMode.BROADCAST,
          autoConnect: false
        })
      )

      expect(result.current.isConnected).toBe(false)

      await act(async () => {
        await result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
    })

    it('should disconnect when disconnect is called', async () => {
      const { result } = renderHook(() =>
        useCustomerDisplaySync({
          businessId,
          terminalId,
          mode: SyncMode.BROADCAST,
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false)
      })
    })

    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useCustomerDisplaySync({
          businessId,
          terminalId,
          mode: SyncMode.BROADCAST,
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      unmount()

      // Should not throw errors
      expect(result.current.error).toBe(null)
    })
  })

  describe('Callback Stability', () => {
    it('should use latest onMessage callback without reconnecting', async () => {
      const firstOnMessage = jest.fn()
      const secondOnMessage = jest.fn()

      const { result, rerender } = renderHook(
        ({ onMessage }) =>
          useCustomerDisplaySync({
            businessId,
            terminalId,
            mode: SyncMode.BROADCAST,
            autoConnect: true,
            onMessage
          }),
        {
          initialProps: { onMessage: firstOnMessage }
        }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const initialSyncMode = result.current.syncMode

      // Change callback
      rerender({ onMessage: secondOnMessage })

      // Wait to ensure no reconnection
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still have same sync mode (not reconnected)
      expect(result.current.syncMode).toBe(initialSyncMode)
      expect(result.current.isConnected).toBe(true)
    })

    it('should use latest onError callback without reconnecting', async () => {
      const firstOnError = jest.fn()
      const secondOnError = jest.fn()

      const { result, rerender } = renderHook(
        ({ onError }) =>
          useCustomerDisplaySync({
            businessId,
            terminalId,
            mode: SyncMode.BROADCAST,
            autoConnect: true,
            onError
          }),
        {
          initialProps: { onError: firstOnError }
        }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const initialSyncMode = result.current.syncMode

      // Change callback
      rerender({ onError: secondOnError })

      // Wait to ensure no reconnection
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still have same sync mode (not reconnected)
      expect(result.current.syncMode).toBe(initialSyncMode)
      expect(result.current.isConnected).toBe(true)
    })
  })
})
