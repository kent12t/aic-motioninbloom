import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { localDate, localTime, readResults } from './data'
import './style.css'

const files = import.meta.glob('../../offline-results/*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const { results, skipped } = readResults(files, ['2026-10-30', '2026-10-31'])
const devices = [...new Set(results.map(row => row.device))].sort()
const labels: Record<string, string> = { fast: 'Fast completion', standard: 'Standard completion', incomplete: 'Incomplete' }
const PAGE_SIZE = 25

export function Dashboard() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [device, setDevice] = useState('')
  const [status, setStatus] = useState('')
  const [outcome, setOutcome] = useState('')
  const [page, setPage] = useState(0)
  const filtered = results.filter(row => (!from || localDate(row.started) >= from) &&
    (!to || localDate(row.started) <= to) && (!device || row.device === device) &&
    (!status || row.status === status) && (!outcome || row.outcome === outcome))
  const complete = filtered.filter(row => row.status === 'finished' && row.cycles === row.target)
  const average = complete.length ? `${(complete.reduce((sum, row) => sum + row.seconds, 0) / complete.length).toFixed(1)} s` : '—'
  const daily = [...new Set(filtered.map(row => localDate(row.started)))].sort().map(day => ({ day, count: filtered.filter(row => localDate(row.started) === day).length }))
  const maxDay = Math.max(1, ...daily.map(day => day.count))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages - 1)
  function reset() { setFrom(''); setTo(''); setDevice(''); setStatus(''); setOutcome(''); setPage(0) }
  return <main>
    <header><p className="eyebrow">Motion in Bloom · Data explorer</p><h1>Offline results</h1>
      <p>30–31 October 2026 · Round activity across {devices.length} devices. All dates and times are Singapore time (UTC+8).</p>
      <p className="note">CSV snapshot bundled with this page. Rebuild to include updated files. No camera or game session is started.</p>
    </header>
    <section aria-label="Filter results" className="filters" onChange={() => setPage(0)}>
      <label>From (UTC+8)<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label>To (UTC+8)<input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></label>
      <label>Device<select value={device} onChange={e => setDevice(e.target.value)}><option value="">All devices</option>{devices.map((id, i) => <option key={id} value={id}>Device {i + 1} · {id}</option>)}</select></label>
      <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="finished">Finished</option><option value="interrupted">Interrupted</option></select></label>
      <label>Outcome<select value={outcome} onChange={e => setOutcome(e.target.value)}><option value="">All outcomes</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button onClick={reset}>Reset filters</button>
    </section>
    {from && to && from > to && <p role="alert">The start date must be on or before the end date.</p>}
    {skipped > 0 && <p role="status">{skipped} invalid CSV rows were skipped.</p>}
    <section className="metrics" aria-label="Summary" aria-live="polite">
      {[['Rounds', filtered.length], ['Completed target', complete.length], ['Completion rate', filtered.length ? `${Math.round(100 * complete.length / filtered.length)}%` : '—'], ['Average completion time', average], ['Interrupted', filtered.filter(row => row.status === 'interrupted').length]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </section>
    <p className="note">Completion rate uses all filtered rounds, including interruptions. Average time includes only finished rounds that reached their target.</p>
    {!filtered.length ? <p className="empty" role="status">No rounds match these filters.</p> : <section className="charts" aria-label="Visualisations">
      <div><h2>Rounds by day <small>UTC+8</small></h2><div className="daily">{daily.map(({ day, count }) => <div className="bar-row" key={day}><span>{day}</span><div className="track"><div className="bar" style={{ width: `${100 * count / maxDay}%` }} /></div><strong>{count}</strong></div>)}</div></div>
      <div><h2>Outcome breakdown</h2>{Object.entries(labels).map(([key, label]) => {
        const count = filtered.filter(row => row.outcome === key).length
        return <div className="outcome" key={key}><div><span>{label}</span><strong>{count} · {(100 * count / filtered.length).toFixed(0)}%</strong></div><div className="track"><div className={`bar ${key}`} style={{ width: `${100 * count / filtered.length}%` }} /></div></div>
      })}<p className="note">Incomplete includes interrupted rounds and timeouts.</p></div>
    </section>}
    <section><h2>Round details <small>{filtered.length} of {results.length} rounds</small></h2>
      <div className="table-wrap"><table><caption>Newest rounds first. Start time in UTC+8; duration in seconds.</caption><thead><tr>{['Started (UTC+8)', 'Device', 'Cycles', 'Outcome', 'Duration', 'Status', 'Interruption reason'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(row => <tr key={row.id}><td>{localTime(row.started)}</td><td title={row.device}>Device {devices.indexOf(row.device) + 1}<small className="device-id">{row.device}</small></td><td>{row.cycles} / {row.target}</td><td>{labels[row.outcome]}</td><td>{row.seconds.toFixed(1)} s</td><td>{row.status}</td><td>{row.reason.replaceAll('_', ' ') || '—'}</td></tr>)}</tbody></table></div>
      <nav aria-label="Table pagination"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage + 1} of {pages}</span><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></nav>
    </section>
  </main>
}

createRoot(document.getElementById('root')!).render(<Dashboard />)
