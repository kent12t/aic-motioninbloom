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
const { MainPlayer } = await import(await moduleUrl('../src/game/mainPlayer.ts', {
  './config': config,
}))
const { SitStandTracker } = await import(await moduleUrl('../src/game/sitStandTracker.ts', {
  './config': config, '../types/game': types,
}))
const { FlowerRound, resultOutcome } = await import(await moduleUrl('../src/game/flowerRound.ts', {
  './config': config,
}))

function pose(standing = false, x = 0.5) {
  const points = Array.from({ length: 33 }, () => ({ x, y: 0.5, visibility: 0.99 }))
  for (const i of [11, 12]) points[i].y = standing ? 0.2 : 0.4
  for (const i of [23, 24]) points[i].y = standing ? 0.45 : 0.65
  for (const i of [25, 26]) points[i].y = standing ? 0.73 : 0.69
  return points
}

function playerPose(scale = 1, x = 0.5, rise = 0) {
  const points = pose()
  for (const p of points) {
    p.x = x
    p.y = 0.55 + (p.y - 0.55) * scale - rise
  }
  for (const [left, right, width] of [[11, 12, 0.22], [23, 24, 0.16], [7, 8, 0.1]]) {
    points[left].x -= width * scale / 2
    points[right].x += width * scale / 2
  }
  return points
}

function lockPlayer(selector, points) {
  for (let t = 0; t < 150; t += 50) assert.equal(selector.select([points], t), null)
  assert.equal(selector.select([points], 150), points)
}

test('main player prefers a stable central foreground torso, independent of detector order', () => {
  const selector = new MainPlayer()
  const main = playerPose()
  const background = playerPose(0.55, 0.56)
  for (let t = 0; t < 150; t += 50) assert.equal(selector.select([background, main], t), null)
  assert.equal(selector.select([main, background], 150), main)
  assert.equal(selector.select([background, main], 200), main)
})

test('faces, small distant bodies, off-centre people and ambiguous players cannot acquire', () => {
  const face = playerPose()
  for (const i of [11, 12, 23, 24]) face[i].visibility = 0
  for (const poses of [[face], [playerPose(0.3)], [playerPose(1, 0.7)],
    [playerPose(1, 0.46), playerPose(1, 0.54)]]) {
    const selector = new MainPlayer()
    for (let t = 0; t < 2000; t += 50) assert.equal(selector.select(poses, t), null)
  }
})

test('player lock survives long absence without accepting a smaller or lateral bystander', () => {
  const selector = new MainPlayer()
  const main = playerPose()
  lockPlayer(selector, main)
  assert.equal(selector.select([], 200), null)
  for (const t of [1000, 5000, 60000]) {
    assert.equal(selector.select([playerPose(0.55), playerPose(1, 0.68)], t), null)
  }
  assert.equal(selector.select([main], 60100), main)
  assert.equal(selector.select([main, playerPose(1, 0.51)], 60200), null)
})

test('vertical motion and clipped upper body retain the player, but hidden anchors do not', () => {
  const selector = new MainPlayer()
  lockPlayer(selector, playerPose())
  const standing = playerPose(1, 0.52, 0.25)
  for (const i of [7, 8, 11, 12]) standing[i].visibility = 0
  assert.equal(selector.select([playerPose(0.5), standing], 200), standing)
  for (const p of standing) p.visibility = 0
  assert.equal(selector.select([standing], 250), null)
  const headOnly = playerPose(1, 0.5, 0.2)
  for (const i of [11, 12, 23, 24]) headOnly[i].visibility = 0
  assert.equal(selector.select([headOnly], 300), headOnly)
})

