'use client'

import { useRef, useState } from 'react'
import { Paperclip, Eye, Download, X, Upload } from 'lucide-react'

interface DocumentUploadProps {
  label: string
  currentUrl?: string | null
  currentName?: string | null
  onUpload: (file: File) => Promise<void>
  onRemove?: () => Promise<void>
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
}

const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg'
const DEFAULT_MAX_MB = 10

export function DocumentUpload({
  label,
  currentUrl,
  currentName,
  onUpload,
  onRemove,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = DEFAULT_MAX_MB,
  disabled = false
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPG, and JPEG files are allowed')
      e.target.value = ''
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`)
      e.target.value = ''
      return
    }

    setError(null)
    setUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemove = async () => {
    if (!onRemove) return
    setUploading(true)
    try {
      await onRemove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setUploading(false)
    }
  }

  const displayName = currentName || (currentUrl ? currentUrl.split('/').pop() : null)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-secondary">{label}</label>

      {currentUrl ? (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-surface-secondary">
          <Paperclip className="w-4 h-4 text-muted flex-shrink-0" />
          <span className="text-sm text-primary truncate flex-1" title={displayName ?? undefined}>
            {displayName || 'Document'}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-surface-hover text-muted hover:text-primary transition-colors"
              title="View document"
            >
              <Eye className="w-4 h-4" />
            </a>
            <a
              href={currentUrl}
              download={displayName || 'document'}
              className="p-1 rounded hover:bg-surface-hover text-muted hover:text-primary transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            {onRemove && !disabled && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="p-1 rounded hover:bg-red-100 text-muted hover:text-red-600 transition-colors"
                title="Remove document"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`flex items-center gap-2 p-2 rounded-lg border border-dashed border-border text-sm text-muted ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:text-primary transition-colors'
          }`}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <Upload className="w-4 h-4" />
          <span>{uploading ? 'Uploading...' : 'Click to upload PDF, JPG or JPEG'}</span>
        </div>
      )}

      {!currentUrl && !disabled && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {currentUrl && !disabled && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-muted hover:text-primary underline transition-colors"
          >
            Replace document
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
