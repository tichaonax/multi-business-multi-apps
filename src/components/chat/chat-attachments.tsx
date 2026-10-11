'use client'

import { useState, useRef } from 'react'

// Shared chat-attachment pieces (upload helper + composer chips + sent-
// message bubbles + drag-and-drop) — used by both chat-window.tsx (DM/group
// satellite windows) and floating-chat.tsx (Team/General) so the upload
// flow and the rendered attachments look identical everywhere a message can
// carry one.

export interface ChatAttachmentMeta {
  id: string
  fileName: string
  mimeType: string
  size: number
}

export const DOCUMENT_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
export const AUDIO_ATTACHMENT_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm']
export const VIDEO_ATTACHMENT_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
export const ALLOWED_ATTACHMENT_TYPES = [...DOCUMENT_ATTACHMENT_TYPES, ...AUDIO_ATTACHMENT_TYPES, ...VIDEO_ATTACHMENT_TYPES]

// Mirrors the server-side per-type limits in POST /api/chat/attachments —
// video capped well below documents/images to keep "short videos" short and
// the attachments table's storage bounded.
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB — PDF/image
export const MAX_AUDIO_ATTACHMENT_SIZE = 15 * 1024 * 1024 // 15MB
export const MAX_VIDEO_ATTACHMENT_SIZE = 25 * 1024 * 1024 // 25MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 10 // matches POST /api/chat/messages

