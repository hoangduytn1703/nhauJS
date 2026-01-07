import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/nhauJS/', // Cần thiết để chạy trên GitHub Pages repo nhauJS
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})