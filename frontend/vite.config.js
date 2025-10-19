import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
   build: {
    outDir: 'dist'
  },
  // Add this for proper routing
  base: './',
  // Optional: For better SPA support
  server: {
    historyApiFallback: true
  }
})
