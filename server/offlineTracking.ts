import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { isGameResult, isLocalhost, RESULTS_ENDPOINT, resultsToCsv, type GameResult } from '../src/offlineTracking.ts'

const DEVICE_FILE = '.motion-in-bloom-device.local'

async function getDeviceId(root: string) {
  const path = join(root, DEVICE_FILE)
  try {
    await writeFile(path, randomUUID(), { flag: 'wx' })
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') throw error
  }
  const id = (await readFile(path, 'utf8')).trim()
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) throw new Error(`Invalid device ID in ${DEVICE_FILE}`)
  return id
}

export function createResultWriter(root: string) {
  let queue = Promise.resolve()
  return (result: GameResult) => {
    const pending = queue.then(async () => {
      const id = await getDeviceId(root)
      const directory = join(root, 'offline-results')
      await mkdir(directory, { recursive: true })
      const file = await open(join(directory, `motion-in-bloom-${id}.csv`), 'a+')
      try {
        const { size } = await file.stat()
        let separator = ''
        if (size > 0) {
          const lastByte = Buffer.alloc(1)
          await file.read(lastByte, 0, 1, size - 1)
          if (lastByte[0] !== 10 && lastByte[0] !== 13) separator = '\r\n'
        }
        await file.writeFile(separator + resultsToCsv([result], size === 0), 'utf8')
      } finally {
        await file.close()
      }
    })
    queue = pending.catch(() => {})
    return pending
  }
}

function isLocalRequest(request: IncomingMessage) {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')) return false
  try {
    const url = new URL(`http://${request.headers.host}`)
    if (!isLocalhost(url.hostname)) return false
    const origin = request.headers.origin
    return !origin || (isLocalhost(new URL(origin).hostname) && new URL(origin).host === url.host)
  } catch {
    return false
  }
}

export function createTrackingMiddleware(root: string) {
  const appendResult = createResultWriter(root)
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    if (request.url?.split('?')[0] !== RESULTS_ENDPOINT) return next()
    response.setHeader('Cache-Control', 'no-store')
    if (!isLocalRequest(request)) { response.writeHead(403).end('Localhost only'); return }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      response.writeHead(405).end('Use POST')
      return
    }
    try {
      let body = ''
      for await (const chunk of request) {
        body += chunk.toString()
        if (Buffer.byteLength(body) > 16384) { response.writeHead(413).end('Result too large'); return }
      }
      let result: unknown
      try { result = JSON.parse(body) } catch { response.writeHead(400).end('Invalid JSON'); return }
      if (!isGameResult(result)) { response.writeHead(400).end('Invalid game result'); return }
      await appendResult(result)
      response.writeHead(204).end()
    } catch (error) {
      console.error('Could not append offline game result:', error)
      response.writeHead(500).end('Could not save game result')
    }
  }
}
