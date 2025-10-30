import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BusinessCreationModal } from '../business-creation-modal'

describe('BusinessCreationModal', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('submits form and calls onSuccess with server payload', async () => {
    const mockResponse = { message: 'Business created successfully', business: { id: 'biz_123' } }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as any)

    const onClose = jest.fn()
    const onSuccess = jest.fn()
    const onError = jest.fn()

    render(<BusinessCreationModal onClose={onClose} onSuccess={onSuccess} onError={onError} />)

    const nameInput = screen.getByPlaceholderText(/enter business name/i)
    const createButton = screen.getByRole('button', { name: /create business/i })

    fireEvent.change(nameInput, { target: { value: 'Test Biz' } })

    fireEvent.click(createButton)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })

    const calledWith = onSuccess.mock.calls[0][0]
    expect(calledWith).toHaveProperty('message', mockResponse.message)
    expect(calledWith).toHaveProperty('business')
    expect(calledWith.business.id).toBe('biz_123')
  })
})
