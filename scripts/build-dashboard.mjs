import { build } from 'vite'
import { copyFile, cp, readFile } from 'node:fs/promises'
import ts from 'typescript'

const code = ts.transpileModule(await readFile('src/analytics/data.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const { parseCsv, localDate } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

// Separate artifact: no game entry, videos, detector, or local-writing server.
await build({
  configFile: false,
  base: './',
  plugins: [{
    name: 'dashboard-date-snapshot',
    enforce: 'pre',
    async load(id) {
      if (!id.replaceAll('\\', '/').includes('/offline-results/') || !id.endsWith('.csv?raw')) return
      const [headers, ...rows] = parseCsv((await readFile(id.slice(0, -4), 'utf8')).replace(/^\uFEFF/, ''))
      const dateIndex = headers.indexOf('time_start_iso')
      const selected = rows.filter(row => Number.isFinite(Date.parse(row[dateIndex])) &&
        ['2026-10-30', '2026-10-31'].includes(localDate(row[dateIndex])))
      const csv = [headers, ...selected].map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
      return `export default ${JSON.stringify(csv)}`
    },
  }],
  build: {
    outDir: 'dashboard-dist',
    copyPublicDir: false,
    rollupOptions: { input: 'offline-results.html' },
  },
})
await cp('public/fonts', 'dashboard-dist/fonts', { recursive: true })
await copyFile('dashboard-dist/offline-results.html', 'dashboard-dist/index.html')
