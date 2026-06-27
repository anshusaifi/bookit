import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // needed for Docker to expose the port
    proxy: {
      '/api': {
        // In Docker: VITE_PROXY_TARGET=http://backend:5000
        // Locally:   falls back to http://localhost:5000
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
