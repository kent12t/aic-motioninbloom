import { defineConfig } from 'vite'
import { createTrackingMiddleware } from './server/offlineTracking.ts'

export default defineConfig({
  plugins: [{
    name: 'local-result-tracking',
    configureServer(server) {
      server.middlewares.use(createTrackingMiddleware(server.config.root))
    },
    configurePreviewServer(server) {
      server.middlewares.use(createTrackingMiddleware(server.config.root))
    },
  }],
})
