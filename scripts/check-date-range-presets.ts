// MBM-345: the standard date range popup must give the reports exactly the
// dates the old DateRangeSelector gave. This copies the old logic and compares
// it with src/lib/date-range-presets.ts at several "now" moments.
//   npx tsx scripts/check-date-range-presets.ts
import { presetRange, monthRange, matchPreset, type PresetKey } from '../src/lib/date-range-presets'

// The old DateRangeSelector.handlePresetClick, verbatim in substance
function oldPreset(key: string, now: Date, days?: number, months?: number) {
  let start: Date, end: Date = now
  if (key === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  else if (key === 'yesterday') {
    const y = new Date(now); y.setDate(now.getDate() - 1)
    start = new Date(y.getFullYear(), y.getMonth(), y.getDate())
    end = new Date(y.getFullYear(), y.getMonth(), y.getDate())
  } else if (key === 'mtd') start = new Date(now.getFullYear(), now.getMonth(), 1)
  else if (key === 'ytd') start = new Date(now.getFullYear(), 0, 1)
  else if (months) { start = new Date(now); start.setMonth(start.getMonth() - months) }
  else { start = new Date(now); start.setDate(now.getDate() - (days || 7)) }
  return { start, end }
}
const OLD: { key: PresetKey; days?: number; months?: number }[] = [
  { key: 'today' }, { key: 'yesterday' }, { key: 'mtd' }, { key: 'ytd' },
  { key: '7', days: 7 }, { key: '30', days: 30 }, { key: '90', days: 90 },
  { key: '6m', months: 6 }, { key: '1y', months: 12 }, { key: '2y', months: 24 }, { key: '5y', months: 60 },
]
const NOWS = ['2026-11-26T19:15:00', '2026-03-31T08:00:00', '2024-02-29T23:59:00', '2027-01-01T00:30:00', '2026-08-31T12:00:00'].map(s => new Date(s))

let bad = 0
for (const now of NOWS) {
  for (const o of OLD) {
    const a = oldPreset(o.key, now, o.days, o.months), b = presetRange(o.key, now)
    if (a.start.getTime() !== b.start.getTime() || a.end.getTime() !== b.end.getTime()) {
      bad++; console.log(`✗ ${o.key} @ ${now.toISOString()}: old ${a.start.toISOString()}–${a.end.toISOString()} new ${b.start.toISOString()}–${b.end.toISOString()}`)
    }
  }
  // the old month picker: 1st to last day
  for (let m = 0; m < 12; m++) {
    const r = monthRange(now.getFullYear(), m)
    const a = { start: new Date(now.getFullYear(), m, 1), end: new Date(now.getFullYear(), m + 1, 0) }
    if (r.start.getTime() !== a.start.getTime() || r.end.getTime() !== a.end.getTime()) { bad++; console.log(`✗ month ${m}`) }
  }
  // every preset is recognised back from its own range
  for (const o of OLD) if (!['yesterday'].includes(o.key) && matchPreset(presetRange(o.key, now), undefined, now) === null) { bad++; console.log(`✗ matchPreset ${o.key}`) }
}
// new presets, spot checks
const n = new Date('2026-11-26T19:15:00') // a Thursday
const show = (k: PresetKey) => { const r = presetRange(k, n); return `${r.start.toDateString()} → ${r.end.toDateString()}` }
console.log('This week:', show('week'), '| Last week:', show('lastWeek'))
console.log('Last month:', show('lastMonth'), '| Last year:', show('lastYear'))
console.log(bad ? `\n${bad} differences` : '\n✓ every old preset and the month picker give the same dates as before')
process.exit(bad ? 1 : 0)
