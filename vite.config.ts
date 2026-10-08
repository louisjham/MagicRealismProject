import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Required for Quest Browser when served from Vercel (relative assets)
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    // HTTPS is required for WebXR — use localhost which is a secure context in Chrome/Quest
    // For remote testing: vite preview --host then connect Quest to local network
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});
