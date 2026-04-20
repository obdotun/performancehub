import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Toutes les requêtes API → backend
      '/api': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
    },
  },
})