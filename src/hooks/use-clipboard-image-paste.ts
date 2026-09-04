import { useEffect, type ClipboardEvent as ReactClipboardEvent } from 'react'

/**
 * Pulls the first image out of a paste event's clipboard data, if any (MBM-292).
 * Shared by both the document-level hook below and any call site that needs to
 * scope pasting to one specific focused element instead (e.g. a list with many
 * independent per-row upload targets, where a page-wide listener can't tell
 * which row the user meant).
 */
export function getImageFileFromClipboardEvent(e: ClipboardEvent | ReactClipboardEvent): File | null {
  const items = e.clipboardData?.items
  if (!items) return null
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      return item.getAsFile()
    }
  }
  return null
}

/**
 * Lets a paste (Ctrl+V) of an image already on the clipboard feed straight into
 * the same `handleFile(file: File)` a manual file-picker upload already calls —
 * skips the download-then-browse-to-file round trip for images grabbed off the
 * web. Purely additive: does nothing when the clipboard holds no image, so
 * normal text paste elsewhere on the page is never affected.
 *
 * Scope `enabled` to only while there's a single, unambiguous upload target on
 * screen (a dialog is open, one item is selected/being edited) — this listens
 * on `document`, so it isn't a fit for a page with many independent per-row
 * upload buttons and no single "active" item; use `getImageFileFromClipboardEvent`
 * with a per-row `onPaste` there instead.
 */
export function useClipboardImagePaste(onImage: (file: File) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    function handlePaste(e: ClipboardEvent) {
      const file = getImageFileFromClipboardEvent(e)
      if (file) {
        e.preventDefault()
        onImage(file)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [onImage, enabled])
}
