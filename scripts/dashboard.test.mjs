import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const code = ts.transpileModule(await readFile(new URL('../src/analytics/data.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const { parseCsv, readResults, localDate, localTime } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

test('CSV supports CRLF, escaped quotes, embedded commas and newlines', () => {
  assert.deepEqual(parseCsv('"a","b"\r\n"hello, world","a""b\nc"\r\n'), [['a', 'b'], ['hello, world', 'a"b\nc']])
})

test('UTC+8 frontend date boundaries do not change source time', () => {
  assert.equal(localDate('2026-10-29T15:59:59Z'), '2026-10-29')
  assert.equal(localDate('2026-10-29T16:00:00Z'), '2026-10-30')
  assert.match(localTime('2026-10-29T16:00:00Z'), /30 Oct 2026.*00:00:00/)
})

test('loads both branch datasets without dropping rows and sorts newest first', async () => {
  const files = {}
  for (const id of ['7292c2cc-1995-43d3-9d1d-ded1e896206a', 'e1f87519-cf52-4ebe-95b8-77a316c240dd']) {
    const path = `../offline-results/motion-in-bloom-${id}.csv`
    files[path] = await readFile(new URL(path, import.meta.url), 'utf8')
  }
  const { results, skipped } = readResults(files)
  assert.equal(skipped, 0)
  assert.equal(results.length, 379)
  assert.equal(new Set(results.map(row => row.device)).size, 2)
  assert.ok(results.every((row, i) => !i || Date.parse(results[i - 1].started) >= Date.parse(row.started)))
})

test('invalid rows are reported instead of contaminating metrics', () => {
  const { results, skipped } = readResults({ 'bad.csv': 'completed_cycles,target_cycles,outcome,time_taken_seconds,time_start_iso,status\n1,5,incomplete,-1,invalid,finished' })
  assert.equal(results.length, 0)
  assert.equal(skipped, 1)
})
