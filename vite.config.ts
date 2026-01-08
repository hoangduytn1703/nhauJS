import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
  ],
  base: './', // Dùng đường dẫn tương đối để "bất tử" trên GitHub Pages
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
  rollupOptions: {
    output: {
      manualChunks: {
        firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        vendor: ['react', 'react-dom', 'react-router'],
      }
    }
  }
}
})