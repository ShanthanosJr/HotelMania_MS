import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Where the dev server forwards /api and /uploads. Override with VITE_API_PROXY in Client/.env.local
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY || 'http://localhost:5050'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: false },
        '/uploads': { target: apiTarget, changeOrigin: true, secure: false },
      },
      hmr: {
        overlay: false,
      },
    },
  }
})
