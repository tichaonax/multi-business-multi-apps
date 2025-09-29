"use client"

import React, { useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  isOpen: boolean
  onClose: () => void
  businessId: string | null
  onConfirm: (useTargeted: boolean) => Promise<void>
}

export function AdminSeedPromptModal({ isOpen, onClose, businessId, onConfirm }: Props) {
  if (!isOpen) return null
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState<'choose' | 'confirm'>('choose')
  const [selectedAction, setSelectedAction] = useState<'single' | 'full' | null>(null)

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Create demo business</h3>
            <p className="text-sm text-secondary">The business you requested ({businessId}) was not found. As an administrator you can create demo data to continue. Choose whether to create a single demo business (if available) or the full dev dataset.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mt-4 space-y-3">
          {step === 'choose' && (
            <>
              <div className="text-sm text-secondary">Actions</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedAction('single')
                    setStep('confirm')
                  }}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm"
                >
                  Create single demo business
                </button>
                <button
                  onClick={() => {
                    setSelectedAction('full')
                    setStep('confirm')
                  }}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                >
                  Create full dev dataset
                </button>
                <button onClick={onClose} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-sm rounded-md">Cancel</button>
              </div>
            </>
          )}

          {step === 'confirm' && selectedAction && (
            <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-700">
              <div className="text-sm font-semibold mb-2">Confirm action</div>
              <div className="text-sm text-secondary mb-3">
                {selectedAction === 'single' ? (
                  <>This will create a single demo business with sample data. You will be returned to the admin page once complete.</>
                ) : (
                  <>This will create the full developer dataset (many demo businesses, employees, and reference data). This operation is destructive to any existing demo data for the same businesses.</>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      setProcessing(true)
                      await onConfirm(selectedAction === 'single')
                    } finally {
                      setProcessing(false)
                      setStep('choose')
                      setSelectedAction(null)
                      onClose()
                    }
                  }}
                  disabled={processing}
                  className={`px-3 py-2 ${processing ? 'opacity-60 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white rounded-md text-sm`}
                >
                  {processing ? 'Seeding...' : 'Confirm and start'}
                </button>
                <button
                  onClick={() => {
                    setStep('choose')
                    setSelectedAction(null)
                  }}
                  disabled={processing}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-sm rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500">Only administrators can perform this operation.</div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modalContent
  return createPortal(modalContent, document.body)
}

export default AdminSeedPromptModal
