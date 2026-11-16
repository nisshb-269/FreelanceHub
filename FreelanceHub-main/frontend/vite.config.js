import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://freelancehub-api-lnj2.onrender.com',
        changeOrigin: true,
        secure: false,
        headers: {
          origin: 'https://freelancehub-web-9e58.onrender.com',
        },
      },
      '/socket.io': {
        target: 'https://freelancehub-api-lnj2.onrender.com',
        changeOrigin: true,
        ws: true,
        secure: false,
        headers: {
          origin: 'https://freelancehub-web-9e58.onrender.com',
        },
      },
    },
  },
});
