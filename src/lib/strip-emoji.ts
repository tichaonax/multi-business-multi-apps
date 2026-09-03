/**
 * Removes emoji/pictograph characters from a string and collapses any
 * whitespace left behind. Staff often prefix product names with emoji for
 * their own internal lists (e.g. rice/chicken emoji + "Rice &1pc Road
 * Runner"), but on space-constrained display surfaces those glyphs eat into
 * the name's available width before any real text shows -- this strips
 * them for display only, without touching the underlying product name.
 */
const EMOJI_PATTERN = /[\p{Extended_Pictographic}‍️\u{1F3FB}\u{1F3FC}\u{1F3FD}\u{1F3FE}\u{1F3FF}]/gu

export function stripEmoji(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(EMOJI_PATTERN, '').replace(/\s+/g, ' ').trim()
}
