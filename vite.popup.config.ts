import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isProd = process.env.PROD === 'true';
const distDir = isProd ? 'dist-prod' : 'dist';

export default defineConfig({
  root: 'src/popup',
  base: './',
  plugins: [
    react(),
    {
      name: 'remove-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin(=["'][^"']*["'])?/g, '');
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/popup'),
    },
  },
  build: {
    outDir: `../../${distDir}/popup`,
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/popup/popup.html')
    }
  },
});
