'use client'

/**
 * MBM-351 — Signed-in Users.
 *
 * Who is signed in, on which workstation, since when. A manager or admin can
 * sign out chosen sessions, a user everywhere, or everyone (never themselves),
 * with a message and a countdown shown on those screens; and can suspend an
 * individual user (signed out everywhere at once, can't sign in until lifted).
 */
export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'
import { formatDateTime } from '@/lib/date-format'

interface SessionRow {
  id: string
  user: { id: string; name: string; email: string; role: string }
  businesses: { id: string; name: string; role: string }[]
  loginAt: string
  lastSeenAt: string
  ipAddress: string | null
  deviceLabel: string | null
  hostname: string | null
  endedAt: string | null
  endReason: string | null
  endMessage: string | null
  endedByName: string | null
  isMe: boolean
  isThisSession: boolean
  canManage: boolean
}

interface SuspendedRow {
  id: string
  name: string
  email: string
  role: string
  businesses: { id: string; name: string; role: string }[]
  suspendedAt: string | null
  suspensionReason: string | null
  suspendedByName: string | null
  canManage: boolean
}

type Tab = 'active' | 'suspended' | 'history'

/** What the action dialog is about to do */
type Action =
  | { kind: 'sessions'; sessionIds: string[]; label: string }
  | { kind: 'user'; userId: string; label: string }
  | { kind: 'everyone'; label: string }
  | { kind: 'suspend'; userId: string; label: string }

const DELAYS = [
  { value: 0, label: 'Now' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
]

const END_REASON_LABEL: Record<string, string> = {
  SIGNED_OUT: 'Signed out',
  FORCED: 'Signed out by manager',
  SUSPENDED: 'Suspended',
  EXPIRED: 'Expired (idle)',
}

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  return `${h} h ${m % 60} min ago`
}

