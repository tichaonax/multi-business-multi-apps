'use client'

import { useEffect, useRef, useState } from 'react'

interface PolicyViewerProps {
  content: string | null
  fileId: string | null
  contentType: 'RICH_TEXT' | 'PDF'
  onScrolledToEnd: () => void
  hasScrolledToEnd: boolean
}

export function PolicyViewer({ content, fileId, contentType, onScrolledToEnd, hasScrolledToEnd }: PolicyViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [pdfLoaded, setPdfLoaded] = useState(false)

  useEffect(() => {
    if (hasScrolledToEnd) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onScrolledToEnd()
        }
      },
      {
        root: scrollRef.current,
        threshold: 0.9,
      }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasScrolledToEnd, onScrolledToEnd, pdfLoaded])

  if (contentType === 'PDF' && fileId) {
    return (
      <div ref={scrollRef} className="relative h-full overflow-auto">
        <iframe
          src={`/api/images/${fileId}`}
          className="w-full"
          style={{ minHeight: '600px', height: '100%' }}
          onLoad={() => setPdfLoaded(true)}
          title="Policy document"
        />
        {/* Sentinel at bottom of iframe container */}
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto flex-1 p-6"
      style={{ maxHeight: '60vh' }}
    >
      <div
        className="prose dark:prose-invert max-w-none text-sm"
        dangerouslySetInnerHTML={{ __html: content ?? '<p class="text-gray-400">No content available.</p>' }}
      />
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />
    </div>
  )
}
