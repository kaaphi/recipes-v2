import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // Your backend server URL
        changeOrigin: true,              // Ensures the request appears to come from the frontend server
        rewrite: (path) => path.replace(/^\/api/, ''), // Optional: removes '/api' prefix before forwarding
      },
    },
  },
})
