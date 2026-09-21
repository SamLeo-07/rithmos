import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 8008,
    open: false,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'),
        competition: resolve(__dirname, 'competition/index.html'),
        contact: resolve(__dirname, 'contact/index.html')
      }
    }
  }
});
