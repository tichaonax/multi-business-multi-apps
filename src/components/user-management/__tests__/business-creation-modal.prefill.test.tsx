import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { BusinessCreationModal } from '../business-creation-modal'

// A small test harness that performs the same steps the Manage page does
// before opening the edit modal: fetch business config and pass it as
// `initial` to the modal. That keeps the test focused and avoids needing
// the full BusinessPermissionsProvider or page wiring.
function TestHarness() {
  const [show, setShow] = React.useState(false)
  const [initial, setInitial] = React.useState<any | null>(null)

  const openEdit = async () => {
    const res = await fetch('/api/universal/business-config?businessId=BUS-TEST')
    if (!res.ok) throw new Error('fetch failed')
    const json = await res.json()
    const biz = json?.data
    setInitial({
      name: biz?.businessName || '',
      type: biz?.businessType || 'other',
      description: biz?.businessDescription || ''
    })
    setShow(true)
  }

  return (
    <div>
      <button onClick={openEdit}>Open Edit</button>
      {show && initial && (
        <BusinessCreationModal
          onClose={() => setShow(false)}
          onSuccess={() => {}}
          onError={() => {}}
          initial={initial}
          method="PUT"
          id="BUS-TEST"
        />
      )}
    </div>
  )
}

describe('BusinessCreationModal pre-fill from fetched business-config', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('fetches business-config and pre-fills the modal fields', async () => {
    const mockData = {
      data: {
        businessName: 'Acme Test Co',
        businessType: 'retail',
        businessDescription: 'A delightful shop of testing things'
      }
    }

    jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    } as any)

    render(<TestHarness />)

    // Trigger the fetch + modal open
    fireEvent.click(screen.getByText('Open Edit'))

    // Wait for the modal header to appear
    await waitFor(() => expect(screen.getByText(/Edit Business/i)).toBeInTheDocument())

    // Inputs should be populated with values from mockData
    const nameInput = screen.getByPlaceholderText('Enter business name') as HTMLInputElement
    expect(nameInput).toHaveValue('Acme Test Co')

    const description = screen.getByPlaceholderText('Brief description of the business') as HTMLTextAreaElement
    expect(description).toHaveValue('A delightful shop of testing things')

    const typeSelect = screen.getByRole('combobox') as HTMLSelectElement
    expect(typeSelect).toHaveValue('retail')
  })
})