test('background motion cannot calibrate or score while the locked player is absent', () => {
  const selector = new MainPlayer()
  const tracker = new SitStandTracker()
  const main = playerPose()
  lockPlayer(selector, main)
  for (let t = 200; t < 2200; t += 50) tracker.update(selector.select([main], t), t, false)
  assert.equal(tracker.update(selector.select([main], 2200), 2200, false).ready, true)
  for (let t = 2250; t < 6000; t += 50) {
    const background = playerPose(0.5, 0.5, t % 1000 < 500 ? 0.2 : 0)
    const result = tracker.update(selector.select([background], t), t, true)
    assert.equal(result.repetition, false)
    assert.equal(result.stood, false)
  }
})
function session() {
  const tracker = new SitStandTracker()
  let time = 0
  let repetitions = 0
  let stands = 0
  const feed = (points, duration, playing = true) => {
    let last
    for (let i = 0; i < duration / 50; i++) {
      time += 50
      last = tracker.update(points, time, playing)
      if (last.repetition) repetitions++
      if (last.stood) stands++
    }
    return last
  }
  return { tracker, feed, count: () => repetitions, stands: () => stands }
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
test('bypassed start acquires a short seated window during play and counts the next cycle', () => {
  const s = session()
  assert.equal(s.feed(null, 2000).ready, false)
  assert.equal(s.feed(pose(true), 1000).ready, false)
  assert.equal(s.count(), 0)
  assert.equal(s.feed(pose(), 150).ready, false)
  assert.equal(s.feed(pose(), 50).ready, true)
  assert.equal(s.count(), 0)
  for (let cycle = 1; cycle <= 5; cycle++) {
    s.feed(pose(true), 400)
    s.feed(pose(), 400)
    assert.equal(s.count(), cycle)
  }
})
test('in-play calibration rejects missing, outside-zone and unstable seated windows', () => {
  const s = session()
  assert.equal(s.feed(pose(false, 0.1), 400).ready, false)
  const hidden = pose()
  for (const p of hidden) p.visibility = 0.1
  assert.equal(s.feed(hidden, 400).ready, false)
  for (let i = 0; i < 10; i++) {
    const moving = pose()
    for (const p of moving) p.y += i % 2 ? 0.04 : 0
    assert.equal(s.feed(moving, 50).ready, false)
  }
  s.feed(null, 50)
  assert.equal(s.feed(pose(), 150).ready, false)
  s.feed(null, 50)
  assert.equal(s.feed(pose(), 150).ready, false)
  assert.equal(s.feed(pose(), 50).ready, true)
  assert.equal(s.count(), 0)
})
test('a sustained partial rise rewards effort without confirming a stand or scoring', () => {
  const tracker = new SitStandTracker()
  let time = 0
  const feed = (points, count, playing) => Array.from({ length: count }, () => {
    time += 50
    return tracker.update(points, time, playing)
  })
  feed(pose(), 40, false)
  const partial = pose()
  for (const i of [11, 12, 23, 24]) partial[i].y -= 0.05
  assert.equal(feed(partial, 10, false).some(f => f.rising), false)
  feed(pose(), 10, false)
  assert.equal(feed(partial, 1, true).some(f => f.rising), false)
  const attempt = feed(partial, 10, true)
  assert.ok(attempt.some(f => f.rising))
  assert.ok(attempt.every(f => !f.stood && !f.repetition))
  assert.ok(feed(pose(), 20, true).every(f => !f.repetition))
  assert.ok(feed(null, 20, true).every(f => !f.rising && !f.repetition))
})
test('seated return above the bloom threshold does not start the next flower', () => {
  const tracker = new SitStandTracker()
  const round = new FlowerRound()
  let time = 0
  const feed = (points, count, playing = true) => Array.from({ length: count }, () => {
    time += 50
    const f = tracker.update(points, time, playing)
    if (playing) {
      if (f.rising) round.update(time, 'rising')
      if (f.stood) round.update(time, 'stood')
      if (f.repetition) round.update(time, 'completed')
    }
    return f
  })
  feed(pose(), 40, false)
  round.start(time)
  feed(pose(true), 20)
  // Still descending/settling: hips qualify as seated but remain above the
  // lower visual-reward threshold. This is not the next ascent.
  const settling = pose()
  for (const i of [11, 12, 23, 24]) settling[i].y -= 0.04
  const returns = feed(settling, 30)
  assert.equal(round.state.completed.length, 1)
  const completedAt = returns.findIndex(f => f.repetition)
  assert.ok(completedAt >= 0)
  assert.ok(returns.slice(completedAt + 1).every(f => !f.rising))
  assert.equal(round.state.blooming, false)
  feed(pose(), 10)
  const nextRise = pose()
  for (const i of [11, 12, 23, 24]) nextRise[i].y -= 0.05
  assert.ok(feed(nextRise, 10).some(f => f.rising))
  assert.equal(round.state.blooming, true)
  assert.equal(round.state.completed.length, 1)
})
test('early blooming is latched visually without awarding an attempted flower', () => {
  const round = new FlowerRound()
  round.start(0)
  round.update(200, 'rising')
  assert.equal(round.state.blooming, true)
  round.update(3000)
  assert.equal(round.state.blooming, true)
  assert.deepEqual(round.state.completed, [])
  round.update(40000)
  assert.deepEqual(round.state.completed, [])
})
test('brief jitter and low-confidence landmarks never complete a stand', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  s.feed(pose(true), 100)
  s.feed(pose(), 1000)
  const obscured = pose(true)
  for (const p of obscured) p.visibility = 0.2
  s.feed(obscured, 1000)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 0)
})
test('counts full stands when the seated torso is foreshortened by the camera angle', () => {
  const s = session()
  // Representative USB-camera geometry: the projected torso grows from .196
  // seated to .30 upright, while the hip-to-knee distance grows from .088 to .20.
  const seated = pose()
  for (const i of [11, 12]) seated[i].y = 0.444
  for (const i of [23, 24]) seated[i].y = 0.64
  for (const i of [25, 26]) seated[i].y = 0.728
  const standing = pose(true)
  for (const i of [11, 12]) standing[i].y = 0.20
  for (const i of [23, 24]) standing[i].y = 0.50
  for (const i of [25, 26]) standing[i].y = 0.70
  assert.equal(s.feed(seated, 2000, false).ready, true)
  for (let cycle = 1; cycle <= 5; cycle++) {
    s.feed(standing, 1200)
    assert.equal(s.stands(), cycle)
    assert.equal(s.count(), cycle - 1)
    s.feed(seated, 1200)
    assert.equal(s.count(), cycle)
  }
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

test('clear vertical body movement is enough; knee movement alone cannot add a cycle', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  const lifted = pose()
  for (const p of lifted) p.y -= 0.15
  s.feed(lifted, 1000)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 1)
  const kneeOnly = pose()
  kneeOnly[25].y = 0.9
  kneeOnly[26].y = 0.9
  s.feed(kneeOnly, 1000)
  s.feed(pose(), 1000)
  assert.equal(s.count(), 1)
})

