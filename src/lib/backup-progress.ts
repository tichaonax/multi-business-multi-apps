import fs from 'fs'
import path from 'path'
import os from 'os'

const _progressDir = path.join(os.tmpdir(), 'mbma-backup-progress')
try {
  if (!fs.existsSync(_progressDir)) {
    fs.mkdirSync(_progressDir)
  }
} catch (e) {
  // ignore
}
export type ProgressEntry = {
  model?: string;
  recordId?: number | string | null;
  processed?: number;
  skipped?: number;
  total?: number;
  startedAt?: string;
  updatedAt?: string;
  counts?: Record<string, { processed?: number; total?: number }>
  errors?: string[]
  // Track the highest processed value to prevent backward progress
  _maxProcessed?: number;
}

const _progress = new Map<string, ProgressEntry>()
const _cleanupTimers = new Map<string, NodeJS.Timeout>()

export function createProgressId() {
  const id = Math.random().toString(36).slice(2, 10)
  const startedAt = new Date().toISOString()
  const entry = { processed: 0, total: 0, startedAt, updatedAt: startedAt, counts: {}, errors: [] }
  _progress.set(id, entry)
  try {
    const filePath = path.join(_progressDir, `progress-${id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(entry), { encoding: 'utf-8' })
  } catch (e) {
    console.warn('[backup-progress] createProgressId file write failed', e)
  }
  console.log(`[backup-progress] createProgressId: id=${id}, pid=${process.pid}, startedAt=${startedAt}`)
  return id
}

export function updateProgress(id: string, entry: Partial<ProgressEntry>) {
  const cur = _progress.get(id) ?? { processed: 0, total: 0, startedAt: new Date().toISOString() }
  const merged: ProgressEntry = { ...cur, ...entry, updatedAt: new Date().toISOString() }
  // update counts map if model, processed or total are present
  try {
    merged.counts = merged.counts ?? {}
    // Accept either `entry.model` or `entry.counts` as update signals
    if (entry.counts && typeof entry.counts === 'object') {
      for (const [k, v] of Object.entries(entry.counts)) {
        merged.counts[k] = merged.counts[k] ?? {}
        if (typeof v.processed === 'number') merged.counts[k].processed = v.processed
        if (typeof v.total === 'number') merged.counts[k].total = v.total
      }
    } else if (entry.model) {
      merged.counts[entry.model] = merged.counts[entry.model] ?? {}
      if (typeof entry.processed === 'number') merged.counts[entry.model].processed = entry.processed
      if (typeof entry.total === 'number') merged.counts[entry.model].total = entry.total
    }

    // Aggregate total processed from all model counts for top-level progress
    let aggregatedProcessed = 0
    for (const countEntry of Object.values(merged.counts)) {
      aggregatedProcessed += (countEntry as any).processed ?? 0
    }

    // Track max processed to ensure progress only moves forward (never backward)
    const currentMax = merged._maxProcessed ?? 0

    // Only update top-level processed if not explicitly set by caller
    if (typeof entry.processed !== 'number' || entry.model !== 'completed') {
      // Ensure progress only increases - use max of current and aggregated
      const newProcessed = Math.max(currentMax, aggregatedProcessed)
      merged.processed = newProcessed
      merged._maxProcessed = newProcessed
    } else {
      // For completion, include skipped records in progress to reach 100%
      const skipped = (entry as any).skipped ?? 0
      const finalProcessed = (entry.processed ?? 0) + skipped
      merged.processed = Math.max(currentMax, finalProcessed)
      merged._maxProcessed = merged.processed
    }
  } catch (e) {
    console.warn('[backup-progress] updateProgress counts update failed', e)
  }
  // update errors array
  try {
    merged.errors = Array.isArray(merged.errors) ? merged.errors : []
    if (Array.isArray(entry.errors) && entry.errors.length > 0) {
      merged.errors = [...merged.errors, ...entry.errors]
    }
  } catch (e) {
    console.warn('[backup-progress] updateProgress errors update failed', e)
  }
  _progress.set(id, merged)
  try {
    console.log(`[backup-progress] updateProgress: id=${id}, pid=${process.pid}, processed=${merged.processed}, total=${merged.total}, model=${merged.model}, recordId=${merged.recordId}`)
  } catch (_) {}
  try {
    const filePath = path.join(_progressDir, `progress-${id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(merged), { encoding: 'utf-8' })
  } catch (e) {
    console.warn('[backup-progress] updateProgress file write failed', e)
  }
  try {
    // If we are complete, delete the file to keep things clean
    if ((merged.total ?? 0) > 0 && (merged.processed ?? 0) >= (merged.total ?? 0)) {
      // schedule deletion in 5 minutes to allow file rehydration for late GETs
      const cleanupDelayMs = 1000 * 60 * 5
      if (_cleanupTimers.has(id)) {
        clearTimeout(_cleanupTimers.get(id)!)
      }
      const timer = setTimeout(() => {
        try {
          const filePath = path.join(_progressDir, `progress-${id}.json`)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log(`[backup-progress] delete progress file id=${id}`)
          }
        } catch (e) {
          console.warn('[backup-progress] cleaning up progress file failed', e)
        }
        _cleanupTimers.delete(id)
        _progress.delete(id)
      }, cleanupDelayMs)
      _cleanupTimers.set(id, timer)
    }
  } catch (e) {
    console.warn('[backup-progress] updateProgress cleanup failed', e)
  }
}

export function getProgress(id: string) {
  const res = _progress.get(id) ?? null
  // If we have an in-memory entry, consider rehydrating from file if file has newer updatedAt
  try {
    const filePath = path.join(_progressDir, `progress-${id}.json`)
    if (fs.existsSync(filePath)) {
      const txt = fs.readFileSync(filePath, { encoding: 'utf-8' })
      const parsed = JSON.parse(txt) as ProgressEntry
      if (res) {
        const resUpdated = res.updatedAt ? Date.parse(res.updatedAt) : 0
        const fileUpdated = parsed.updatedAt ? Date.parse(parsed.updatedAt) : 0
        if (fileUpdated > resUpdated) {
          _progress.set(id, parsed)
          console.log(`[backup-progress] getProgress: id=${id} rehydrated from file (pid=${process.pid}) parsed=${JSON.stringify(parsed)}`)
          return parsed
        }
      }
    }
  } catch (e) {
    console.warn('[backup-progress] getProgress file read failed', e)
  }
  if (!res) {
    // Try file fallback
    try {
      const filePath = path.join(_progressDir, `progress-${id}.json`)
      if (fs.existsSync(filePath)) {
        const txt = fs.readFileSync(filePath, { encoding: 'utf-8' })
        const parsed = JSON.parse(txt) as ProgressEntry
        _progress.set(id, parsed)
        console.log(`[backup-progress] getProgress: id=${id} rehydrated from file (pid=${process.pid}) parsed=${JSON.stringify(parsed)}`)
        return parsed
      }
    } catch (e) {
      console.warn('[backup-progress] getProgress file read failed', e)
    }
    console.log(`[backup-progress] getProgress: id=${id} not found (pid=${process.pid})`)
  } else {
    console.log(`[backup-progress] getProgress: id=${id} found (pid=${process.pid}) processed=${res.processed} total=${res.total} updatedAt=${res.updatedAt}`)
  }
  return res
}
