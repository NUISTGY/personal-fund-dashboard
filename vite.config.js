import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const investmentRecordsFile = path.resolve(process.cwd(), 'data/investment-records.json');
const watchFundsFile = path.resolve(process.cwd(), 'data/watch-funds.json');
const promptTemplateFile = path.resolve(process.cwd(), 'src/prompt.md');

function normalizeFundCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function normalizeWatchFund(fund) {
  const code = normalizeFundCode(fund.code);
  return {
    code,
    name: String(fund.name || fund.shortName || `基金 ${code}`),
    shortName: String(fund.shortName || fund.name || `基金 ${code}`).slice(0, 16),
    tags: Array.isArray(fund.tags) && fund.tags.length ? fund.tags.map(String) : ['自选', '待分类'],
    group: String(fund.group || '自选基金'),
    risk: String(fund.risk || '待评估'),
    note: String(fund.note || '由搜索栏加入的自选基金。'),
  };
}

function normalizeWatchFunds(funds) {
  if (!Array.isArray(funds)) return [];
  const unique = new Map();
  funds.forEach((fund) => {
    const normalized = normalizeWatchFund(fund || {});
    if (normalized.code.length === 6) unique.set(normalized.code, normalized);
  });
  return Array.from(unique.values());
}

function normalizeInvestmentRecord(record) {
  return {
    id: String(record.id || randomUUID()),
    type: record.type === 'sell' ? 'sell' : 'buy',
    date: String(record.date || ''),
    fundCode: String(record.fundCode || '').replace(/\D/g, '').slice(0, 6),
    amount: Number(record.amount),
    nav: Number(record.nav ?? record.buyNav),
    navDate: String(record.navDate || record.buyNavDate || record.date || ''),
    createdAt: String(record.createdAt || ''),
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

async function ensureWatchFundsFile() {
  await mkdir(path.dirname(watchFundsFile), { recursive: true });
  try {
    await readFile(watchFundsFile, 'utf-8');
  } catch {
    await writeFile(watchFundsFile, '[]\n', 'utf-8');
  }
}

async function readWatchFundsFile() {
  await ensureWatchFundsFile();
  const raw = await readFile(watchFundsFile, 'utf-8');
  return normalizeWatchFunds(JSON.parse(raw || '[]'));
}

async function writeWatchFundsFile(funds) {
  await ensureWatchFundsFile();
  const normalized = normalizeWatchFunds(funds);
  await writeFile(watchFundsFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');
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

function watchFundsPlugin() {
  const handleWatchFunds = async (request, response, next) => {
    if (!request.url?.startsWith('/api/watch-funds')) {
      next();
      return;
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      if (request.method === 'GET') {
        const funds = await readWatchFundsFile();
        response.end(JSON.stringify({ funds }));
        return;
      }

      if (request.method === 'PUT') {
        const payload = await readRequestJson(request);
        const funds = await writeWatchFundsFile(payload?.funds || payload || []);
        response.end(JSON.stringify({ funds }));
        return;
      }

      response.statusCode = 405;
      response.end(JSON.stringify({ error: 'method_not_allowed' }));
    } catch {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: 'watch_funds_io_failed' }));
    }
  };

  return {
    name: 'watch-funds-json',
    configureServer(server) {
      server.middlewares.use(handleWatchFunds);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleWatchFunds);
    },
  };
}

