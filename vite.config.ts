import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'redirect-base',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/nhaujs') {
            res.statusCode = 301;
            res.setHeader('Location', '/nhaujs/');
            res.end();
          } else {
            next();
          }
        });
      }
    }
  ],
  base: '/nhaujs/',
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