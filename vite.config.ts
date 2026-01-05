import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/nhauJS/', // Cần thiết để chạy trên GitHub Pages repo nhauJS
})