function promptTemplatePlugin() {
  const handlePromptTemplate = async (request, response, next) => {
    if (!request.url?.startsWith('/api/prompt-template')) {
      next();
      return;
    }

    response.setHeader('Content-Type', 'text/markdown; charset=utf-8');

    try {
      const template = await readFile(promptTemplateFile, 'utf-8');
      response.end(template);
    } catch {
      response.statusCode = 404;
      response.end('');
    }
  };

  return {
    name: 'prompt-template-md',
    configureServer(server) {
      server.middlewares.use(handlePromptTemplate);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handlePromptTemplate);
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
    const requestedRange = requestUrl.searchParams.get('range') || '1d';
    const requestedInterval = requestUrl.searchParams.get('interval') || '1m';
    const allowedRanges = ['1d', '2d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'];
    const allowedIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1d', '5d', '1wk', '1mo'];
    const range = allowedRanges.includes(requestedRange) ? requestedRange : '1d';
    const interval = allowedIntervals.includes(requestedInterval) ? requestedInterval : '1m';
    const includePrePost = requestUrl.searchParams.get('includePrePost') === 'false' ? 'false' : 'true';
    const safeCallback = /^[A-Za-z_$][\w$]*$/.test(callback) ? callback : '';

    response.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    if (!safeCallback || !symbol) {
      response.statusCode = 400;
      response.end('void 0;');
      return;
    }

    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=${includePrePost}`;
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

function eastmoneyStockProxyPlugin() {
  const allowedPaths = new Set(['get', 'trends2/get', 'kline/get']);
  const upstreams = {
    market: ['https://push2delay.eastmoney.com/api/qt/stock', 'https://push2.eastmoney.com/api/qt/stock'],
    history: ['https://push2his.eastmoney.com/api/qt/stock', 'https://push2.eastmoney.com/api/qt/stock'],
  };

  const requestUpstream = async (baseUrl, apiPath, params) => {
    const target = `${baseUrl}/${apiPath}?${params.toString()}`;
    const upstreamResponse = await fetch(target, {
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://quote.eastmoney.com/',
      },
    });
    if (!upstreamResponse.ok) throw new Error(`eastmoney ${upstreamResponse.status}`);
    const raw = await upstreamResponse.text();
    const match = raw.match(/^[\w$]+\(([\s\S]*)\);?$/);
    const payload = match ? match[1] : raw;
    if (!payload.trim()) throw new Error('eastmoney empty payload');
    return JSON.parse(payload);
  };

  const handleEastmoneyStock = async (request, response, next) => {
    if (!request.url?.startsWith('/api/eastmoney-stock')) {
      next();
      return;
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    const requestUrl = new URL(request.url, 'http://localhost');
    const apiPath = requestUrl.searchParams.get('path') || '';
    const source = requestUrl.searchParams.get('source') === 'history' ? 'history' : 'market';
    requestUrl.searchParams.delete('path');
    requestUrl.searchParams.delete('source');
    requestUrl.searchParams.delete('cb');

    if (!allowedPaths.has(apiPath)) {
      response.statusCode = 400;
      response.end(JSON.stringify({ rc: -1, error: 'bad_path' }));
      return;
    }

    for (const baseUrl of upstreams[source]) {
      try {
        const data = await requestUpstream(baseUrl, apiPath, requestUrl.searchParams);
        response.end(JSON.stringify(data));
        return;
      } catch {
        // Try next domestic upstream.
      }
    }

    response.statusCode = 502;
    response.end(JSON.stringify({ rc: -1, error: 'eastmoney_unavailable' }));
  };

  return {
    name: 'eastmoney-stock-proxy',
    configureServer(server) {
      server.middlewares.use(handleEastmoneyStock);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleEastmoneyStock);
    },
  };
}

function sinaUsProxyPlugin() {
  const parseJsonpArray = (raw) => {
    const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const match = cleaned.match(/=\s*\(([\s\S]*)\);?\s*$/);
    if (!match) throw new Error('bad sina jsonp');
    return JSON.parse(match[1]);
  };

  const handleSinaUs = async (request, response, next) => {
    if (!request.url?.startsWith('/api/sina-us')) {
      next();
      return;
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    const requestUrl = new URL(request.url, 'http://localhost');
    const kind = requestUrl.searchParams.get('kind') || '';
    const symbol = requestUrl.searchParams.get('symbol') || '';

    try {
      if (kind === 'quote') {
        const sinaResponse = await fetch(`https://hq.sinajs.cn/list=${encodeURIComponent(symbol)}`, {
          headers: {
            Accept: '*/*',
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://finance.sina.com.cn/',
          },
        });
        const buffer = await sinaResponse.arrayBuffer();
        const raw = new TextDecoder('gb18030').decode(buffer);
        const match = raw.match(/="([\s\S]*)";?\s*$/);
        const fields = match ? match[1].split(',') : [];
        response.end(JSON.stringify({ fields }));
        return;
      }

      if (kind === 'min' || kind === 'daily') {
        const api = kind === 'min' ? 'US_MinKService.getMinK' : 'US_MinKService.getDailyK';
        const url = `https://stock.finance.sina.com.cn/usstock/api/jsonp.php/var%20sina_data=/${api}?symbol=${encodeURIComponent(symbol)}${kind === 'min' ? '&type=1' : ''}`;
        const sinaResponse = await fetch(url, {
          headers: {
            Accept: '*/*',
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://finance.sina.com.cn/',
          },
        });
        const raw = await sinaResponse.text();
        const rows = parseJsonpArray(raw);
        response.end(JSON.stringify({ rows: Array.isArray(rows) ? rows : [] }));
        return;
      }

      response.statusCode = 400;
      response.end(JSON.stringify({ error: 'bad_kind' }));
    } catch {
      response.statusCode = 502;
      response.end(JSON.stringify({ error: 'sina_unavailable' }));
    }
  };

  return {
    name: 'sina-us-proxy',
    configureServer(server) {
      server.middlewares.use(handleSinaUs);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleSinaUs);
    },
  };
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' || process.env.CAPACITOR_BUILD === 'true' ? './' : '/',
  plugins: [react(), investmentRecordsPlugin(), watchFundsPlugin(), promptTemplatePlugin(), yahooQuoteJsonpPlugin(), eastmoneyStockProxyPlugin(), sinaUsProxyPlugin()],
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
