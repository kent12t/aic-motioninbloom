import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Exercise the pure tracker without adding a browser or a second build tool.
async function moduleUrl(path, imports = {}) {
  let code = ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText
  for (const [specifier, url] of Object.entries(imports)) code = code.replaceAll(`'${specifier}'`, `'${url}'`)
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}
const config = await moduleUrl('../src/game/config.ts')
const types = await moduleUrl('../src/types/game.ts')
const { SitStandTracker } = await import(await moduleUrl('../src/game/sitStandTracker.ts', {
  './config': config, '../types/game': types,
}))

function pose(standing = false, x = 0.5) {
  const points = Array.from({ length: 33 }, () => ({ x, y: 0.5, visibility: 0.99 }))
  for (const i of [11, 12]) points[i].y = standing ? 0.2 : 0.4
  for (const i of [23, 24]) points[i].y = standing ? 0.45 : 0.65
  for (const i of [25, 26]) points[i].y = standing ? 0.73 : 0.69
  return points
}
function session() {
  const tracker = new SitStandTracker()
  let time = 0
  let repetitions = 0
  const feed = (points, duration, playing = true) => {
    let last
    for (let i = 0; i < duration / 50; i++) {
      time += 50
      last = tracker.update(points, time, playing)
      if (last.repetition) repetitions++
    }
    return last
  }
  return { tracker, feed, count: () => repetitions }
}

test('requires stable seated calibration; standing and outside-zone poses cannot calibrate', () => {
  const s = session()
  assert.equal(s.feed(pose(true), 2000, false).ready, false)
  assert.equal(s.feed(pose(false, 0.1), 2000, false).ready, false)
  assert.equal(s.feed(pose(), 2000, false).ready, true)
  assert.equal(s.feed(pose(true), 1000, false).ready, false)
})
test('counts only complete, stable seated-standing-seated cycles', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  s.feed(pose(true), 1000)
  assert.equal(s.count(), 0)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 1)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 1)
  s.feed(pose(true), 1000)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 2)
})
test('brief jitter and low-confidence landmarks never complete a stand', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  s.feed(pose(true), 100)
  s.feed(pose(), 1000)
  const obscured = pose(true)
  obscured[23].visibility = 0.2
  s.feed(obscured, 1000)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 0)
})
test('tracking loss discards an unfinished repetition and requires sitting again', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  s.feed(pose(true), 1000)
  s.feed(null, 1000)
  s.feed(pose(true), 1000)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 0)
  s.feed(pose(true), 1000)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 1)
})
test('a sudden lateral replacement is rejected and cannot finish an old repetition', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  s.feed(pose(true), 1000)
  assert.equal(s.feed(pose(false, 0.68), 1000).accepted, false)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 0)
  s.tracker.reset()
  assert.equal(s.feed(pose(true), 1000, false).ready, false)
})

test('hip movement alone or knee-gap change alone does not count as standing', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  const lifted = pose()
  for (const p of lifted) p.y -= 0.15
  s.feed(lifted, 1000)
  s.feed(pose(), 1000)
  const kneeOnly = pose()
  kneeOnly[25].y = 0.9
  kneeOnly[26].y = 0.9
  s.feed(kneeOnly, 1000)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 0)
})

test('large scale changes and non-finite landmarks are rejected', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  const scaled = pose()
  scaled[11].y = 0.15
  scaled[12].y = 0.15
  assert.equal(s.feed(scaled, 1000).accepted, false)
  const corrupt = pose()
  corrupt[23].visibility = NaN
  assert.equal(s.feed(corrupt, 1000).accepted, false)
  assert.equal(s.count(), 0)
})
