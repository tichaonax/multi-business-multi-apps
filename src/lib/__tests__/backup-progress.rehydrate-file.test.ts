import fs from 'fs'
import path from 'path'
import os from 'os'
import { createProgressId, updateProgress, getProgress } from '../backup-progress'

describe('backup-progress rehydrate from file when file newer', () => {
  test('prefers file when file has newer updatedAt than in-memory', () => {
    const id = createProgressId()
    // initial in-memory entry
    const initial = getProgress(id)
    expect(initial).not.toBeNull()

    // write a file with newer updatedAt and different processed value
    const dir = path.join(os.tmpdir(), 'mbma-backup-progress')
    const filePath = path.join(dir, `progress-${id}.json`)
    const now = new Date()
    const later = new Date(now.getTime() + 10000)
    const fileEntry = { processed: 5, total: 10, counts: { testModel: { processed: 5, total: 10 } }, updatedAt: later.toISOString(), startedAt: now.toISOString() }
    fs.writeFileSync(filePath, JSON.stringify(fileEntry), { encoding: 'utf-8' })

    const rehydrated = getProgress(id)
    expect(rehydrated).not.toBeNull()
    expect(rehydrated?.processed).toBe(5)
    expect(rehydrated?.counts?.testModel?.processed).toBe(5)
  })
})
