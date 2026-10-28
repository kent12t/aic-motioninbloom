export interface GameResult {
  completedCycles: number
  targetCycles: number
  outcome: 'fast' | 'standard' | 'incomplete'
  elapsedSeconds: number
  startedAt: string
  status: 'finished' | 'interrupted'
  interruptionReason: '' | 'restart' | 'camera_retry' | 'page_exit'
}

export const RESULTS_ENDPOINT = '/__offline-tracking/results'

export function isLocalhost(hostname: string) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname)
}

export function isGameResult(value: unknown): value is GameResult {
  if (!value || typeof value !== 'object') return false
  const r = value as Partial<GameResult>
  if (r.targetCycles !== 5 || !Number.isInteger(r.completedCycles)
    || r.completedCycles! < 0 || r.completedCycles! > 5
    || typeof r.elapsedSeconds !== 'number' || !Number.isFinite(r.elapsedSeconds)
    || r.elapsedSeconds < 0 || r.elapsedSeconds > 40
    || typeof r.startedAt !== 'string' || !Number.isFinite(Date.parse(r.startedAt))
    || new Date(r.startedAt).toISOString() !== r.startedAt) return false
  const outcome = r.completedCycles === 5 && r.elapsedSeconds < 40
    ? (r.elapsedSeconds < 12 ? 'fast' : 'standard') : 'incomplete'
  if (r.status === 'interrupted') {
    return r.completedCycles! < 5 && r.elapsedSeconds < 40 && r.outcome === 'incomplete'
      && ['restart', 'camera_retry', 'page_exit'].includes(r.interruptionReason ?? '')
  }
  return r.status === 'finished' && r.interruptionReason === ''
    && r.outcome === outcome && (outcome !== 'incomplete' || r.elapsedSeconds === 40)
}

export function resultsToCsv(results: GameResult[], includeHeader = true) {
  const rows = [
    ...(includeHeader ? [['completed_cycles', 'target_cycles', 'outcome', 'time_taken_seconds', 'time_start_iso', 'status', 'interruption_reason']] : []),
    ...results.map((r) => [r.completedCycles, r.targetCycles, r.outcome, r.elapsedSeconds, r.startedAt, r.status, r.interruptionReason]),
  ]
  return (includeHeader ? '\uFEFF' : '') + rows.map((row) => row.map((value) =>
    `"${String(value).replaceAll('"', '""')}"`,
  ).join(',')).join('\r\n') + '\r\n'
}

export function recordGameResult(result: GameResult) {
  if (!isLocalhost(window.location.hostname)) return
  void fetch(RESULTS_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result), keepalive: true,
  }).then((response) => {
    if (!response.ok) throw new Error(`Local tracking returned HTTP ${response.status}`)
  }).catch((error: unknown) => {
    console.error('Could not append game result to the local CSV:', error)
  })
}
