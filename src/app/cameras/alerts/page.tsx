'use client'

// MBM-340 — camera alert History (alert list guide §3.7): the last 30 days and
// everything kept for later. New / All / Seen / Dismissed, the same filters
// as the 📹 panel, pages of 50, larger pictures; Mark seen and Dismiss per row
// (Undismiss on a dismissed one). ▶ Play and Watch work as in the panel.
import { useCallback, useEffect, useState } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { FarmAlert, useFarmAlerts } from '@/components/farm-cameras/farm-alerts-provider'
import { alertButtonClass as btn, FarmAlertRow } from '@/components/farm-cameras/farm-alert-row'
import { FarmAlertActions, useAlertPlayer } from '@/components/farm-cameras/farm-alert-play'
import { AlertFilterBar, useAlertFilters } from '@/components/farm-cameras/farm-alert-filters'
import { alertAction } from '@/components/farm-cameras/farm-alert-panel'

type State = 'new' | 'all' | 'seen' | 'dismissed'
const PAGE = 50

interface Answer {
  alerts: FarmAlert[]
  total: number
  page: number
  counts: { new: number; later: number; paused: number; newMatching?: number | null }
  sites: { id: string; name: string; newCount: number }[]
  timeNote?: string | null
}

export default function CameraAlertHistoryPage() {
  const toast = useToastContext()
  const alerts = useFarmAlerts()
  const fl = useAlertFilters()
  const player = useAlertPlayer()
  const [state, setState] = useState<State>('all')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Answer | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ view: 'history', state, page: String(page), ...fl.params })
      const r = await fetch(`/api/farm-control/alerts?${params}`, { cache: 'no-store' })
      const d = await r.json()
      if (!d.success) throw new Error(d.error || 'Could not load')
      setData(d.data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load camera alerts')
    } finally {
      setLoading(false)
    }
  }, [state, page, fl.params]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [state, fl.params])
  useEffect(() => { player.stop() }, [state, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (a: FarmAlert, action: 'seen' | 'dismiss' | 'undismiss' | 'later' | 'unlater') => {
    if (player.playingId === a.id && action === 'dismiss') player.stop()
    try { await alertAction(action, { ids: [a.id] }); load() } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save') }
  }

  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const stateBtn = (s: State, label: string) => (
    <button key={s} onClick={() => setState(s)} className={`px-3 py-1 rounded-full text-sm ${state === s ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{label}</button>
  )

  return (
    <ContentLayout title="Camera Alert History" description="Your camera alerts from the last 30 days, and the ones you kept for later">
      <div className="max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {stateBtn('new', 'New')}{stateBtn('all', 'All')}{stateBtn('seen', 'Seen')}{stateBtn('dismissed', 'Dismissed')}
          <button className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline" onClick={() => alerts?.openAlerts()}>📹 Open the alert list</button>
        </div>
        <div className="card p-3">
          <AlertFilterBar f={fl} sites={data?.sites || []} newCount={data?.counts.new ?? 0} newMatching={data?.counts.newMatching} timeNote={data?.timeNote} />
        </div>

        <p className="text-sm text-secondary">
          {loading && !data ? 'Loading…' : `${total} alert${total === 1 ? '' : 's'}`}
        </p>

        <div className="space-y-2">
          {data && data.alerts.length === 0 && !loading && <p className="text-sm text-secondary">No alerts match.</p>}
          {data?.alerts.map(a => (
            <FarmAlertRow
              key={a.id}
              alert={a}
              big
              inPlayer={alerts?.viewer?.alert.id === a.id}
              player={player.playingId === a.id ? player.render(a) : undefined}
              actions={
                <>
                  <FarmAlertActions alert={a} player={player} onLater={() => act(a, a.laterAt ? 'unlater' : 'later')} />
                  {!a.seenAt && !a.dismissedAt && <button className={btn} onClick={() => act(a, 'seen')}>Mark seen</button>}
                  {a.dismissedAt
                    ? <button className={btn} onClick={() => act(a, 'undismiss')}>Undismiss</button>
                    : <button className={btn} onClick={() => act(a, 'dismiss')}>Dismiss</button>}
                </>
              }
            />
          ))}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <button className={btn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Newer</button>
            <span className="text-secondary">Page {page + 1} of {pages}</span>
            <button className={btn} disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Older ›</button>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
