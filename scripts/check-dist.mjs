import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const publicRoot = new URL('../public/', import.meta.url)
const required = [
  'index.html', 'bg-flower.png', 'bg-field.jpg', 'flower-pots.png', 'home.svg', 'qrcode.png',
  'fonts/Windsor_Regular.ttf', 'fonts/CircularStd-Book.otf', 'fonts/CircularStd-Black.otf',
  'mediapipe/pose_landmarker_lite.task',
  ...['internal', 'nosimd_internal', 'module_internal'].flatMap((variant) =>
    ['js', 'wasm'].map((extension) => `mediapipe/wasm/vision_wasm_${variant}.${extension}`)),
  ...[1, 2, 3, 4].map((number) => `instr${number}.png`),
  ...['orange', 'pink', 'purple', 'violet', 'yellow'].flatMap((flower) =>
    ['.webm', '-bud.png', '-bloom.png', '-flower.png'].map((suffix) => `videos/${flower}${suffix}`)),
]

async function files(root, prefix = '') {
  const entries = await readdir(new URL(prefix, root), { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = `${prefix}${entry.name}`
    return entry.isDirectory() ? files(root, `${path}/`) : [path]
  }))
  return nested.flat()
}

for (const path of required) {
  const info = await stat(new URL(path, dist))
  assert(info.isFile() && info.size > 0, `Missing or empty required asset: ${path}`)
}

const builtFiles = await files(dist)
assert(builtFiles.length <= 20_000, 'Build exceeds Pages Free file-count limit')
for (const path of builtFiles) {
  const info = await stat(new URL(path, dist))
  assert(info.size <= 25 * 1024 * 1024, `Asset exceeds Pages 25 MiB limit: ${path}`)
}

// Public assets must survive the build intact, including the local model and WASM.
const hash = (data) => createHash('sha256').update(data).digest('hex')
for (const path of await files(publicRoot)) {
  const [source, built] = await Promise.all([
    readFile(new URL(path, publicRoot)), readFile(new URL(path, dist)),
  ])
  assert.equal(hash(built), hash(source), `Public asset changed during build: ${path}`)
}

const html = await readFile(new URL('index.html', dist), 'utf8')
const entryAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)]
assert(entryAssets.some((match) => match[1].endsWith('.js')), 'Missing built JavaScript entry')
assert(entryAssets.some((match) => match[1].endsWith('.css')), 'Missing built stylesheet')
for (const [, path] of entryAssets) await stat(new URL(path.slice(1), dist))

console.log(`Verified ${builtFiles.length} deployment files, required assets, and Pages limits.`)
