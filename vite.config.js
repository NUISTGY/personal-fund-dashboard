import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function yahooQuoteJsonpPlugin() {
  const handleYahooJsonp = async (request, response, next) => {
    if (!request.url?.startsWith('/api/yahoo-jsonp')) {
      next();
      return;
    }

    const requestUrl = new URL(request.url, 'http://localhost');
    const callback = requestUrl.searchParams.get('cb') || '';
    const symbol = requestUrl.searchParams.get('symbol') || '';
    const safeCallback = /^[A-Za-z_$][\w$]*$/.test(callback) ? callback : '';

    response.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    if (!safeCallback || !symbol) {
      response.statusCode = 400;
      response.end('void 0;');
      return;
    }

    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
      const yahooResponse = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const payload = await yahooResponse.text();
      response.end(`${safeCallback}(${payload});`);
    } catch {
      response.statusCode = 502;
      response.end(`${safeCallback}({});`);
    }
  };

  return {
    name: 'yahoo-quote-jsonp',
    configureServer(server) {
      server.middlewares.use(handleYahooJsonp);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleYahooJsonp);
    },
  };
}

export default defineConfig({
  plugins: [react(), yahooQuoteJsonpPlugin()],
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['echarts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