test('large scale changes and non-finite landmarks are rejected', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  const scaled = pose()
  scaled[11].y = 0.15
  scaled[12].y = 0.15
  assert.equal(s.feed(scaled, 1000).accepted, false)
  const corrupt = pose()
  for (const p of corrupt) p.visibility = NaN
  assert.equal(s.feed(corrupt, 1000).accepted, false)
  assert.equal(s.count(), 0)
})

function motionPose(rise, { clipped = false, headOnly = false } = {}) {
  const points = pose()
  points[0].y = 0.32 - 0.24 * rise
  for (const i of [11, 12]) points[i].y = 0.444 - 0.244 * rise
  for (const i of [23, 24]) points[i].y = 0.64 - 0.14 * rise
  for (const i of [25, 26]) points[i].y = 0.728 - 0.028 * rise
  if (clipped) {
    // Actual out-of-zone head/shoulders, plus unreliable knees, not just absent dots.
    for (const i of [0, 11, 12]) { points[i].y = -0.05; points[i].visibility = 0.99 }
    for (const i of [25, 26]) points[i].visibility = 0.1
  }
  if (headOnly) for (const i of [11, 12, 23, 24, 25, 26]) points[i].visibility = 0.1
  return points
}

test('five continuous triangular cycles count once each without endpoint pauses', () => {
  for (const period of [800, 1200, 2000]) {
    const s = session()
    s.feed(motionPose(0), 2000, false)
    for (let cycle = 0; cycle < 5; cycle++) {
      for (let t = 50; t <= period; t += 50) {
        const rise = 1 - Math.abs(2 * t / period - 1)
        s.feed(motionPose(rise), 50)
      }
    }
    s.feed(motionPose(0), 200)
    assert.equal(s.stands(), 5, `stands at ${period}ms/cycle`)
    assert.equal(s.count(), 5, `completed cycles at ${period}ms/cycle`)
  }
})

