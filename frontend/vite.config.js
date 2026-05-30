import { defineConfig } from 'vite';
import { resolve } from 'path';

// Custom plugin to map clean URLs to your HTML files
const cleanUrls = () => ({
  name: 'clean-urls',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // If they go to /checker, serve checker.html
      if (req.url === '/checker') req.url = '/checker/index.html';
      // If they go to /stake, serve stake.html
      if (req.url === '/stake') req.url = '/stake/index.html';
      next();
    });
  }
});

export default defineConfig({
  plugins: [cleanUrls()], // 1. Add the custom plugin
  server: {
    port: 4000
  },
  build: {
    rollupOptions: {
      input: {
        // 2. Tell the production builder about both files
        checker: resolve(__dirname, 'checker/index.html'),
        stake: resolve(__dirname, 'stake/index.html')
      }
    }
  }
});
