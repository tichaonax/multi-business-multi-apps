import { createProgressId, updateProgress, getProgress } from '../backup-progress'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('backup-progress file fallback', () => {
  test('create, update, and rehydrate progress', () => {
    const id = createProgressId()
    expect(typeof id).toBe('string')
    const tmpdir = path.join(os.tmpdir(), 'mbma-backup-progress')
    const filePath = path.join(tmpdir, `progress-${id}.json`)
    // file should exist
    expect(fs.existsSync(filePath)).toBe(true)

    updateProgress(id, { model: 'test', processed: 5, total: 10 })

    const entry = getProgress(id)
    expect(entry).not.toBeNull()
    expect(entry?.model).toBe('test')
    expect(entry?.processed).toBe(5)
    expect(entry?.total).toBe(10)

    // Now remove from memory map and rehydrate from file
    // This is not exposed; we simulate by directly reading file
    const txt = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(txt)
    expect(parsed.processed).toBe(5)
  })
})
