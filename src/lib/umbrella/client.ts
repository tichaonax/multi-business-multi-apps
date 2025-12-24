/**
 * Umbrella admin client
 * Fetches umbrella business phone number from admin UI at http://localhost:8080/admin/umbrella-business
 * Uses simple caching to avoid repeated requests. Server-side only.
 */

let cachedPhone: string | null = null
let cacheExpiresAt = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function fetchUmbrellaPhone(): Promise<string | null> {
  // Only run on server
  if (typeof window !== 'undefined') return null

  const now = Date.now()
  if (cachedPhone && cacheExpiresAt > now) return cachedPhone

  try {
    const res = await fetch('http://localhost:8080/admin/umbrella-business')
    const contentType = res.headers.get('content-type') || ''

    if (!res.ok) {
      console.warn('Umbrella client: admin page returned', res.status)
      return null
    }

    let phone: string | null = null

    if (contentType.includes('application/json')) {
      const json = await res.json()
      // Prefer umbrellaBusinessPhone, then common keys
      phone = json.umbrellaBusinessPhone || json.phone || json.phoneNumber || json.contactPhone || null
    } else {
      const text = await res.text()
      // Try to find an input value for phone: id/name/value
      const inputMatch = text.match(/<input[^>]*(?:name|id)=["']?(?:phone|phoneNumber|contactPhone)["']?[^>]*value=["']([^"']+)["']/i)
      if (inputMatch && inputMatch[1]) phone = inputMatch[1].trim()

      // If not found, try label text followed by value
      if (!phone) {
        const labelMatch = text.match(/Phone\s*Number[^>]*>[\s\S]*?<input[^>]*value=["']([^"']+)["']/i)
        if (labelMatch && labelMatch[1]) phone = labelMatch[1].trim()
      }

      // Fallback: search for common phone pattern
      if (!phone) {
        const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{3}\)|\d{3})[\s-]?\d{3}[\s-]?\d{4}/
        const m = text.match(phoneRegex)
        if (m) phone = m[0]
      }
    }

    if (phone) {
      // Basic sanitize: remove null chars and trim
      phone = phone.replace(/\x00/g, '').trim()
      cachedPhone = phone
      cacheExpiresAt = Date.now() + CACHE_TTL
      return phone
    }
  } catch (err) {
    console.warn('Umbrella client error:', err)
  }

  return null
}