function duration(fromIso: string, now: number): string {
  const m = Math.max(0, Math.round((now - new Date(fromIso).getTime()) / 60000))
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

function roleLabel(role: string): string {
  return role.replace(/^business-/, '').replace(/-/g, ' ')
}

export default function SignedInUsersPage() {
  const { data: session } = useSession()
  const sessionId = (session as any)?.sessionId as string | undefined
  const customAlert = useAlert()

  const [tab, setTab] = useState<Tab>('active')
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [suspended, setSuspended] = useState<SuspendedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(Date.now())

  const [action, setAction] = useState<Action | null>(null)
  const [message, setMessage] = useState('')
  const [delay, setDelay] = useState(60)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)
  // "Suspend a user…" — anyone the caller may suspend, signed in or not
  const [suspendable, setSuspendable] = useState<{ id: string; name: string; email: string }[]>([])
  const [suspendPick, setSuspendPick] = useState('')
  useEffect(() => {
    if (tab !== 'suspended') return
    fetch('/api/admin/user-sessions?view=users', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setSuspendable(d?.users ?? []))
      .catch(() => {})
  }, [tab, suspended])

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/admin/user-sessions?view=${tab}`, {
        headers: sessionId ? { 'x-mbm-session-id': sessionId } : {},
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      if (tab === 'suspended') setSuspended(data.users ?? [])
      else setSessions(data.sessions ?? [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [tab, sessionId])

  useEffect(() => { setLoading(true); setSelected(new Set()); load() }, [load])
  // Keep the list current while the page is open
  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); if (tab === 'active') load() }, 20000)
    return () => clearInterval(t)
  }, [tab, load])
  // Countdown labels tick every second
  useEffect(() => {
    if (tab !== 'active') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [tab])

  const q = search.trim().toLowerCase()
  const matches = (name: string, email: string, extra: string[] = []) =>
    !q || [name, email, ...extra].some(v => v?.toLowerCase().includes(q))

  // Active sessions grouped by user
  const groups = useMemo(() => {
    const byUser = new Map<string, { user: SessionRow['user']; businesses: SessionRow['businesses']; canManage: boolean; isMe: boolean; rows: SessionRow[] }>()
    for (const s of sessions) {
      if (!matches(s.user.name, s.user.email, [s.hostname ?? '', s.ipAddress ?? '', ...s.businesses.map(b => b.name)])) continue
      const g = byUser.get(s.user.id) ?? { user: s.user, businesses: s.businesses, canManage: s.canManage, isMe: s.isMe, rows: [] }
      g.rows.push(s)
      byUser.set(s.user.id, g)
    }
    return [...byUser.values()].sort((a, b) => a.user.name.localeCompare(b.user.name))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, q])

  const manageableCount = sessions.filter(s => s.canManage && !s.endedAt).length

  const openAction = (a: Action) => {
    setAction(a)
    setMessage(a.kind === 'everyone' ? 'The system is going down for maintenance. Please save your work.' : '')
    setDelay(a.kind === 'suspend' ? 0 : 60)
    setReason('')
  }

  const runAction = async () => {
    if (!action) return
    if (action.kind === 'suspend' && !reason.trim()) return
    setWorking(true)
    try {
      let res: Response
      if (action.kind === 'suspend') {
        res = await fetch(`/api/admin/users/${action.userId}/suspend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim(), message: message.trim() || null }),
        })
      } else {
        res = await fetch('/api/admin/user-sessions/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(action.kind === 'sessions' ? { sessionIds: action.sessionIds } : {}),
            ...(action.kind === 'user' ? { userIds: [action.userId] } : {}),
            ...(action.kind === 'everyone' ? { everyone: true } : {}),
            message: message.trim() || null,
            delaySeconds: delay,
          }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setAction(null)
      setSelected(new Set())
      await load()
      void customAlert({
        title: action.kind === 'suspend' ? 'User suspended' : 'Sign-out sent',
        description: action.kind === 'suspend'
          ? `Signed out of ${data.signedOut} session(s). They can't sign in until the suspension is lifted.`
          : `${data.signedOut} session(s) will be signed out${delay ? ` in ${DELAYS.find(d => d.value === delay)?.label.toLowerCase()}` : ' now'}.`,
      })
    } catch (e: any) {
      void customAlert({ title: 'Could not complete', description: e.message || 'Failed' })
    } finally {
      setWorking(false)
    }
  }

  const liftSuspension = async (u: SuspendedRow) => {
    setWorking(true)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/suspend`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      await load()
      void customAlert({ title: 'Suspension lifted', description: `${u.name} can sign in again.` })
    } catch (e: any) {
      void customAlert({ title: 'Could not lift suspension', description: e.message || 'Failed' })
    } finally {
      setWorking(false)
    }
  }

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const workstation = (s: SessionRow) => (
    <div>
      <div className="text-sm text-gray-900 dark:text-gray-100">
        {s.hostname || s.ipAddress || '—'}
        {s.isThisSession && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">this screen</span>}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {[s.hostname ? s.ipAddress : null, s.deviceLabel].filter(Boolean).join(' · ')}
      </div>
    </div>
  )

  return (
    <ContentLayout
      title="Signed-in Users"
      breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Signed-in Users', isActive: true }]}
    >
      <div className="space-y-4">
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {([['active', 'Signed in now'], ['suspended', 'Suspended'], ['history', 'History']] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, workstation…"
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          {tab === 'active' && (
            <>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => openAction({ kind: 'sessions', sessionIds: [...selected], label: `${selected.size} selected session(s)` })}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sign out selected ({selected.size})
              </button>
              <button
                type="button"
                disabled={manageableCount === 0}
                onClick={() => openAction({ kind: 'everyone', label: `everyone you manage (${manageableCount} session(s), not you)` })}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sign out everyone
              </button>
            </>
          )}
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">{error}</div>}

        {loading ? (
          <div className="card p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
        ) : tab === 'active' ? (
          groups.length === 0 ? (
            <div className="card p-8 text-center text-gray-500 dark:text-gray-400">No one is signed in{q ? ' matching that search' : ''}.</div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {groups.length} user(s), {groups.reduce((n, g) => n + g.rows.length, 0)} session(s)
              </p>
              {groups.map(g => (
                <div key={g.user.id} className="card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {g.user.name}{g.isMe && <span className="ml-2 text-xs font-normal text-gray-500">(you)</span>}
                        {g.user.role === 'admin' && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">admin</span>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {g.user.email}
                        {g.businesses.length > 0 && <> · {g.businesses.map(b => `${b.name} (${roleLabel(b.role)})`).join(', ')}</>}
                      </div>
                    </div>
                    {g.canManage && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openAction({ kind: 'user', userId: g.user.id, label: `${g.user.name} on every workstation (${g.rows.length})` })}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        >
                          Sign out everywhere
                        </button>
                        {g.user.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => openAction({ kind: 'suspend', userId: g.user.id, label: g.user.name })}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Suspend…
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                        <tr>
                          <th className="w-10 px-4 py-2"></th>
                          <th className="px-4 py-2 text-left">Workstation</th>
                          <th className="px-4 py-2 text-left">Signed in</th>
                          <th className="px-4 py-2 text-left">Last active</th>
                          <th className="px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {g.rows.map(s => {
                          const endsIn = s.endedAt ? Math.max(0, Math.ceil((new Date(s.endedAt).getTime() - now) / 1000)) : null
                          return (
                            <tr key={s.id}>
                              <td className="px-4 py-2">
                                {s.canManage && !s.endedAt && (
                                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label="Select session" />
                                )}
                              </td>
                              <td className="px-4 py-2">{workstation(s)}</td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {formatDateTime(s.loginAt)}
                                <div className="text-xs text-gray-500 dark:text-gray-400">{duration(s.loginAt, now)}</div>
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{ago(s.lastSeenAt, now)}</td>
                              <td className="px-4 py-2">
                                {endsIn !== null ? (
                                  <span className="text-amber-700 dark:text-amber-400 font-medium">Signing out in {endsIn} s</span>
                                ) : (
                                  <span className="text-green-700 dark:text-green-400">Signed in</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'suspended' ? (
          (() => {
            const rows = suspended.filter(u => matches(u.name, u.email))
            const picker = suspendable.length > 0 && (
              <div className="card p-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Suspend a user:</span>
                <select
                  value={suspendPick}
                  onChange={e => setSuspendPick(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Choose…</option>
                  {suspendable.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
                <button
                  type="button"
                  disabled={!suspendPick}
                  onClick={() => {
                    const u = suspendable.find(x => x.id === suspendPick)
                    if (u) openAction({ kind: 'suspend', userId: u.id, label: u.name })
                    setSuspendPick('')
                  }}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
                >
                  Suspend…
                </button>
              </div>
            )
            return rows.length === 0 ? (
              <div className="space-y-3">
                {picker}
                <div className="card p-8 text-center text-gray-500 dark:text-gray-400">No suspended users.</div>
              </div>
            ) : (
              <div className="space-y-3">
              {picker}
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="px-4 py-2 text-left">User</th>
                      <th className="px-4 py-2 text-left">Suspended</th>
                      <th className="px-4 py-2 text-left">By</th>
                      <th className="px-4 py-2 text-left">Reason</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map(u => (
                      <tr key={u.id}>
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{u.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{u.suspendedAt ? formatDateTime(u.suspendedAt) : '—'}</td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{u.suspendedByName || '—'}</td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{u.suspensionReason || '—'}</td>
                        <td className="px-4 py-2 text-right">
                          {u.canManage && (
                            <button
                              type="button"
                              disabled={working}
                              onClick={() => liftSuspension(u)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                            >
                              Lift suspension
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )
          })()
        ) : (
          (() => {
            const rows = sessions.filter(s => matches(s.user.name, s.user.email, [s.hostname ?? '', s.ipAddress ?? '']))
            return rows.length === 0 ? (
              <div className="card p-8 text-center text-gray-500 dark:text-gray-400">No history yet.</div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="px-4 py-2 text-left">User</th>
                      <th className="px-4 py-2 text-left">Workstation</th>
                      <th className="px-4 py-2 text-left">Signed in</th>
                      <th className="px-4 py-2 text-left">Ended</th>
                      <th className="px-4 py-2 text-left">How</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map(s => (
                      <tr key={s.id}>
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{s.user.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{s.user.email}</div>
                        </td>
                        <td className="px-4 py-2">{workstation(s)}</td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(s.loginAt)}</td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{s.endedAt ? formatDateTime(s.endedAt) : '—'}</td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                          {END_REASON_LABEL[s.endReason ?? ''] ?? s.endReason ?? '—'}
                          {s.endedByName && <span className="text-gray-500 dark:text-gray-400"> by {s.endedByName}</span>}
                          {s.endMessage && <div className="text-xs italic text-gray-500 dark:text-gray-400">&ldquo;{s.endMessage}&rdquo;</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()
        )}
      </div>

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {action.kind === 'suspend' ? `Suspend ${action.label}` : `Sign out ${action.label}`}
            </h2>
            {action.kind === 'suspend' && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  They are signed out of every workstation now and can&apos;t sign in until the suspension is lifted (Suspended tab).
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (kept on record) *</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    maxLength={500}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message shown on their screen</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. Signing out for system maintenance — back at 14:00"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            {action.kind !== 'suspend' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sign out</label>
                <select
                  value={delay}
                  onChange={e => setDelay(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  {DELAYS.map(d => <option key={d.value} value={d.value}>{d.value === 0 ? 'Now' : `After ${d.label} (countdown on their screen)`}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAction(null)}
                disabled={working}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runAction}
                disabled={working || (action.kind === 'suspend' && !reason.trim())}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 ${action.kind === 'suspend' || action.kind === 'everyone' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {working ? 'Working…' : action.kind === 'suspend' ? 'Suspend and sign out' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
