import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isProd = process.env.PROD === 'true';
const distDir = isProd ? 'dist-prod' : 'dist';

export default defineConfig({
  root: 'src/notifications',
  base: './',
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/notifications'),
    },
  },
  build: {
    outDir: `../../${distDir}/notifications`,
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/notifications/offscreen.html')
    }
  },
});
