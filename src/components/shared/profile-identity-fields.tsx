'use client'

import { useState } from 'react'

interface ProfileIdentityFieldsProps {
  firstName: string
  lastName: string
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  photoUrl: string | null
  onPhotoChange: (url: string | null) => void
  disabled?: boolean
  // Shown next to the photo, above the upload controls — e.g. an employee
  // number or a "linked to employee EMP000014" note. Purely decorative.
  subtitle?: string
}

/**
 * Shared name + profile-photo editor — the one place a person's identity
 * fields get edited, embedded identically in the Employee edit page, the
 * user's own "My Profile" page, and the Admin "Edit User" modal. When the
 * underlying User/Employee records are linked, whichever route handles the
 * save mirrors these fields into the other record — this component itself
 * has no notion of that; it just edits firstName/lastName/photoUrl on
 * whichever entity its parent page is saving.
 */
export function ProfileIdentityFields({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  photoUrl,
  onPhotoChange,
  disabled = false,
  subtitle,
}: ProfileIdentityFieldsProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('files', file)
      // No expiresInDays — profile photos are permanent.
      const res = await fetch('/api/universal/images', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        const url = data.data?.[0]?.url ?? data.url
        if (url) onPhotoChange(url)
      } else {
        setUploadError('Failed to upload photo')
      }
    } catch {
      setUploadError('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile photo"
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
              onError={(e) => { (e.target as HTMLImageElement).src = '/expired-photo.svg' }}
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {uploadingPhoto && (
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        <div>
          {subtitle && <p className="text-xs font-mono text-blue-500 dark:text-blue-400 mb-2">{subtitle}</p>}
          <p className="text-xs text-secondary mb-2">JPG, PNG or WEBP. Used for identification across the app.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <label className={`btn-secondary text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              {uploadingPhoto ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                disabled={disabled || uploadingPhoto}
                className="hidden"
              />
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={() => onPhotoChange(null)}
                disabled={disabled}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            disabled={disabled}
            className="input-field"
            placeholder="First name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            disabled={disabled}
            className="input-field"
            placeholder="Last name"
          />
        </div>
      </div>
    </div>
  )
}