test('head rise alone can count after calibration without visible knees or torso', () => {
  const s = session()
  s.feed(motionPose(0), 2000, false)
  for (let cycle = 1; cycle <= 5; cycle++) {
    s.feed(motionPose(1, { headOnly: true }), 400)
    s.feed(motionPose(0, { headOnly: true }), 400)
    assert.equal(s.count(), cycle)
    assert.equal(s.stands(), cycle)
  }
})

test('head/shoulders leaving the top of frame and missing knees do not lose the stand', () => {
  const s = session()
  s.feed(motionPose(0), 2000, false)
  s.feed(motionPose(1, { clipped: true }), 500)
  assert.equal(s.stands(), 1)
  assert.equal(s.count(), 0)
  s.feed(motionPose(0), 500)
  assert.equal(s.count(), 1)
})

test('small bobs, a single-frame jump, and threshold chatter never overcount', () => {
  const s = session()
  s.feed(motionPose(0), 2000, false)
  for (let i = 0; i < 40; i++) s.feed(motionPose(i % 2 ? 0.12 : 0), 50)
  s.feed(motionPose(1), 50)
  s.feed(motionPose(0), 500)
  assert.equal(s.stands(), 0)
  assert.equal(s.count(), 0)
  s.feed(motionPose(1), 400)
  for (let i = 0; i < 40; i++) s.feed(motionPose(i % 2 ? 0.8 : 0.6), 50)
  assert.equal(s.stands(), 1)
  assert.equal(s.count(), 0)
  s.feed(motionPose(0), 400)
  s.feed(motionPose(0), 1000)
  assert.equal(s.count(), 1)
})

test('losing the risen anchor cannot turn an unrelated seated-height anchor into a return', () => {
  const s = session()
  s.feed(motionPose(0), 2000, false)
  const hipRise = motionPose(0)
  for (const i of [11, 12]) hipRise[i].visibility = 0.1
  for (const i of [23, 24]) hipRise[i].y -= 0.14
  s.feed(hipRise, 400)
  assert.equal(s.stands(), 1)
  s.feed(motionPose(0, { headOnly: true }), 400)
  assert.equal(s.count(), 0)
  s.feed(motionPose(0), 400)
  assert.equal(s.count(), 1)
})

test('a lower seated return or a different head position does not block the next cycle', () => {
  const s = session()
  s.feed(motionPose(0), 2000, false)
  s.feed(motionPose(1), 400)
  const deepSeat = motionPose(0)
  for (const p of deepSeat) p.y += 0.06
  s.feed(deepSeat, 400)
  assert.equal(s.count(), 1)
  s.feed(motionPose(1), 400)
  const uprightSeat = motionPose(0)
  uprightSeat[0].y -= 0.1
  s.feed(uprightSeat, 400)
  assert.equal(s.count(), 2)
  assert.equal(s.stands(), 2)
})

test('head bobs while the tracked hips stay raised cannot complete or rearm cycles', () => {
  const s = session()
  s.feed(motionPose(0), 2000, false)
  s.feed(motionPose(1), 400)
  const bowedHead = motionPose(1)
  bowedHead[0].y = motionPose(0)[0].y
  for (let i = 0; i < 5; i++) {
    s.feed(bowedHead, 300)
    s.feed(motionPose(1), 300)
  }
  assert.equal(s.stands(), 1)
  assert.equal(s.count(), 0)
  s.feed(motionPose(0), 400)
  assert.equal(s.count(), 1)
})

