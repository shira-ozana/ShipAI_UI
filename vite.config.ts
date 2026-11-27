import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Paths are forwarded unchanged (no prefix rewrite). The first matching key wins, so the
 * specific `/api/init` entry must stay above the `/api` catch-all.
 *  - `/api/init`: Generic Agent API (direct INIT agent), port 3000 — legacy / chat-adjacent.
 *  - `/api` (users, repositories, features, `/api/agents/...`): Platform Backend, port 8000.
 *    Init from Repository Details uses `/api/agents/init/*` on this catch-all, not `/api/init`.
 */
const API_PROXY = {
  '/api/init': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
  },
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: { proxy: API_PROXY },
  preview: { proxy: API_PROXY },
})
