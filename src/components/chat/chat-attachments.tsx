'use client'

// Shared chat-attachment pieces (upload helper + composer chip + sent-message
// bubble) — used by both chat-window.tsx (DM/group satellite windows) and
// floating-chat.tsx (Team/General) so the upload flow and the rendered
// attachment look identical everywhere a message can carry one.

export interface ChatAttachmentMeta {
  id: string
  fileName: string
  mimeType: string
  size: number
}

export const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB — matches the server-side limit

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Uploads a file and returns its pending attachment metadata (messageId
 * unset server-side until the message is actually sent — see
 * POST /api/chat/messages's attachmentId handling). Throws with a
 * user-facing message on validation or network failure. */
export async function uploadChatAttachment(file: File): Promise<ChatAttachmentMeta> {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error('Only PDF, JPEG, and PNG files are allowed')
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error('File size must be less than 10MB')
  }
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/chat/attachments', { method: 'POST', credentials: 'include', body: formData })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || 'Upload failed')
  return json.attachment as ChatAttachmentMeta
}

function attachmentUrl(id: string, download = false): string {
  return `/api/chat/attachments/${id}${download ? '?download=1' : ''}`
}

const FileIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
  </svg>
)

/** The chip shown in the composer between picking a file and actually
 * sending — lets the user confirm/remove it before it becomes part of a
 * real message. */
export function PendingAttachmentChip({ attachment, uploading, onRemove }: { attachment: ChatAttachmentMeta | null; uploading: boolean; onRemove: () => void }) {
  if (!uploading && !attachment) return null
  const isImage = attachment?.mimeType.startsWith('image/')
  return (
    <div className="flex items-center gap-2 text-[11px] bg-gray-100 dark:bg-gray-700 border border-border rounded-lg px-2.5 py-1.5">
      {uploading ? (
        <span className="text-secondary">Uploading…</span>
      ) : attachment ? (
        <>
          {isImage ? (
            <img src={attachmentUrl(attachment.id)} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
          ) : (
            <FileIcon className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span className="flex-1 min-w-0 truncate text-primary">{attachment.fileName}</span>
          <span className="text-secondary shrink-0">{formatFileSize(attachment.size)}</span>
          <button type="button" onClick={onRemove} className="shrink-0 text-secondary hover:text-red-500" title="Remove attachment">✕</button>
        </>
      ) : null}
    </div>
  )
}

/** Renders an attachment inside an already-sent message bubble — an image
 * shows inline (click to open full-size), a PDF shows as a file card.
 * Both get an explicit download link alongside the "view" click. */
export function ChatAttachmentBubble({ attachment }: { attachment: ChatAttachmentMeta }) {
  const isImage = attachment.mimeType.startsWith('image/')
  if (isImage) {
    return (
      <div className="mt-1 max-w-[220px]">
        <a href={attachmentUrl(attachment.id)} target="_blank" rel="noopener noreferrer">
          <img src={attachmentUrl(attachment.id)} alt={attachment.fileName} className="rounded-lg max-h-48 w-auto object-contain border border-border" />
        </a>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-secondary truncate flex-1">{attachment.fileName}</span>
          <a href={attachmentUrl(attachment.id, true)} className="text-secondary hover:text-indigo-500" title="Download">
            <DownloadIcon className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }
  return (
    <a
      href={attachmentUrl(attachment.id)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex items-center gap-2 bg-white/70 dark:bg-black/20 border border-border rounded-lg px-2.5 py-1.5 max-w-[220px] hover:bg-white dark:hover:bg-black/30 transition-colors"
    >
      <FileIcon className="w-5 h-5 text-red-500 shrink-0" />
      <span className="flex-1 min-w-0 truncate text-[11px] text-primary">{attachment.fileName}</span>
      <a
        href={attachmentUrl(attachment.id, true)}
        onClick={e => e.stopPropagation()}
        className="shrink-0 text-secondary hover:text-indigo-500"
        title="Download"
      >
        <DownloadIcon className="w-3.5 h-3.5" />
      </a>
    </a>
  )
}

const PaperclipIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
)

/** The attach (paperclip) button next to the composer textarea — a plain
 * file input hidden behind a styled button, same convention as every other
 * file picker in this codebase (DocumentUpload etc). */
export function AttachButton({ onFileSelected, disabled }: { onFileSelected: (file: File) => void; disabled?: boolean }) {
  return (
    <label
      className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : 'text-secondary hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
      title="Attach a PDF or image"
    >
      <PaperclipIcon className="w-4 h-4" />
      <input
        type="file"
        accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
        disabled={disabled}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = '' // allow picking the same file again later
          if (file) onFileSelected(file)
        }}
      />
    </label>
  )
}
