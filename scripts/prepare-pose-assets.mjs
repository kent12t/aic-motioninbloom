import { cp, mkdir, access } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const root = new URL('../', import.meta.url)
const destination = new URL('public/mediapipe/', root)
await mkdir(destination, { recursive: true })
await cp(new URL('node_modules/@mediapipe/tasks-vision/wasm/', root), new URL('wasm/', destination), { recursive: true })
const model = new URL('pose_landmarker_lite.task', destination)
try {
  await access(model)
} catch {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task')
  if (!response.ok || !response.body) throw new Error(`Model download failed: ${response.status}`)
  const temporary = new URL('pose_landmarker_lite.task.download', destination)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary))
  const { rename } = await import('node:fs/promises')
  await rename(temporary, model)
}
console.log('Local MediaPipe WASM and pose model ready.')
