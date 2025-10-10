import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allow access from network (other devices)
    port: 5173, // keep your dev port
    strictPort: false, 
    allowedHosts: [
      'superofficiously-untraditional-shan.ngrok-free.dev', // your ngrok URL
      'localhost', // optional for local dev
    ],
  },
});
