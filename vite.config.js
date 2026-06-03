import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const investmentRecordsFile = path.resolve(process.cwd(), 'data/investment-records.json');

function normalizeInvestmentRecord(record) {
  return {
    id: String(record.id || randomUUID()),
    type: record.type === 'sell' ? 'sell' : 'buy',
    date: String(record.date || ''),
    fundCode: String(record.fundCode || '').replace(/\D/g, '').slice(0, 6),
    amount: Number(record.amount),
    nav: Number(record.nav ?? record.buyNav),
    navDate: String(record.navDate || record.buyNavDate || record.date || ''),
  };
}

function normalizeInvestmentRecords(records) {
  if (!Array.isArray(records)) return [];
  return records
    .map(normalizeInvestmentRecord)
    .filter((record) => (
      record.date
      && record.fundCode
      && Number.isFinite(record.amount)
      && record.amount > 0
      && Number.isFinite(record.nav)
      && record.nav > 0
    ));
}

async function ensureInvestmentRecordsFile() {
  await mkdir(path.dirname(investmentRecordsFile), { recursive: true });
  try {
    await readFile(investmentRecordsFile, 'utf-8');
  } catch {
    await writeFile(investmentRecordsFile, '[]\n', 'utf-8');
  }
}

async function readInvestmentRecordsFile() {
  await ensureInvestmentRecordsFile();
  const raw = await readFile(investmentRecordsFile, 'utf-8');
  return normalizeInvestmentRecords(JSON.parse(raw || '[]'));
}

async function writeInvestmentRecordsFile(records) {
  await ensureInvestmentRecordsFile();
  const normalized = normalizeInvestmentRecords(records);
  await writeFile(investmentRecordsFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');
  return normalized;
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf-8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function investmentRecordsPlugin() {
  const handleInvestmentRecords = async (request, response, next) => {
    if (!request.url?.startsWith('/api/investment-records')) {
      next();
      return;
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      if (request.method === 'GET') {
        const records = await readInvestmentRecordsFile();
        response.end(JSON.stringify({ records }));
        return;
      }

      if (request.method === 'PUT') {
        const payload = await readRequestJson(request);
        const records = await writeInvestmentRecordsFile(payload?.records || payload || []);
        response.end(JSON.stringify({ records }));
        return;
      }

      response.statusCode = 405;
      response.end(JSON.stringify({ error: 'method_not_allowed' }));
    } catch {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: 'investment_records_io_failed' }));
    }
  };

  return {
    name: 'investment-records-json',
    configureServer(server) {
      server.middlewares.use(handleInvestmentRecords);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleInvestmentRecords);
    },
  };
}

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
  plugins: [react(), investmentRecordsPlugin(), yahooQuoteJsonpPlugin()],
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