function maxSizeForType(mimeType: string): number {
  if (AUDIO_ATTACHMENT_TYPES.includes(mimeType)) return MAX_AUDIO_ATTACHMENT_SIZE
  if (VIDEO_ATTACHMENT_TYPES.includes(mimeType)) return MAX_VIDEO_ATTACHMENT_SIZE
  return MAX_ATTACHMENT_SIZE
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Uploads one file and returns its pending attachment metadata (messageId
 * unset server-side until the message is actually sent — see
 * POST /api/chat/messages's attachmentIds handling). Throws with a
 * user-facing message on validation or network failure. Call once per file
 * for a multi-file pick/drop — there's no batch endpoint, each upload is
 * independent so one bad file doesn't block the rest. */
export async function uploadChatAttachment(file: File): Promise<ChatAttachmentMeta> {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error(`"${file.name}" — only PDF, image, audio, or video files are allowed`)
  }
  const maxSize = maxSizeForType(file.type)
  if (file.size > maxSize) {
    throw new Error(`"${file.name}" — file size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`)
  }
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/chat/attachments', { method: 'POST', credentials: 'include', body: formData })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || `"${file.name}" — upload failed`)
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
const AudioIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-2v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const VideoIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

/** One chip per pending file, shown in the composer between picking/dropping
 * and actually sending — each is individually removable before send. */
export function PendingAttachmentsRow({
  attachments, uploadingNames, onRemove,
}: {
  attachments: ChatAttachmentMeta[]
  uploadingNames: string[]
  onRemove: (id: string) => void
}) {
  if (attachments.length === 0 && uploadingNames.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {attachments.map(att => {
        const isImage = att.mimeType.startsWith('image/')
        const isAudio = att.mimeType.startsWith('audio/')
        const isVideo = att.mimeType.startsWith('video/')
        return (
          <div key={att.id} className="flex items-center gap-1.5 text-[11px] bg-gray-100 dark:bg-gray-700 border border-border rounded-lg px-2 py-1 max-w-[180px]">
            {isImage ? (
              <img src={attachmentUrl(att.id)} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
            ) : isAudio ? (
              <AudioIcon className="w-4 h-4 text-indigo-500 shrink-0" />
            ) : isVideo ? (
              <VideoIcon className="w-4 h-4 text-purple-500 shrink-0" />
            ) : (
              <FileIcon className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span className="flex-1 min-w-0 truncate text-primary">{att.fileName}</span>
            <button type="button" onClick={() => onRemove(att.id)} className="shrink-0 text-secondary hover:text-red-500" title="Remove attachment">✕</button>
          </div>
        )
      })}
      {uploadingNames.map(name => (
        <div key={name} className="flex items-center gap-1.5 text-[11px] bg-gray-100 dark:bg-gray-700 border border-border rounded-lg px-2 py-1 max-w-[180px] opacity-70">
          <span className="w-3 h-3 border-2 border-secondary border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="truncate text-secondary">{name}</span>
        </div>
      ))}
    </div>
  )
}

/** One sent image — click opens the full-size original in a new tab (the
 * main interaction). Download is a small, optional icon alongside it, not
 * the primary action — unlike a PDF, an image is already fully usable
 * in-browser. */
function ImageAttachment({ attachment }: { attachment: ChatAttachmentMeta }) {
  return (
    <div className="max-w-[160px]">
      <a href={attachmentUrl(attachment.id)} target="_blank" rel="noopener noreferrer">
        <img src={attachmentUrl(attachment.id)} alt={attachment.fileName} className="rounded-lg max-h-40 w-auto object-contain border border-border" />
      </a>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[9px] text-secondary truncate flex-1">{attachment.fileName}</span>
        <a href={attachmentUrl(attachment.id, true)} className="text-secondary hover:text-indigo-500 shrink-0" title="Download (optional)">
          <DownloadIcon className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

/** One sent PDF — Download is a clear, labelled button here (not just an
 * icon): a PDF is the kind of file people actually want to open in their
 * own reader outside the chat window, so that action needs to be obvious,
 * not buried. */
function PdfAttachment({ attachment }: { attachment: ChatAttachmentMeta }) {
  return (
    <div className="flex items-center gap-2 bg-white/70 dark:bg-black/20 border border-border rounded-lg px-2.5 py-1.5 max-w-[240px]">
      <FileIcon className="w-5 h-5 text-red-500 shrink-0" />
      <span className="flex-1 min-w-0 truncate text-[11px] text-primary">{attachment.fileName}</span>
      <a href={attachmentUrl(attachment.id)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
        View
      </a>
      <a
        href={attachmentUrl(attachment.id, true)}
        className="shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        title="Download"
      >
        <DownloadIcon className="w-3.5 h-3.5" />
        Download
      </a>
    </div>
  )
}

/** One sent audio clip — inline native player, download optional (same
 * rationale as images: already fully usable in-browser). */
function AudioAttachment({ attachment }: { attachment: ChatAttachmentMeta }) {
  return (
    <div className="flex items-center gap-2 bg-white/70 dark:bg-black/20 border border-border rounded-lg px-2.5 py-1.5 max-w-[260px]">
      <AudioIcon className="w-4 h-4 text-indigo-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <audio controls src={attachmentUrl(attachment.id)} className="w-full h-8" style={{ maxWidth: 200 }} />
        <span className="text-[9px] text-secondary truncate block">{attachment.fileName}</span>
      </div>
      <a href={attachmentUrl(attachment.id, true)} className="shrink-0 text-secondary hover:text-indigo-500" title="Download">
        <DownloadIcon className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}

/** One sent short video — inline native player, same max-height treatment
 * as an image so a vertical phone-recorded clip doesn't dominate the
 * thread. Download optional, same as image/audio. */
function VideoAttachment({ attachment }: { attachment: ChatAttachmentMeta }) {
  return (
    <div className="max-w-[220px]">
      <video controls src={attachmentUrl(attachment.id)} className="rounded-lg max-h-48 w-full object-contain border border-border bg-black" />
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[9px] text-secondary truncate flex-1">{attachment.fileName}</span>
        <a href={attachmentUrl(attachment.id, true)} className="text-secondary hover:text-indigo-500 shrink-0" title="Download (optional)">
          <DownloadIcon className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

/** Renders every attachment on an already-sent message — images and videos
 * lay out in a small wrapping grid (so several don't each take a full row),
 * PDFs and audio clips stack below as their own labelled cards. Same for the
 * sender's own echoed message and every other recipient's — it's just what
 * the message actually carries, not something rendered differently per
 * viewer. */
export function ChatAttachmentsGroup({ attachments }: { attachments: ChatAttachmentMeta[] }) {
  if (!attachments || attachments.length === 0) return null
  const images = attachments.filter(a => a.mimeType.startsWith('image/'))
  const videos = attachments.filter(a => a.mimeType.startsWith('video/'))
  const audios = attachments.filter(a => a.mimeType.startsWith('audio/'))
  const pdfs = attachments.filter(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('video/') && !a.mimeType.startsWith('audio/'))
  return (
    <div className="mt-1 space-y-1">
      {(images.length > 0 || videos.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {images.map(att => <ImageAttachment key={att.id} attachment={att} />)}
          {videos.map(att => <VideoAttachment key={att.id} attachment={att} />)}
        </div>
      )}
      {audios.length > 0 && (
        <div className="flex flex-col gap-1">
          {audios.map(att => <AudioAttachment key={att.id} attachment={att} />)}
        </div>
      )}
      {pdfs.length > 0 && (
        <div className="flex flex-col gap-1">
          {pdfs.map(att => <PdfAttachment key={att.id} attachment={att} />)}
        </div>
      )}
    </div>
  )
}

const PaperclipIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
)

/** The attach (paperclip) button next to the composer textarea — a plain
 * multi-file input hidden behind a styled button, same convention as every
 * other file picker in this codebase (DocumentUpload etc). */
export function AttachButton({ onFilesSelected, disabled }: { onFilesSelected: (files: File[]) => void; disabled?: boolean }) {
  return (
    <label
      className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : 'text-secondary hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
      title="Attach PDFs, images, audio, or short video"
    >
      <PaperclipIcon className="w-4 h-4" />
      <input
        type="file"
        multiple
        accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
        disabled={disabled}
        className="hidden"
        onChange={e => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = '' // allow picking the same file(s) again later
          if (files.length > 0) onFilesSelected(files)
        }}
      />
    </label>
  )
}

/** Drag-and-drop state + handlers for a chat window's drop zone. Spread
 * `dropZoneProps` onto whichever container should accept a drop (the whole
 * window), and render the overlay (below) as a sibling positioned over it
 * while `isDraggingFiles` is true. Only reacts to an actual file drag (not
 * e.g. dragging selected message text), checked via dataTransfer.types. */
export function useChatFileDrop(onFilesDropped: (files: File[]) => void) {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  // A plain closure variable would reset to 0 on every re-render (each
  // setIsDraggingFiles call triggers one) — needs to survive across renders
  // to correctly count nested dragenter/dragleave events as the pointer
  // crosses child element boundaries inside the drop zone.
  const dragDepthRef = useRef(0)

  const dropZoneProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      dragDepthRef.current++
      setIsDraggingFiles(true)
    },
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDraggingFiles(false)
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      dragDepthRef.current = 0
      setIsDraggingFiles(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) onFilesDropped(files)
    },
  }

  return { isDraggingFiles, dropZoneProps }
}

/** Full-window overlay shown while a file is being dragged over the chat
 * window — the drop target itself is the whole window (see
 * useChatFileDrop), this is just the visual affordance. */
export function DropOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-600/90 rounded-2xl pointer-events-none">
      <div className="text-center text-white">
        <PaperclipIcon className="w-8 h-8 mx-auto mb-1" />
        <p className="text-sm font-semibold">Drop to attach</p>
        <p className="text-[11px] opacity-80">PDF, image, audio, or short video</p>
      </div>
    </div>
  )
}
