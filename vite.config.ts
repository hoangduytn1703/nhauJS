import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Đã xóa base: '/nhauJS/' để chạy ở root domain bình thường
})