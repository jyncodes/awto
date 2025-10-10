import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allow access from network (other devices)
    port: 5173,
    strictPort: false,
    allowedHosts: [
      'stauroscopically-nonenunciatory-remi.ngrok-free.dev', // 👈 your current ngrok URL
      'superofficiously-untraditional-shan.ngrok-free.dev',  // (keep old one if still used)
      'localhost',
    ],
  },
});
