import { defineConfig } from 'vite';
import { resolve } from 'path';

function multiPageMiddleware() {
  return {
    name: 'multi-page-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0];
        if (url === '/about' || url === '/about/') {
          req.url = '/about/index.html';
        } else if (url === '/competition' || url === '/competition/') {
          req.url = '/competition/index.html';
        } else if (url === '/contact' || url === '/contact/') {
          req.url = '/contact/index.html';
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [multiPageMiddleware()],
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
