import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * The dashboard calls the API on its own origin, under /api, and the dev and
 * preview servers pass those requests to the Spring Boot API. The browser then
 * never makes a cross-origin request, so the API needs no CORS configuration.
 * SENTINEL_API_URL points it elsewhere, as it does for the simulator.
 */
const api = process.env.SENTINEL_API_URL ?? 'http://localhost:8080'

/*
 * The alert socket comes first, because the first matching prefix wins. It
 * keeps the browser's own Host header, so the API's same-origin check on the
 * handshake sees the page's origin and passes, without a CORS setting.
 */
const apiProxy = {
  '/api/ws': { target: api, ws: true },
  '/api': { target: api, changeOrigin: true },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
