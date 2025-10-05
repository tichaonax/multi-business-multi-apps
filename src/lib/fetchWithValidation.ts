export async function fetchWithValidation(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init)
  let body: any = null
  try {
    body = await res.json()
  } catch (e) {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const msg = body?.error || body?.message || 'An error occurred'
    const err = new Error(msg)
    ;(err as any).status = res.status
    ;(err as any).body = body
    throw err
  }

  return body
}

export default fetchWithValidation
