import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:4000',
        changeOrigin: false,
        secure: false,
        ws: true,
      },
      '/graphql': {
        target: 'http://localhost:4000',
        changeOrigin: false,
        secure: false,
      },
    },
  },
})
