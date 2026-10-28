import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import ts from 'typescript'

async function moduleUrl(path, imports = {}) {
  let code = ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText
  for (const [specifier, url] of Object.entries(imports)) code = code.replaceAll(`'${specifier}'`, `'${url}'`)
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}
const schema = await moduleUrl('../src/offlineTracking.ts')
const { isGameResult, isLocalhost, resultsToCsv } = await import(schema)
const { createResultWriter, createTrackingMiddleware } = await import(await moduleUrl('../server/offlineTracking.ts', {
  '../src/offlineTracking.ts': schema,
}))
const result = { completedCycles: 5, targetCycles: 5, outcome: 'fast', elapsedSeconds: 11.999, startedAt: '2026-10-28T12:00:00.000Z', status: 'finished', interruptionReason: '' }

test('validates outcomes, deadlines, counts, timestamps and local hostnames', () => {
  assert.ok(isGameResult(result))
  for (const reason of ['restart', 'camera_retry', 'page_exit']) {
    assert.ok(isGameResult({ ...result, completedCycles: 2, outcome: 'incomplete', status: 'interrupted', interruptionReason: reason }))
  }
  assert.equal(isGameResult({ ...result, status: 'interrupted', interruptionReason: 'page_exit' }), false)
  assert.ok(isGameResult({ ...result, outcome: 'standard', elapsedSeconds: 12 }))
  assert.ok(isGameResult({ ...result, completedCycles: 0, outcome: 'incomplete', elapsedSeconds: 40 }))
  for (const change of [{ completedCycles: 6 }, { completedCycles: 1.5 }, { elapsedSeconds: NaN },
    { elapsedSeconds: 40 }, { outcome: 'standard' }, { startedAt: 'yesterday' }, { targetCycles: 6 }]) {
    assert.equal(isGameResult({ ...result, ...change }), false)
  }
  for (const host of ['localhost', '127.0.0.1', '[::1]', '::1']) assert.ok(isLocalhost(host))
  for (const host of ['example.com', '192.168.1.2', 'localhost.evil.com']) assert.equal(isLocalhost(host), false)
})

test('serializes concurrent results and reuses the device file after restart', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bloom-analytics-'))
  try {
    const write = createResultWriter(root)
    await Promise.all([write(result), write(result)])
    await createResultWriter(root)(result)
    const files = await readdir(join(root, 'offline-results'))
    assert.equal(files.length, 1)
    assert.equal(await readFile(join(root, 'offline-results', files[0]), 'utf8'),
      resultsToCsv([result]) + resultsToCsv([result, result], false))
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('endpoint saves valid requests and rejects invalid, cross-origin and oversized requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bloom-endpoint-'))
  const middleware = createTrackingMiddleware(root)
  const server = createServer((req, res) => void middleware(req, res, () => res.writeHead(404).end()))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/__offline-tracking/results`
  try {
    assert.equal((await fetch(url, { method: 'POST', body: JSON.stringify(result) })).status, 204)
    assert.equal((await fetch(url)).status, 405)
    assert.equal((await fetch(url, { method: 'POST', body: '{}' })).status, 400)
    assert.equal((await fetch(url, { method: 'POST', body: 'bad' })).status, 400)
    assert.equal((await fetch(url, { method: 'POST', body: 'x'.repeat(17000) })).status, 413)
    assert.equal((await fetch(url, { method: 'POST', headers: { Origin: 'https://example.com' }, body: JSON.stringify(result) })).status, 403)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  }
})
