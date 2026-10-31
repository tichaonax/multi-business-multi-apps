'use client'

// MBM-331 — the "Farm Cameras" permissions block in User Management (edit
// user, business permissions, new user). It shows the person's Farm Control
// id and link, lets a camera admin create (or remove) the id, and only allows
// ticking the camera permissions once Farm Control has the id linked.
// Unticking is always allowed.
import { useCallback, useEffect, useState } from 'react'
import { useToastContext } from '@/components/ui/toast'

interface LinkInfo {
  id: string
  name: string
  email: string
  canEdit: boolean
  link: { status: string; farmControlName: string | null; requestedAt: string | null; lastSessionAt: string | null; lastRefusedAt: string | null }
}

const CHANGED = 'farm-control-link-changed'

interface Props {
  /** The user being edited; none while creating a new user */
  userId?: string
  permissions: { key: string; label: string }[]
  values: Record<string, unknown>
  onToggle: (key: string, value: boolean) => void
  title?: string
}

export function FarmCameraPermissionGroup({ userId, permissions, values, onToggle, title = 'Farm Cameras' }: Props) {
  const toast = useToastContext()
  const [info, setInfo] = useState<LinkInfo | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const r = await fetch(`/api/admin/farm-control/users?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(r.status === 403 ? 'forbidden' : d.error || 'Could not load the Farm Control link'); return }
      setInfo(d.data)
      setError('')
    } catch {
      setError('Could not load the Farm Control link')
    }
  }, [userId])

  // Several blocks for the same user (one per business) stay in step
  useEffect(() => {
    load()
    const on = (e: Event) => { if ((e as CustomEvent).detail === userId) load() }
    window.addEventListener(CHANGED, on)
    return () => window.removeEventListener(CHANGED, on)
  }, [load, userId])

  const setId = async (status: 'REQUESTED' | 'NOT_REQUESTED') => {
    if (!userId) return
    if (status === 'NOT_REQUESTED' && !confirm('Remove this Farm Control id? The person loses all farm cameras at once, and FarmNet must link them again after a new id is created.')) return
    setBusy(true)
    try {
      const r = await fetch('/api/admin/farm-control/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not save')
      toast.push(status === 'REQUESTED' ? 'Farm Control id created. Copy it and send it to FarmNet to link' : 'Farm Control id removed', { type: 'success' })
      window.dispatchEvent(new CustomEvent(CHANGED, { detail: userId }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!info) return
    const text = `MBM user: ${info.name} <${info.email}>\nFarm Control id (sub): ${info.id}`
    try {
      await navigator.clipboard.writeText(text)
      toast.push('Copied. Send it to FarmNet to link this person in Farm Control', { type: 'success' })
    } catch {
      toast.error('Could not copy. Select the id and copy it instead')
    }
  }

  const status = info?.link.status || 'NOT_REQUESTED'
  const linked = status === 'LINKED'
  const when = (d: string | null) => (d ? new Date(d).toLocaleString() : '')

  let panel: React.ReactNode
  if (!userId) {
    panel = <p>Save the user first, then create their Farm Control id under Edit user (or Admin → Farm Cameras → Users).</p>
  } else if (error === 'forbidden') {
    panel = <p>Farm Control ids are managed by a camera admin (Admin → Farm Cameras → Users).</p>
  } else if (error) {
    panel = <p className="text-red-600 dark:text-red-400">{error}</p>
  } else if (!info) {
    panel = <p>Loading the Farm Control link…</p>
  } else if (status === 'NOT_REQUESTED') {
    panel = (
      <div className="flex flex-wrap items-center gap-3">
        <span>No Farm Control id yet. Create one, then send it to FarmNet to link this person in Farm Control.</span>
        {info.canEdit
          ? <button type="button" disabled={busy} onClick={() => setId('REQUESTED')} className="btn-primary text-xs">{busy ? 'Creating…' : 'Create Farm Control id'}</button>
          : <span className="italic">Ask a camera admin to create it.</span>}
      </div>
    )
  } else {
    panel = (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span>Farm Control id:</span>
          <code className="font-mono text-gray-900 dark:text-white select-all">{info.id}</code>
          <button type="button" onClick={copy} className="text-blue-600 dark:text-blue-400 hover:underline">Copy for FarmNet</button>
          {info.canEdit && <button type="button" disabled={busy} onClick={() => setId('NOT_REQUESTED')} className="text-red-600 dark:text-red-400 hover:underline ml-auto">Remove id</button>}
        </div>
        {linked && (
          <p className="text-green-700 dark:text-green-400">
            ✓ Linked in Farm Control{info.link.farmControlName ? ` as "${info.link.farmControlName}"` : ''}{info.link.lastSessionAt ? ` · last signed in ${when(info.link.lastSessionAt)}` : ''}
          </p>
        )}
        {status === 'REQUESTED' && (
          <p className="text-amber-700 dark:text-amber-300">
            Waiting for FarmNet to link this id in Farm Control. It shows as linked after this person&apos;s next sign-in to MBM.
          </p>
        )}
        {status === 'REFUSED' && (
          <p className="text-red-600 dark:text-red-400">
            Farm Control refused this id{info.link.lastRefusedAt ? ` (${when(info.link.lastRefusedAt)})` : ''}: send it to FarmNet to link. It shows as linked after the next sign-in to MBM.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{title}</h4>
      <div className="text-xs text-gray-600 dark:text-gray-300 mb-3 rounded bg-gray-50 dark:bg-gray-800 p-2">{panel}</div>
      <div className="grid grid-cols-2 gap-2">
        {permissions.map(p => {
          const checked = !!values[p.key]
          const locked = !linked && !checked
          return (
            <label key={p.key} className={`flex items-center space-x-2 ${locked ? 'opacity-50' : ''}`} title={locked ? 'Available once the Farm Control link is active' : ''}>
              <input
                type="checkbox"
                checked={checked}
                disabled={locked}
                onChange={e => onToggle(p.key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{p.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