test('short occlusions cannot confirm transitions; long loss requires a fresh seated return', () => {
  const s = session()
  s.feed(motionPose(0), 2000, false)
  for (let i = 0; i < 10; i++) {
    s.feed(motionPose(1), 50)
    s.feed(null, 50)
  }
  s.feed(motionPose(0), 400)
  assert.equal(s.count(), 0)
  assert.equal(s.stands(), 0)
  s.feed(motionPose(1), 400)
  s.feed(null, 1000)
  s.feed(motionPose(1), 400)
  s.feed(motionPose(0), 400)
  assert.equal(s.count(), 0)
  s.feed(motionPose(1), 400)
  s.feed(motionPose(0), 400)
  assert.equal(s.count(), 1)
})

test('emits standing once per confirmed rise, never for jitter or a standing recovery after loss', () => {
  const s = session()
  s.feed(pose(), 2000, false)
  s.feed(pose(true), 100)
  s.feed(pose(), 1000)
  assert.equal(s.stands(), 0)
  s.feed(pose(true), 2000)
  assert.equal(s.stands(), 1)
  assert.equal(s.count(), 0)
  s.feed(null, 1000)
  s.feed(pose(true), 1000)
  s.feed(pose(), 1000)
  assert.equal(s.stands(), 1)
  assert.equal(s.count(), 0)
  s.feed(pose(true), 1000)
  s.feed(pose(), 1000)
  assert.equal(s.stands(), 2)
  assert.equal(s.count(), 1)
})

test('round records unique flower order and advances only on completed cycles', () => {
  const round = new FlowerRound()
  const choices = [0, 0.4, 0, 0.8, 0.6]
  round.start(1000, () => choices.shift())
  assert.deepEqual(round.state.flowers, ['pink', 'violet', 'purple', 'yellow', 'orange'])
  round.update(1100, 'completed')
  assert.deepEqual(round.state.completed, [])
  for (let i = 0; i < 5; i++) {
    round.update(1500 + i * 1500, 'stood')
    assert.equal(round.state.completed.length, i)
    round.update(2000 + i * 1500, 'completed')
  }
  assert.equal(round.state.finished, true)
  assert.deepEqual(round.state.completed, round.state.flowers)
  const frozen = round.state
  round.update(90000, 'completed')
  assert.equal(round.state, frozen)
})

test('every round selects all five flowers once even when random choices repeat', () => {
  const round = new FlowerRound()
  const expected = ['orange', 'pink', 'purple', 'violet', 'yellow']
  for (const choice of [0, 0.2, 0.5, 0.999999]) {
    const state = round.start(0, () => choice)
    assert.equal(state.flowers.length, 5)
    assert.deepEqual([...state.flowers].sort(), expected)
    assert.deepEqual(state.completed, [])
  }
})

test('deadline wins over a return to sitting at exactly 40 seconds; partial results exclude current bud', () => {
  const round = new FlowerRound()
  round.start(500, () => 0.2)
  round.update(1000, 'stood')
  round.update(2000, 'completed')
  round.update(3000, 'stood')
  round.update(40500, 'completed')
  assert.equal(round.state.finished, true)
  assert.equal(round.state.elapsed, 40)
  assert.deepEqual(round.state.completed, ['purple'])
  assert.equal(resultOutcome(round.state.completed.length, round.state.elapsed), 'incomplete')
  const zero = new FlowerRound()
  zero.start(0)
  assert.equal(zero.update(40001).completed.length, 0)
})

test('outcomes use unrounded time at 12 seconds and reject completion at the deadline', () => {
  assert.equal(resultOutcome(5, 11.999), 'fast')
  assert.equal(resultOutcome(5, 12), 'standard')
  assert.equal(resultOutcome(5, 39.999), 'standard')
  assert.equal(resultOutcome(5, 40), 'incomplete')
  assert.equal(resultOutcome(4, 10), 'incomplete')
})
