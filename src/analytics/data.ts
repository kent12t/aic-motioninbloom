export interface Result {
  id: string
  device: string
  cycles: number
  target: number
  outcome: string
  seconds: number
  started: string
  status: string
  reason: string
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++ }
      else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(field); field = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some(Boolean)) rows.push(row)
      row = []; field = ''
    } else field += char
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

export function readResults(files: Record<string, string>) {
  const results: Result[] = []
  let skipped = 0
  for (const [path, text] of Object.entries(files)) {
    const device = path.split('/').pop()!.replace(/^motion-in-bloom-/, '').replace(/\.csv$/, '')
    const [headers = [], ...rows] = parseCsv(text.replace(/^\uFEFF/, ''))
    rows.forEach((row, index) => {
      const get = (key: string) => row[headers.indexOf(key)] ?? ''
      const cycles = Number(get('completed_cycles')), target = Number(get('target_cycles'))
      const seconds = Number(get('time_taken_seconds')), started = get('time_start_iso')
      const outcome = get('outcome'), status = get('status')
      if (!Number.isInteger(cycles) || !Number.isInteger(target) || target <= 0 || cycles < 0 || cycles > target ||
        !get('completed_cycles') || !get('time_taken_seconds') ||
        !Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(Date.parse(started)) ||
        !['fast', 'standard', 'incomplete'].includes(outcome) || !['finished', 'interrupted'].includes(status)) {
        skipped++; return
      }
      results.push({ id: `${path}:${index}`, device, cycles, target, seconds, started, outcome, status, reason: get('interruption_reason') })
    })
  }
  return { results: results.sort((a, b) => Date.parse(b.started) - Date.parse(a.started)), skipped }
}

export const localDate = (iso: string) => new Date(Date.parse(iso) + 8 * 3600_000).toISOString().slice(0, 10)
export const localTime = (iso: string) => new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore', year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date(iso))
