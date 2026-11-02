import { build } from 'vite'
import { copyFile, cp } from 'node:fs/promises'

// Separate artifact: no game entry, videos, detector, or local-writing server.
await build({
  configFile: false,
  base: './',
  build: {
    outDir: 'dashboard-dist',
    copyPublicDir: false,
    rollupOptions: { input: 'offline-results.html' },
  },
})
await cp('public/fonts', 'dashboard-dist/fonts', { recursive: true })
await copyFile('dashboard-dist/offline-results.html', 'dashboard-dist/index.html')
