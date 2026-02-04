'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MacEntry {
  mac: string
  macComment: string
}

export default function CreateAclPage() {
  return (
    <ProtectedRoute requiredPermission="isSystemAdmin">
      <MainLayout>
        <ContentLayout>
          <CreateAclContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function CreateAclContent() {
  const router = useRouter()
  const { currentBusiness } = useBusinessPermissionsContext()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mode: 'allow' as 'allow' | 'deny' // allow = blacklist, deny = whitelist
  })

  const [macEntries, setMacEntries] = useState<MacEntry[]>([])
  const [bulkMacs, setBulkMacs] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleAddMac = () => {
    setMacEntries([...macEntries, { mac: '', macComment: '' }])
  }

  const handleRemoveMac = (index: number) => {
    setMacEntries(macEntries.filter((_, i) => i !== index))
  }

  const handleMacChange = (index: number, field: keyof MacEntry, value: string) => {
    const updated = [...macEntries]
    updated[index][field] = value
    setMacEntries(updated)
  }

  const formatMacAddress = (mac: string): string => {
    // Remove all non-hex characters
    const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase()

    // Ensure it's exactly 12 characters
    if (cleaned.length !== 12) {
      return mac // Return original if invalid length
    }

    // Format as XX:XX:XX:XX:XX:XX
    return cleaned.match(/.{1,2}/g)?.join(':') || mac
  }

  const handleBulkImport = () => {
    const lines = bulkMacs.split('\n').filter(line => line.trim())
    const newEntries: MacEntry[] = []

    for (const line of lines) {
      const parts = line.split('#')
      const mac = formatMacAddress(parts[0].trim())
      const comment = parts[1]?.trim() || ''

      if (mac && /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
        newEntries.push({ mac, macComment: comment })
      }
    }

    setMacEntries([...macEntries, ...newEntries])
    setBulkMacs('')
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('ACL name is required')
      return false
    }

    if (!formData.description.trim()) {
      setError('Description is required')
      return false
    }

    // Validate MAC addresses
    for (const entry of macEntries) {
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(entry.mac)) {
        setError(`Invalid MAC address: ${entry.mac}`)
        return false
      }
    }

    setError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!currentBusiness?.businessId) {
      setError('No business selected')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const payload = {
        businessId: currentBusiness.businessId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        mode: formData.mode,
        macs: macEntries
      }

      const response = await fetch('/api/r710/acl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/r710-portal/acl/${data.data.aclId}`)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to create ACL')
      }
    } catch (error) {
      console.error('Failed to create ACL:', error)
      setError('Failed to create ACL')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Link href="/r710-portal/acl" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create MAC Access Control List
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create a whitelist or blacklist for device MAC address filtering
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ACL Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., VIP Devices, Blocked Devices"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe the purpose of this ACL..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ACL Mode *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, mode: 'allow' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.mode === 'allow'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-2">🚫</div>
                  <div className="font-semibold text-gray-900 dark:text-white">Blacklist</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Block specific devices (allow all others)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, mode: 'deny' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.mode === 'deny'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-2">✅</div>
                  <div className="font-semibold text-gray-900 dark:text-white">Whitelist</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Allow only specific devices (block all others)
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MAC Addresses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">MAC Addresses</h2>
            <button
              type="button"
              onClick={handleAddMac}
              className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add MAC
            </button>
          </div>

          {/* Individual MAC Entries */}
          {macEntries.length > 0 && (
            <div className="space-y-3 mb-4">
              {macEntries.map((entry, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={entry.mac}
                      onChange={(e) => handleMacChange(index, 'mac', e.target.value.toUpperCase())}
                      onBlur={(e) => {
                        const formatted = formatMacAddress(e.target.value)
                        handleMacChange(index, 'mac', formatted)
                      }}
                      placeholder="XX:XX:XX:XX:XX:XX"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                    />
                    <input
                      type="text"
                      value={entry.macComment}
                      onChange={(e) => handleMacChange(index, 'macComment', e.target.value)}
                      placeholder="Comment (optional)"
                      maxLength={31}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMac(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bulk Import */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bulk Import (one MAC per line, optional comment after #)
            </label>
            <textarea
              value={bulkMacs}
              onChange={(e) => setBulkMacs(e.target.value)}
              rows={5}
              placeholder="2A:FE:6A:2C:89:DE # John's iPhone&#10;AA:BB:CC:DD:EE:FF # Office Laptop"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
            />
            <button
              type="button"
              onClick={handleBulkImport}
              className="mt-2 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Import MACs
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/r710-portal/acl"
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create ACL'}
          </button>
        </div>
      </form>
    </div>
  )
}
