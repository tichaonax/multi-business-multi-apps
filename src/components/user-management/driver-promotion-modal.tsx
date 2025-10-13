'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VehicleDriver } from '@/types/vehicle'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  User,
  Mail,
  Key,
  Building2,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react'

interface DriverPromotionModalProps {
  isOpen: boolean
  onClose: () => void
  driver: VehicleDriver | null
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

interface Business {
  id: string
  name: string
  type: string
}

interface PromotionResult {
  user: {
    id: string
    email: string
    name: string
    username: string
    loginUrl: string
    permissions: string[]
  }
  credentials: {
    username: string
    password: string
    note: string
  }
}

export function DriverPromotionModal({
  isOpen,
  onClose,
  driver,
  onSuccess,
  onError
}: DriverPromotionModalProps) {
  const [loading, setLoading] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [promotionResult, setPromotionResult] = useState<PromotionResult | null>(null)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    businessId: '',
    sendInvite: false
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load businesses when modal opens
  useEffect(() => {
    if (isOpen && !businesses.length) {
      loadBusinesses()
    }
  }, [isOpen])

  // Reset form when driver changes
  useEffect(() => {
    if (driver) {
      const baseUsername = driver.fullName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15)

      setFormData({
        username: baseUsername || 'driver',
        password: generatePassword(),
        email: driver.emailAddress || '',
        businessId: '',
        sendInvite: false
      })
      setPromotionResult(null)
      setError('')
    }
  }, [driver])

  const loadBusinesses = async () => {
    setLoadingBusinesses(true)
    try {
      const response = await fetch('/api/admin/businesses')
      if (response.ok) {
        const data = await response.json()
        setBusinesses(data || [])
      }
    } catch (err) {
      console.error('Error loading businesses:', err)
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver) return

    setLoading(true)
    setError('')

    try {
      const payload = {
        username: formData.username.trim(),
        password: formData.password,
        email: formData.email.trim() || undefined,
        businessId: formData.businessId || undefined,
        sendInvite: formData.sendInvite
      }

      const response = await fetch(`/api/admin/drivers/${driver.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setPromotionResult(result)
        onSuccess(`${driver.fullName} has been promoted to trip logger successfully!`)
      } else {
        setError(result.error || 'Failed to promote driver')
        onError(result.error || 'Failed to promote driver')
      }
    } catch (err) {
      const errorMsg = 'Network error occurred'
      setError(errorMsg)
      onError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const copyCredentials = () => {
    if (!promotionResult) return

    const credentials = `Username: ${promotionResult.credentials.username}\nPassword: ${promotionResult.credentials.password}\nLogin URL: ${window.location.origin}/auth/signin`
    navigator.clipboard.writeText(credentials)
  }

  const handleClose = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      businessId: '',
      sendInvite: false
    })
    setPromotionResult(null)
    setError('')
    onClose()
  }

  if (!driver || !mounted) return null

  const modalContent = (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Promote Driver to Trip Logger</span>
          </DialogTitle>
          <DialogDescription>
            Create a user account for <strong>{driver.fullName}</strong> with trip logging permissions only.
          </DialogDescription>
        </DialogHeader>

        {promotionResult ? (
          // Success state - show credentials
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Account Created Successfully!
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Login Credentials</Label>
                  <div className="bg-white dark:bg-gray-800 border rounded-lg p-3 mt-1">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Username:</span> {promotionResult.credentials.username}
                      </div>
                      <div>
                        <span className="font-medium">Password:</span> {promotionResult.credentials.password}
                      </div>
                      <div>
                        <span className="font-medium">Login URL:</span> {window.location.origin}/auth/signin
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Permissions Granted</Label>
                  <div className="flex flex-wrap gap-1">
                    {promotionResult.users.permissions.map((permission, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> {promotionResult.credentials.note}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={copyCredentials}
                variant="outline"
                className="flex-1 min-h-[44px]"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Credentials
              </Button>
              <Button
                onClick={handleClose}
                className="flex-1 min-h-[44px]"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          // Form state
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                </div>
              </div>
            )}

            {/* Driver Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">Driver Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {driver.fullName}
                </div>
                <div>
                  <span className="font-medium">License:</span> {driver.licenseNumber}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {driver.phoneNumber || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {driver.emailAddress || 'Not provided'}
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Username *</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username for driver"
                required
                className="min-h-[44px]"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>Password *</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Generated password"
                  required
                  className="min-h-[44px] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}
                >
                  Generate New
                </Button>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email {!driver.emailAddress && '*'}</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={driver.emailAddress ? "Using driver's email" : "Enter email address"}
                required={!driver.emailAddress}
                disabled={!!driver.emailAddress}
                className="min-h-[44px]"
              />
              {driver.emailAddress && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Using email from driver record
                </p>
              )}
            </div>

            {/* Business Assignment */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Business Assignment (Optional)</span>
              </Label>
              <Select
                value={formData.businessId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, businessId: value }))}
                disabled={loadingBusinesses}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select business (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name} ({business.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Send Invite */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sendInvite"
                checked={formData.sendInvite}
                onChange={(e) => setFormData(prev => ({ ...prev, sendInvite: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="sendInvite" className="text-sm">
                Send invitation email with login credentials
              </Label>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 min-h-[44px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Trip Logger Account'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )

  // Use portal to render modal at document body level to ensure proper z-index layering
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}