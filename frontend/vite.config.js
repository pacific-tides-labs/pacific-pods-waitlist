import { defineConfig } from 'vite';
import { resolve } from 'path';

const cleanUrls = () => ({
  name: 'clean-urls',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/checker') req.url = '/checker/index.html';
      if (req.url === '/stake') req.url = '/stake/index.html';
      next();
    });
  }
});

export default defineConfig({
  plugins: [cleanUrls()],
  server: {
    port: 5173, // Local dev port so it doesn't conflict with your backend port 4000
    proxy: {
      // Proxies API or EJS requests to your backend locally
      '/api': 'http://localhost:4000' 
    }
  },
  build: {
    outDir: 'dist', // This is where production static assets will land
    rollupOptions: {
      input: {
        checker: resolve(__dirname, 'checker/index.html'),
        stake: resolve(__dirname, 'stake/index.html')
      }
    }
  }
});
