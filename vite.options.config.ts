import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isProd = process.argv.includes('--configProd');
const distDir = isProd ? 'dist-prod' : 'dist';

export default defineConfig({
  root: 'src/options',
  base: './',
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/options'),
    },
  },
  build: {
    outDir: `../../${distDir}/options`,
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/options/options.html')
    }
  },
});
