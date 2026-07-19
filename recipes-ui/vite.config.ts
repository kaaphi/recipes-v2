import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import removeConsole from 'vite-plugin-remove-console';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({ 
      // This forces Vite to process SVGs as React components when '?react' is appended
      svgrOptions: { exportType: 'default', ref: true },
    }),
    removeConsole()
  ],
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
