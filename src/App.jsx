import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import {
  BarChart,
  GaugeChart,
  LineChart as EChartsLineChart,
  PieChart,
} from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import {
  Activity,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  Layers3,
  LineChart,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import promptTemplateMarkdown from './prompt.md?raw';

const DEFAULT_FUNDS = [
  {
    code: '006373',
    name: '国富全球科技互联混合（QDII）人民币A',
    shortName: '全球科技互联',
    tags: ['QDII', '科技成长', '高波动'],
    group: '全球科技',
    risk: '高',
    note: '聚焦全球科技与互联网主题。',
  },
  {
    code: '000218',
    name: '国泰黄金ETF联接A',
    shortName: '黄金联接',
    tags: ['商品', '避险资产', '指数基金'],
    group: '商品配置',
    risk: '中',
    note: '用于组合中黄金资产暴露。',
  },
  {
    code: '008163',
    name: '南方红利低波50ETF联接A',
    shortName: '红利低波',
    tags: ['红利', '低波动', '指数基金'],
    group: 'A股红利',
    risk: '中',
    note: '偏向红利与低波动风格。',
  },
  {
    code: '017482',
    name: '博时中证全指电力公用事业ETF联接C',
    shortName: '电力公用',
    tags: ['电力', '公用事业', '指数基金'],
    group: '行业主题',
    risk: '中高',
    note: '覆盖电力与公用事业行业。',
  },
  {
    code: '021662',
    name: '国富亚洲机会股票（QDII）C',
    shortName: '亚洲机会',
    tags: ['QDII', '亚洲市场', '股票型'],
    group: '海外区域',
    risk: '高',
    note: '覆盖亚洲市场股票机会。',
  },
  {
    code: '017731',
    name: '嘉实全球产业升级股票（QDII）C',
    shortName: '全球产业升级',
    tags: ['QDII', '产业升级', '高夏普'],
    group: '全球成长',
    risk: '高',
    note: '偏向全球产业升级与成长方向。',
  },
  {
    code: '016453',
    name: '南方纳斯达克100指数（QDII）C',
    shortName: '纳指100',
    tags: ['QDII', '纳斯达克', '指数基金'],
    group: '美股指数',
    risk: '高',
    note: '跟踪纳斯达克100指数相关资产。',
  },
];

echarts.use([
  CanvasRenderer,
  BarChart,
  GaugeChart,
  EChartsLineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
]);

const FALLBACK_QUOTES = {
  '006373': { dwjz: '7.5253', gszzl: '-0.83', gztime: '2026-05-29 00:00', jzrq: '2026-05-29' },
  '000218': { dwjz: '3.5470', gszzl: '-0.38', gztime: '2026-05-29 00:00', jzrq: '2026-05-29' },
  '008163': { dwjz: '1.0759', gszzl: '1.18', gztime: '2026-05-29 00:00', jzrq: '2026-05-29' },
  '017482': { dwjz: '1.3712', gszzl: '1.28', gztime: '2026-05-29 00:00', jzrq: '2026-05-29' },
  '021662': { dwjz: '3.1677', gszzl: '2.00', gztime: '2026-05-29 00:00', jzrq: '2026-05-29' },
  '017731': { dwjz: '4.1168', gszzl: '-2.28', gztime: '2026-05-29 00:00', jzrq: '2026-05-29' },
  '016453': { dwjz: '2.3579', gszzl: '0.26', gztime: '2026-05-29 00:00', jzrq: '2026-05-29' },
};

const RANGE_OPTIONS = [
  { label: '1月', days: 22 },
  { label: '3月', days: 66 },
  { label: '6月', days: 132 },
  { label: '12月', days: 252 },
];

const NIGHT_MARKET_SIGNALS = [
  { key: 'nasdaq', symbol: '^NDX', domesticSecid: '100.NDX', domesticCode: 'NDX', venue: 'Nasdaq', name: '纳指100', role: '纳斯达克 100 指数' },
  { key: 'nasdaqFuture', symbol: 'NQ=F', domesticSecid: '103.NQ00Y', domesticCode: 'NQ00Y', venue: 'CME', name: '纳指100期货', role: '纳斯达克 100 E-mini 期货' },
  { key: 'vxn', symbol: '^VXN', name: 'VXN', role: '纳指波动率指数' },
];

const RSI_SIGNAL_CONFIG = {
  key: 'rsi14',
  symbol: 'RSI',
  name: 'RSI(14)',
  role: '纳指相对强弱指数',
  min: 0,
  max: 100,
  scaleMarks: [
    { value: 30, label: '30' },
    { value: 50, label: '50' },
    { value: 70, label: '70' },
  ],
};

const NDX_TREND_RANGE_OPTIONS = [
  { key: 'day', label: '日', rangeLabel: '最近交易时段', intervalLabel: '1分钟级行情', visiblePoints: 391, historyLimit: 520 },
  { key: 'week', label: '周', rangeLabel: '近一周', intervalLabel: '日线行情', visiblePoints: 6, historyLimit: 260 },
  { key: 'month', label: '月', rangeLabel: '近一月', intervalLabel: '日线行情', visiblePoints: 22, historyLimit: 320 },
  { key: 'year', label: '年', rangeLabel: '近一年', intervalLabel: '日线行情', visiblePoints: 252, historyLimit: 520 },
  { key: 'fiveYear', label: '五年', rangeLabel: '近五年', intervalLabel: '日线行情', visiblePoints: 1260, historyLimit: 1520 },
];

const DEFAULT_NDX_TREND_RANGE = NDX_TREND_RANGE_OPTIONS[0].key;

const MAGNIFICENT_SEVEN = [
  { key: 'AAPL', symbol: 'AAPL', domesticSecid: '105.AAPL', name: '苹果' },
  { key: 'MSFT', symbol: 'MSFT', domesticSecid: '105.MSFT', name: '微软' },
  { key: 'NVDA', symbol: 'NVDA', domesticSecid: '105.NVDA', name: '英伟达' },
  { key: 'AMZN', symbol: 'AMZN', domesticSecid: '105.AMZN', name: '亚马逊' },
  { key: 'META', symbol: 'META', domesticSecid: '105.META', name: 'Meta' },
  { key: 'GOOGL', symbol: 'GOOGL', domesticSecid: '105.GOOGL', name: '谷歌' },
  { key: 'TSLA', symbol: 'TSLA', domesticSecid: '105.TSLA', name: '特斯拉' },
];

const NIGHT_REFRESH_INTERVAL = 8000;
const DCA_STRATEGY_PARAMS = {
  base: 40,
  dynamicBudget: 60,
  dailyCap: 100,
  weights: { ma200: 0.3, drawdown: 0.5, volatility: 0.2 },
};
const VOLATILITY_FALLBACK_SEED = {
  vxn: { ...NIGHT_MARKET_SIGNALS[2], price: 26.31, previousClose: 28.56, change: -7.8782, timestamp: new Date(2026, 5, 18, 16, 0, 0).getTime(), marketSession: '最近收盘', sourceLabel: 'Cboe' },
};

function isNativeDashboardRuntime() {
  return Capacitor.isNativePlatform()
    || (typeof document !== 'undefined' && document.documentElement.classList.contains('capacitor-native'));
}

const INVESTMENT_COLORS = ['#ff4b63', '#24ff72', '#7affaa', '#ff3158', '#86dca6', '#d8ffe8', '#0eb85b'];
const MAX_HISTORY_DAYS = Math.max(...RANGE_OPTIONS.map((item) => item.days || 0));
const INVESTMENT_RECORDS_KEY = 'fund-terminal-investment-records-v1';
const INVESTMENT_RECORDS_API = '/api/investment-records';
const PROMPT_TEMPLATE_API = '/api/prompt-template';
const WATCH_FUNDS_KEY = 'fund-terminal-watch-funds-v1';
const WATCH_FUNDS_API = '/api/watch-funds';
const HOLDING_PERIODS = [
  { year: '', month: '' },
  { year: '2026', month: '3' },
  { year: '2025', month: '12' },
  { year: '2025', month: '6' },
  { year: '2024', month: '12' },
];

let apidataQueue = Promise.resolve();

function requestApidataScript(src, errorPrefix) {
  const task = () => new Promise((resolve, reject) => {
    const previous = window.apidata;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${errorPrefix} timeout`));
    }, 8000);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      window.apidata = previous;
    };

    window.apidata = undefined;
    script.src = src;
    script.onload = () => {
      const data = window.apidata;
      cleanup();
      if (!data?.content) {
        reject(new Error(`${errorPrefix} empty`));
        return;
      }
      resolve(data.content);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error(`${errorPrefix} request failed`));
    };
    document.body.appendChild(script);
  });

  const run = apidataQueue.then(task, task);
  apidataQueue = run.catch(() => {});
  return run;
}

function jsonpQuote(code) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonpgz';
    const previous = window[callbackName];
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('quote timeout'));
    }, 8000);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      window[callbackName] = previous;
    };

    window[callbackName] = (payload) => {
      if (payload?.fundcode !== code) return;
      cleanup();
      resolve(payload);
    };

    script.src = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('quote request failed'));
    };
    document.body.appendChild(script);
  });
}

function parseHistoryRows(content) {
  const doc = new DOMParser().parseFromString(content, 'text/html');
  return Array.from(doc.querySelectorAll('tbody tr'))
    .map((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim());
      return {
        date: cells[0],
        nav: Number(cells[1]),
        accumulative: Number(cells[2]),
        change: Number((cells[3] || '').replace('%', '')),
      };
    })
    .filter((item) => item.date && Number.isFinite(item.nav));
}

function historyPageScript(code, page, per) {
  return requestApidataScript(
    `https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code=${code}&page=${page}&per=${per}&sdate=&edate=&rt=${Math.random()}`,
    'history',
  ).then(parseHistoryRows);
}

async function historyScript(code, count) {
  const per = 20;
  const pages = Math.ceil(count / per);
  const rows = [];

  for (let page = 1; page <= pages; page += 1) {
    const pageRows = await historyPageScript(code, page, per);
    rows.push(...pageRows);
    if (pageRows.length < per) break;
  }

  return rows.slice(0, count).reverse();
}

function parseStockHoldings(content) {
  const doc = new DOMParser().parseFromString(content, 'text/html');
  const date = doc.querySelector('.xq505 font')?.textContent.trim() || '--';
  const headers = Array.from(doc.querySelectorAll('thead th')).map((cell) => cell.textContent.replace(/\s+/g, '').trim());
  const headerIndex = (pattern, fallback) => {
    const index = headers.findIndex((header) => pattern.test(header));
    return index >= 0 ? index : fallback;
  };
  const codeIndex = headerIndex(/股票代码/, 1);
  const nameIndex = headerIndex(/股票名称/, 2);
  const changeIndex = headerIndex(/涨跌幅/, -1);
  const ratioIndex = headerIndex(/占净值/, 4);
  const sharesIndex = headerIndex(/持股数/, 5);
  const valueIndex = headerIndex(/持仓市值/, 6);
  const rows = Array.from(doc.querySelectorAll('tbody tr'))
    .map((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      const codeCell = cells[codeIndex];
      const nameCell = cells[nameIndex];
      const quotePath = codeCell?.querySelector('a')?.getAttribute('href')?.match(/unify\/r\/([^'"]+)/)?.[1]
        || nameCell?.querySelector('a')?.getAttribute('href')?.match(/unify\/r\/([^'"]+)/)?.[1]
        || '';
      const code = codeCell?.textContent.trim() || '';
      const name = nameCell?.textContent.trim() || '';
      const ratio = cells[ratioIndex]?.textContent.trim() || '--';
      const shares = cells[sharesIndex]?.textContent.trim() || '--';
      const value = cells[valueIndex]?.textContent.trim() || '--';
      const change = changeIndex >= 0 ? Number(cells[changeIndex]?.textContent.replace('%', '')) : null;

      return { code, name, quotePath, ratio, shares, value, change, price: null };
    })
    .filter((item) => item.code && item.name);

  return { date, rows: rows.slice(0, 10) };
}

function uniqueList(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function yahooSymbolCandidates(row) {
  const rawCode = String(row.code || '').trim().toUpperCase();
  const quotePath = String(row.quotePath || '').trim();
  const numericCode = rawCode.replace(/\D/g, '');
  const candidates = [];

  if (/^[A-Z]{1,6}$/.test(rawCode)) {
    candidates.push(rawCode);
  }

  if (quotePath.startsWith('105.') && /^[A-Z]{1,6}$/.test(rawCode)) {
    candidates.push(rawCode);
  }

  if (/^\d{4}$/.test(rawCode)) {
    candidates.push(`${rawCode}.TW`, `${rawCode}.HK`);
  }

  if (/^\d{5}$/.test(rawCode)) {
    candidates.push(`${rawCode}.HK`);
  }

  if (/^\d{6}$/.test(rawCode)) {
    candidates.push(`${rawCode}.KS`, `${rawCode}.KQ`);
  }

  if (/JP$/i.test(rawCode) && numericCode) {
    candidates.push(`${numericCode}.T`);
  }

  if (/^68\d{4}$/.test(rawCode)) {
    candidates.push(`${rawCode}.SS`);
  }

  if (rawCode === '09988') {
    candidates.unshift('9988.HK');
  }

  return uniqueList(candidates);
}

function isValidMarketNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function normalizeYahooQuote(result) {
  const meta = result?.meta || {};
  const quote = result?.indicators?.quote?.[0] || {};
  const closeSeries = Array.isArray(quote.close) ? quote.close : [];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  let latestIndex = closeSeries.length - 1;
  while (latestIndex >= 0 && !isValidMarketNumber(closeSeries[latestIndex])) latestIndex -= 1;
  const latestPrice = latestIndex >= 0 ? Number(closeSeries[latestIndex]) : null;
  const metaPrice = Number(meta.regularMarketPrice);
  const price = isValidMarketNumber(metaPrice)
    ? metaPrice
    : latestPrice;
  const previous = isValidMarketNumber(meta.previousClose)
    ? Number(meta.previousClose)
    : Number(meta.chartPreviousClose);

  if (!isValidMarketNumber(price)) return null;

  const metaTimestamp = Number(meta.regularMarketTime || 0) * 1000;
  const latestTimestamp = Number.isFinite(metaTimestamp) && metaTimestamp > 0
    ? metaTimestamp
    : latestIndex >= 0 && timestamps[latestIndex]
      ? Number(timestamps[latestIndex]) * 1000
      : Date.now();
  const latestSeconds = latestTimestamp / 1000;
  const periods = meta.currentTradingPeriod || {};
  const inPeriod = (period) => Number(period?.start) <= latestSeconds && latestSeconds <= Number(period?.end);
  const marketSession = inPeriod(periods.pre)
    ? '盘前'
    : inPeriod(periods.regular)
      ? '盘中'
      : inPeriod(periods.post)
        ? '盘后'
        : '休市';

  return {
    price,
    change: isValidMarketNumber(previous) ? ((price - previous) / previous) * 100 : null,
    previousClose: isValidMarketNumber(previous) ? previous : null,
    dayHigh: isValidMarketNumber(meta.regularMarketDayHigh) ? Number(meta.regularMarketDayHigh) : null,
    dayLow: isValidMarketNumber(meta.regularMarketDayLow) ? Number(meta.regularMarketDayLow) : null,
    timestamp: latestTimestamp,
    currency: meta.currency || '',
    exchangeName: meta.exchangeName || '',
    marketSession,
  };
}


function requestYahooJsonp(symbol, options = {}) {
  const range = options.range || '1d';
  const interval = options.interval || '1m';
  const timeoutMs = options.timeoutMs || 8000;
  const includePrePost = options.includePrePost === false ? 'false' : 'true';

  if (Capacitor.isNativePlatform()) {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=${includePrePost}`;
    return CapacitorHttp.get({
      url: yahooUrl,
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
      },
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
    }).then((response) => (
      typeof response.data === 'string' ? JSON.parse(response.data) : response.data
    ));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `yahoo_quote_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('yahoo quote timeout'));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      delete window[callbackName];
    };

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.src = `/api/yahoo-jsonp?cb=${callbackName}&symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}&includePrePost=${includePrePost}&ts=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('yahoo quote request failed'));
    };
    document.body.appendChild(script);
  });
}

async function fetchYahooQuote(row) {
  const symbols = yahooSymbolCandidates(row);
  for (const symbol of symbols) {
    try {
      const data = await requestYahooJsonp(symbol);
      const quote = normalizeYahooQuote(data?.chart?.result?.[0]);
      if (quote) return { ...quote, quoteSource: 'yahoo', yahooSymbol: symbol };
    } catch {
      // Continue with the next market suffix.
    }
  }
  return null;
}

async function fetchYahooQuotes(rows) {
  const results = await Promise.all(rows.map(async (row) => [row.code, await fetchYahooQuote(row)]));
  return new Map(results.filter(([, quote]) => quote).map(([code, quote]) => [code, quote]));
}

function cleanSinaSymbol(symbol) {
  return String(symbol || '').replace(/[^A-Za-z0-9_.=]/g, '');
}

function requestSinaQuoteScript(symbol, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const safeSymbol = cleanSinaSymbol(symbol);
    if (!safeSymbol) {
      reject(new Error('sina quote bad symbol'));
      return;
    }
    const variableName = `hq_str_${safeSymbol.replace(/[^A-Za-z0-9_]/g, '_')}`;
    const previous = window[variableName];
    const script = document.createElement('script');
    script.charset = 'gb18030';
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('sina quote timeout'));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      if (previous === undefined) delete window[variableName];
      else window[variableName] = previous;
    };
    script.onload = () => {
      const raw = window[variableName];
      cleanup();
      if (typeof raw !== 'string' || !raw) {
        reject(new Error('sina quote empty'));
        return;
      }
      resolve({ fields: raw.split(',') });
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('sina quote request failed'));
    };
    script.src = `https://hq.sinajs.cn/list=${encodeURIComponent(safeSymbol)}&_=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function requestSinaKlineScript(kind, symbol, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const safeSymbol = cleanSinaSymbol(symbol);
    if (!safeSymbol) {
      reject(new Error('sina kline bad symbol'));
      return;
    }
    const variableName = `sina_us_${kind}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const previous = window[variableName];
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`sina ${kind} timeout`));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      if (previous === undefined) delete window[variableName];
      else window[variableName] = previous;
    };
    script.onload = () => {
      const rows = window[variableName];
      cleanup();
      resolve({ rows: Array.isArray(rows) ? rows : [] });
    };
    script.onerror = () => {
      cleanup();
      reject(new Error(`sina ${kind} request failed`));
    };
    const api = kind === 'min' ? 'US_MinKService.getMinK' : 'US_MinKService.getDailyK';
    const suffix = kind === 'min' ? '&type=1' : '';
    script.src = `https://stock.finance.sina.com.cn/usstock/api/jsonp.php/var%20${variableName}=/${api}?symbol=${encodeURIComponent(safeSymbol)}${suffix}&_=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function extractSinaJsonpRows(rawText) {
  const text = String(rawText || '').trim();
  const match = text.match(/=\s*\(([\s\S]*?)\)\s*;?\s*$/);
  if (!match) return [];
  try {
    const rows = JSON.parse(match[1]);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function extractSinaQuoteFields(rawText) {
  const text = String(rawText || '');
  const match = text.match(/=\s*"([\s\S]*?)"\s*;?\s*$/);
  return match ? match[1].split(',') : [];
}

async function requestSinaKlineNative(kind, symbol, timeoutMs = 12000) {
  const safeSymbol = cleanSinaSymbol(symbol);
  if (!safeSymbol) throw new Error('sina native kline bad symbol');
  const api = kind === 'min' ? 'US_MinKService.getMinK' : 'US_MinKService.getDailyK';
  const suffix = kind === 'min' ? '&type=1' : '';
  const callbackName = `native_sina_${kind}_${Date.now()}`;
  const url = `https://stock.finance.sina.com.cn/usstock/api/jsonp.php/var%20${callbackName}=/${api}?symbol=${encodeURIComponent(safeSymbol)}${suffix}&_=${Date.now()}`;
  const response = await CapacitorHttp.get({
    url,
    headers: {
      Accept: '*/*',
      Referer: 'https://finance.sina.com.cn/',
      'User-Agent': 'Mozilla/5.0',
    },
    connectTimeout: timeoutMs,
    readTimeout: timeoutMs,
  });
  const rows = extractSinaJsonpRows(typeof response.data === 'string' ? response.data : JSON.stringify(response.data || ''));
  if (!rows.length) throw new Error(`sina native ${kind} empty`);
  return { rows };
}

async function requestSinaQuoteNative(symbol, timeoutMs = 8000) {
  const safeSymbol = cleanSinaSymbol(symbol);
  if (!safeSymbol) throw new Error('sina native quote bad symbol');
  const response = await CapacitorHttp.get({
    url: `https://hq.sinajs.cn/list=${encodeURIComponent(safeSymbol)}&_=${Date.now()}`,
    headers: {
      Accept: '*/*',
      Referer: 'https://finance.sina.com.cn/',
      'User-Agent': 'Mozilla/5.0',
    },
    connectTimeout: timeoutMs,
    readTimeout: timeoutMs,
  });
  const fields = extractSinaQuoteFields(typeof response.data === 'string' ? response.data : JSON.stringify(response.data || ''));
  if (!fields.length) throw new Error('sina native quote empty');
  return { fields };
}

async function requestSinaUs(kind, params = {}) {
  if (Capacitor.isNativePlatform()) {
    if (kind === 'quote') return requestSinaQuoteNative(params.symbol);
    if (kind === 'min' || kind === 'daily') return requestSinaKlineNative(kind, params.symbol);
  }

  const query = new URLSearchParams({ ...params, kind, _: `${Date.now()}` });
  try {
    const response = await fetch(`/api/sina-us?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (response.ok) return response.json();
  } catch {
    // Static deployments do not have the local Vite proxy; fall through to JSONP.
  }

  if (kind === 'quote') return requestSinaQuoteScript(params.symbol);
  if (kind === 'min' || kind === 'daily') return requestSinaKlineScript(kind, params.symbol);
  throw new Error(`sina ${kind} failed`);
}

function getTimeZoneOffsetMinutes(timestamp, timeZone) {
  const number = Number(timestamp);
  if (!Number.isFinite(number)) return 0;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(number));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return Math.round((asUtc - number) / 60000);
}

function parseEasternTimestamp(value, closeTime = '16:00:00') {
  const text = String(value || '').trim();
  if (!text) return NaN;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T${closeTime}`
    : text.replace(' ', 'T');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second = '0'] = match;
  const localAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const offsetMinutes = getTimeZoneOffsetMinutes(localAsUtc, 'America/New_York');
  return localAsUtc - (offsetMinutes * 60 * 1000);
}

async function fetchSinaNasdaqQuote(asset) {
  const payload = await requestSinaUs('quote', { symbol: 'gb_ndx' });
  const cells = Array.isArray(payload?.fields) ? payload.fields : [];
  const price = Number(cells[1]);
  const previousClose = Number(cells[26]) || (Number.isFinite(price) && Number.isFinite(Number(cells[4])) ? price - Number(cells[4]) : null);
  if (!isValidMarketNumber(price)) return null;
  const timestamp = Date.parse(String(cells[3] || '').replace(' ', 'T')) || Date.now();
  return {
    ...asset,
    price,
    previousClose: isValidMarketNumber(previousClose) ? previousClose : null,
    change: Number.isFinite(Number(cells[2])) ? Number(cells[2]) : null,
    timestamp,
    marketSession: '最近收盘',
    quoteSource: 'sina',
    sourceLabel: '新浪',
  };
}

async function fetchSinaNasdaqTrend() {
  const payload = await requestSinaUs('min', { symbol: '.NDX' });
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const latestDate = rows
    .map((row) => String(row.d || '').slice(0, 10))
    .filter(Boolean)
    .at(-1);
  return rows
    .filter((row) => String(row.d || '').startsWith(latestDate))
    .map((row) => [parseEasternTimestamp(row.d), Number(row.c)])
    .filter(([timestamp, price]) => Number.isFinite(timestamp) && isValidMarketNumber(price))
    .sort((a, b) => a[0] - b[0]);
}

async function fetchSinaNasdaqDailyKline(limit = 520) {
  const payload = await requestSinaUs('daily', { symbol: '.NDX' });
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  return rows.map((row) => {
    const dateText = String(row.d || '').slice(0, 10);
    return [parseEasternTimestamp(dateText), Number(row.c), dateText];
  }).filter(([timestamp, price, dateText]) => (
    Number.isFinite(timestamp)
    && isValidMarketNumber(price)
    && isCompletedUsDailyBar(dateText)
  ))
    .sort((a, b) => a[0] - b[0])
    .slice(-limit);
}

function requestEastmoneyJsonp(path, params = {}) {
  return requestEastmoneyStockJsonp('https://push2delay.eastmoney.com/api/qt/stock', path, params, 'eastmoney_market');
}

function requestEastmoneyHistoryJsonp(path, params = {}) {
  return requestEastmoneyStockJsonp('https://push2his.eastmoney.com/api/qt/stock', path, params, 'eastmoney_history');
}

async function requestEastmoneyStockJsonp(baseUrl, path, params = {}, prefix = 'eastmoney') {
  const callbackName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const query = new URLSearchParams({ ...params, cb: callbackName, _: `${Date.now()}` });
  const jsonpUrl = `${baseUrl}/${path}?${query.toString()}`;

  if (Capacitor.isNativePlatform()) {
    const nativeQuery = new URLSearchParams({ ...params, _: `${Date.now()}` });
    return CapacitorHttp.get({
      url: `${baseUrl}/${path}?${nativeQuery.toString()}`,
      headers: { Accept: 'application/json', Referer: 'https://quote.eastmoney.com/' },
      connectTimeout: 8000,
      readTimeout: 12000,
    }).then((response) => (
      typeof response.data === 'string' ? JSON.parse(response.data) : response.data
    ));
  }

  try {
    const proxyQuery = new URLSearchParams({ ...params, path, source: prefix.includes('history') ? 'history' : 'market', _: `${Date.now()}` });
    const response = await fetch(`/api/eastmoney-stock?${proxyQuery.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (response.ok) {
      const payload = await response.json();
      if (payload && payload.rc === 0) return payload;
    }
  } catch {
    // Fall back to direct JSONP for static deployments.
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${prefix} timeout`));
    }, 10000);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      delete window[callbackName];
    };

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };
    script.src = jsonpUrl;
    script.onerror = () => {
      cleanup();
      reject(new Error(`${prefix} request failed`));
    };
    document.body.appendChild(script);
  });
}

function getUsMarketSession(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (['Sat', 'Sun'].includes(values.weekday)) return '休市';
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  if (minutes >= 240 && minutes < 570) return '盘前';
  if (minutes >= 570 && minutes < 960) return '盘中';
  if (minutes >= 960 && minutes < 1200) return '盘后';
  return '休市';
}

function normalizeEastmoneyQuote(payload, asset) {
  const data = payload?.data;
  const decimal = Number.isFinite(Number(data?.f59)) ? Number(data.f59) : 2;
  const scale = 10 ** decimal;
  const price = Number(data?.f43) / scale;
  const previousClose = Number(data?.f60) / scale;
  if (!isValidMarketNumber(price)) return null;
  const timestamp = Number(data?.f86 || 0) * 1000;
  const isUsAsset = MAGNIFICENT_SEVEN.some((item) => item.key === asset.key)
    || ['nasdaq', 'nasdaqFuture'].includes(asset.key);
  return {
    ...asset,
    price,
    previousClose: isValidMarketNumber(previousClose) ? previousClose : null,
    change: Number.isFinite(Number(data?.f170)) ? Number(data.f170) / 100 : null,
    timestamp,
    marketSession: isUsAsset
      ? getUsMarketSession()
      : Date.now() - timestamp < 15 * 60 * 1000 ? '盘中' : '休市',
    quoteSource: 'eastmoney',
    sourceLabel: '东方财富',
  };
}

async function fetchEastmoneyQuote(asset) {
  const payload = await requestEastmoneyJsonp('get', {
    secid: asset.domesticSecid,
    fields: 'f43,f44,f45,f46,f57,f58,f59,f60,f86,f170',
  });
  return normalizeEastmoneyQuote(payload, asset);
}

function normalizeMarketSeries(series) {
  return (Array.isArray(series) ? series : [])
    .filter((point) => Array.isArray(point) && Number.isFinite(Number(point[0])) && isValidMarketNumber(point[1]))
    .map(([timestamp, value]) => [Number(timestamp), Number(value)])
    .sort((a, b) => a[0] - b[0]);
}

function getNewYorkTimePartsFromTimestamp(timestamp) {
  const number = Number(timestamp);
  if (!Number.isFinite(number)) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(number));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const minutes = (Number(values.hour) * 60) + Number(values.minute);
  return {
    ...values,
    dateText: values.year && values.month && values.day ? `${values.year}-${values.month}-${values.day}` : '',
    minutes,
  };
}

function isRegularUsMarketTimestamp(timestamp) {
  const values = getNewYorkTimePartsFromTimestamp(timestamp);
  if (!values?.dateText || ['Sat', 'Sun'].includes(values.weekday)) return false;
  return values.minutes >= (9 * 60 + 30) && values.minutes <= (16 * 60);
}

function filterRegularUsMarketSeries(series) {
  return normalizeMarketSeries(series).filter(([timestamp]) => isRegularUsMarketTimestamp(timestamp));
}

function appendLivePoint(series, quote) {
  const output = normalizeMarketSeries(series);
  if (!isValidMarketNumber(quote?.price)) return output;
  const timestamp = Number(quote.timestamp || Date.now());
  if (!Number.isFinite(timestamp)) return output;
  const last = output.at(-1);
  if (last && Math.abs(last[0] - timestamp) < 60 * 1000) {
    last[1] = Number(quote.price);
    return output;
  }
  output.push([timestamp, Number(quote.price)]);
  return output.sort((a, b) => a[0] - b[0]);
}

function alignLatestSeriesPointToQuote(series, quote) {
  const output = normalizeMarketSeries(series);
  if (!output.length || !isValidMarketNumber(quote?.price)) return output;

  const price = Number(quote.price);
  const quoteTimestamp = Number(quote.timestamp);
  const last = output.at(-1);
  const lastTimestamp = Number(last?.[0]);
  if (!Number.isFinite(lastTimestamp) || !Number.isFinite(quoteTimestamp)) return output;

  const quoteDateText = formatNewYorkDateText(quoteTimestamp);
  const lastDateText = formatNewYorkDateText(lastTimestamp);
  if (!quoteDateText || quoteDateText !== lastDateText) return output;

  // Keep the chart's real market-session timestamp. The authoritative quote only
  // corrects the last bar's value; it must not append a synthetic after-close bar.
  output[output.length - 1] = [lastTimestamp, price];
  return output;
}

function alignDcaDailySeriesLatestToQuote(dailySeries, quote) {
  const rows = normalizeDcaDailyRows(dailySeries);
  if (!rows.length || !isValidMarketNumber(quote?.price)) return rows;

  const price = Number(quote.price);
  const quoteTimestamp = Number(quote.timestamp);
  const last = rows.at(-1);
  const fallbackTimestamp = Number(last?.[0]);
  const timestamp = Number.isFinite(quoteTimestamp) && quoteTimestamp > 0
    ? quoteTimestamp
    : fallbackTimestamp;
  if (!Number.isFinite(timestamp)) return rows;

  const dateText = formatNewYorkDateText(timestamp) || last?.[2];
  if (!dateText || !isCompletedUsDailyBar(dateText)) return rows;
  if (last?.[2] && dateText < last[2]) return rows;

  const byDate = new Map(rows.map((row) => [row[2], row]));
  const existing = byDate.get(dateText);
  const existingTimestamp = Number(existing?.[0]);
  const nextTimestamp = Number.isFinite(existingTimestamp) ? Math.max(existingTimestamp, timestamp) : timestamp;
  byDate.set(dateText, [nextTimestamp, price, dateText]);

  return [...byDate.values()].sort((a, b) => a[0] - b[0]);
}

function deriveNasdaqQuoteFromDailySeries(asset, dailySeries, sourceLabel = '日线') {
  const rows = normalizeDcaDailyRows(dailySeries);
  const latest = rows.at(-1);
  const previous = rows.at(-2);
  const price = Number(latest?.[1]);
  const previousClose = Number(previous?.[1]);
  if (!isValidMarketNumber(price)) return null;
  return {
    ...asset,
    price,
    previousClose: isValidMarketNumber(previousClose) ? previousClose : null,
    change: isValidMarketNumber(previousClose) ? ((price - previousClose) / previousClose) * 100 : null,
    timestamp: Number(latest?.[0]) || Date.now(),
    marketSession: '最近收盘',
    quoteSource: 'daily-close',
    sourceLabel,
  };
}

function deriveNasdaqQuoteFromIntradaySeries(asset, intradaySeries, referenceQuote = null, dailyCloseQuote = null, sourceLabel = '日内') {
  const rows = normalizeMarketSeries(intradaySeries);
  const latest = rows.at(-1);
  const price = Number(latest?.[1]);
  const timestamp = Number(latest?.[0]);
  if (!isValidMarketNumber(price) || !Number.isFinite(timestamp)) return null;

  const latestDateText = formatNewYorkDateText(timestamp);
  const referenceTimestamp = Number(referenceQuote?.timestamp);
  const referenceDateText = Number.isFinite(referenceTimestamp) ? formatNewYorkDateText(referenceTimestamp) : '';
  const dailyTimestamp = Number(dailyCloseQuote?.timestamp);
  const dailyDateText = Number.isFinite(dailyTimestamp) ? formatNewYorkDateText(dailyTimestamp) : '';

  let previousClose = null;
  if (
    isValidMarketNumber(referenceQuote?.price)
    && latestDateText
    && referenceDateText
    && referenceDateText < latestDateText
  ) {
    previousClose = Number(referenceQuote.price);
  } else if (isValidMarketNumber(referenceQuote?.previousClose)) {
    previousClose = Number(referenceQuote.previousClose);
  } else if (
    isValidMarketNumber(dailyCloseQuote?.price)
    && latestDateText
    && dailyDateText
    && dailyDateText < latestDateText
  ) {
    previousClose = Number(dailyCloseQuote.price);
  } else if (isValidMarketNumber(dailyCloseQuote?.previousClose)) {
    previousClose = Number(dailyCloseQuote.previousClose);
  } else if (isValidMarketNumber(referenceQuote?.price)) {
    previousClose = Number(referenceQuote.price);
  }

  return {
    ...asset,
    price,
    previousClose: isValidMarketNumber(previousClose) ? previousClose : null,
    change: isValidMarketNumber(previousClose) ? ((price - previousClose) / previousClose) * 100 : null,
    timestamp,
    marketSession: isRegularUsMarketTimestamp(timestamp) ? '盘中' : '最近交易',
    quoteSource: 'intraday',
    sourceLabel,
  };
}

function shouldPreferIntradayQuote(intradayQuote, quote) {
  if (!intradayQuote || !isValidMarketNumber(intradayQuote.price)) return false;
  if (!quote || !isValidMarketNumber(quote.price)) return true;

  const intradayTimestamp = Number(intradayQuote.timestamp);
  const quoteTimestamp = Number(quote.timestamp);
  const intradayDateText = Number.isFinite(intradayTimestamp) ? formatNewYorkDateText(intradayTimestamp) : '';
  const quoteDateText = Number.isFinite(quoteTimestamp) ? formatNewYorkDateText(quoteTimestamp) : '';

  if (intradayDateText && quoteDateText && intradayDateText > quoteDateText) return true;
  if (intradayDateText && quoteDateText && intradayDateText < quoteDateText) return false;
  if (Number.isFinite(intradayTimestamp) && Number.isFinite(quoteTimestamp)) {
    return intradayTimestamp > quoteTimestamp + 60 * 1000;
  }
  return Number.isFinite(intradayTimestamp) && isRegularUsMarketTimestamp(intradayTimestamp);
}

function parseEastmoneyTrendRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const cells = String(row).split(',');
      const timestamp = new Date(`${cells[0].replace(' ', 'T')}+08:00`).getTime();
      const price = Number(cells[2] || cells[1]);
      return [timestamp, price];
    })
    .filter(([timestamp, price]) => Number.isFinite(timestamp) && isValidMarketNumber(price))
    .sort((a, b) => a[0] - b[0]);
}

async function fetchEastmoneyTrend(asset) {
  const payload = await requestEastmoneyJsonp('trends2/get', {
    secid: asset.domesticSecid,
    ndays: '2',
    iscr: '0',
    iscca: '0',
    fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
    ut: 'fa5fd1943c7b386f172d6893dbfba10b',
  });
  const series = parseEastmoneyTrendRows(payload?.data?.trends);
  const latestTime = series.at(-1)?.[0] || 0;
  const cutoff = latestTime - 24 * 60 * 60 * 1000;
  return series.filter(([timestamp]) => timestamp >= cutoff);
}

function getNewYorkMarketDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function isCompletedUsDailyBar(dateText, now = new Date()) {
  const values = getNewYorkMarketDateParts(now);
  const marketDate = `${values.year}-${values.month}-${values.day}`;
  if (dateText < marketDate) return true;
  if (dateText > marketDate) return false;
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  return minutes >= 16 * 60 + 5;
}

const NDX_DAILY_KLINE_CACHE_KEY = 'finance-dashboard-ndx-yahoo-daily-kline-v4';

function readNdxDailyKlineCache(limit = 520) {
  try {
    const raw = window.localStorage.getItem(NDX_DAILY_KLINE_CACHE_KEY);
    const rows = JSON.parse(raw || '[]');
    return normalizeDcaDailyRows(rows).slice(-limit);
  } catch {
    return [];
  }
}

function writeNdxDailyKlineCache(rows) {
  try {
    const normalized = normalizeDcaDailyRows(rows).slice(-1600);
    if (normalized.length) {
      window.localStorage.setItem(NDX_DAILY_KLINE_CACHE_KEY, JSON.stringify(normalized));
    }
  } catch {
    // Ignore storage errors.
  }
}

async function fetchEastmoneyDailyKline(asset, limit = 520) {
  try {
    const payload = await requestEastmoneyHistoryJsonp('kline/get', {
      secid: asset.domesticSecid,
      klt: '101',
      fqt: '1',
      lmt: String(limit),
      end: '20500101',
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      ut: 'fa5fd1943c7b386f172d6893dbfba10b',
    });
    const rows = Array.isArray(payload?.data?.klines) ? payload.data.klines : [];
    const series = rows.map((row) => {
      const cells = String(row).split(',');
      const dateText = cells[0];
      const timestamp = new Date(`${dateText}T16:00:00+08:00`).getTime();
      return [timestamp, Number(cells[2]), dateText];
    }).filter(([timestamp, price, dateText]) => (
      Number.isFinite(timestamp)
      && isValidMarketNumber(price)
      && isCompletedUsDailyBar(dateText)
    ));
    if (asset.key === 'nasdaq' && series.length) writeNdxDailyKlineCache(series);
    return series;
  } catch {
    if (asset.key === 'nasdaq') return readNdxDailyKlineCache(limit);
    return [];
  }
}

async function fetchYahooMarketAsset(asset) {
  const options = asset.key === 'nasdaq'
    ? { range: '1d', interval: '1m', includePrePost: false, timeoutMs: 12000 }
    : { timeoutMs: 10000 };
  const data = await requestYahooJsonp(asset.symbol, options);
  const result = data?.chart?.result?.[0];
  const quote = normalizeYahooQuote(result);
  if (!quote) return null;
  const series = asset.key === 'nasdaq'
    ? normalizeMarketSeries(normalizeChartSeries(result)).filter(([timestamp]) => {
      const latestTime = Number(result?.timestamp?.at(-1) || 0) * 1000;
      return latestTime ? timestamp >= latestTime - 24 * 60 * 60 * 1000 : true;
    })
    : [];
  return { ...asset, ...quote, series, quoteSource: 'yahoo', sourceLabel: 'Yahoo' };
}


function resolveNdxTrendRange(key) {
  return NDX_TREND_RANGE_OPTIONS.find((option) => option.key === key)
    || NDX_TREND_RANGE_OPTIONS.find((option) => option.key === DEFAULT_NDX_TREND_RANGE)
    || NDX_TREND_RANGE_OPTIONS[0];
}

function normalizeChartSeries(result) {
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const closes = Array.isArray(quote.close) ? quote.close : [];
  return timestamps.map((timestamp, index) => [Number(timestamp) * 1000, Number(closes[index])])
    .filter(([timestamp, value]) => Number.isFinite(timestamp) && isValidMarketNumber(value))
    .sort((a, b) => a[0] - b[0]);
}

function calcSeriesChange(series) {
  const valid = (Array.isArray(series) ? series : [])
    .filter((point) => Array.isArray(point) && isValidMarketNumber(point[1]));
  const first = valid[0]?.[1];
  const last = valid.at(-1)?.[1];
  if (!isValidMarketNumber(first) || !isValidMarketNumber(last)) return null;
  return ((Number(last) - Number(first)) / Number(first)) * 100;
}

function computeMovingAverageSeries(series, windowSize = 200) {
  const points = (Array.isArray(series) ? series : [])
    .filter((point) => Array.isArray(point) && Number.isFinite(Number(point[0])) && isValidMarketNumber(point[1]))
    .map(([timestamp, value]) => [Number(timestamp), Number(value)])
    .sort((a, b) => a[0] - b[0]);
  const output = [];
  const queue = [];
  let sum = 0;
  points.forEach(([timestamp, value]) => {
    queue.push(value);
    sum += value;
    if (queue.length > windowSize) sum -= queue.shift();
    if (queue.length === windowSize) output.push([timestamp, sum / windowSize]);
  });
  return output;
}

function interpolateScore(value, xp, fp) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (number <= xp[0]) return clamp(fp[0], -1, 1);
  for (let index = 1; index < xp.length; index += 1) {
    if (number <= xp[index]) {
      const leftX = xp[index - 1];
      const rightX = xp[index];
      const ratio = rightX === leftX ? 0 : (number - leftX) / (rightX - leftX);
      return clamp(fp[index - 1] + ratio * (fp[index] - fp[index - 1]), -1, 1);
    }
  }
  return clamp(fp.at(-1), -1, 1);
}

function formatNewYorkDateText(timestamp) {
  const number = Number(timestamp);
  if (!Number.isFinite(number)) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(number));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year && values.month && values.day ? `${values.year}-${values.month}-${values.day}` : '';
}

function getNewYorkCalendarInfo(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateText: values.year && values.month && values.day ? `${values.year}-${values.month}-${values.day}` : '',
    weekday: values.weekday || '',
    minutes: (Number(values.hour) * 60) + Number(values.minute),
  };
}

function diffCalendarDays(leftDateText, rightDateText) {
  const left = Date.parse(`${leftDateText}T00:00:00Z`);
  const right = Date.parse(`${rightDateText}T00:00:00Z`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.round((right - left) / (24 * 60 * 60 * 1000));
}

function toDateTextUtc(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function observedFixedHoliday(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  const weekday = date.getUTCDay();
  if (weekday === 6) date.setUTCDate(day - 1);
  if (weekday === 0) date.setUTCDate(day + 1);
  return toDateTextUtc(date);
}

function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (weekday - date.getUTCDay() + 7) % 7;
  date.setUTCDate(1 + offset + ((nth - 1) * 7));
  return toDateTextUtc(date);
}

function lastWeekdayOfMonth(year, monthIndex, weekday) {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0));
  const offset = (date.getUTCDay() - weekday + 7) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return toDateTextUtc(date);
}

function getGoodFridayDateText(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = ((19 * a) + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + (2 * e) + (2 * i) - h - k) % 7;
  const m = Math.floor((a + (11 * h) + (22 * l)) / 451);
  const month = Math.floor((h + l - (7 * m) + 114) / 31);
  const day = ((h + l - (7 * m) + 114) % 31) + 1;
  const goodFriday = new Date(Date.UTC(year, month - 1, day));
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  return toDateTextUtc(goodFriday);
}

function isUsMarketHoliday(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText))) return false;
  const year = Number(dateText.slice(0, 4));
  const holidays = new Set([
    observedFixedHoliday(year, 0, 1),
    nthWeekdayOfMonth(year, 0, 1, 3),
    nthWeekdayOfMonth(year, 1, 1, 3),
    getGoodFridayDateText(year),
    lastWeekdayOfMonth(year, 4, 1),
    observedFixedHoliday(year, 6, 4),
    nthWeekdayOfMonth(year, 8, 1, 1),
    nthWeekdayOfMonth(year, 10, 4, 4),
    observedFixedHoliday(year, 11, 25),
  ]);
  if (year >= 2022) holidays.add(observedFixedHoliday(year, 5, 19));
  const nextNewYearObserved = observedFixedHoliday(year + 1, 0, 1);
  if (nextNewYearObserved.startsWith(`${year}-`)) holidays.add(nextNewYearObserved);
  return holidays.has(dateText);
}

function normalizeDcaDailyRows(dailySeries) {
  const byDate = new Map();
  (Array.isArray(dailySeries) ? dailySeries : []).forEach((point) => {
    if (!Array.isArray(point)) return;
    const timestamp = Number(point[0]);
    const close = Number(point[1]);
    const rawDateText = String(point[2] || '').slice(0, 10);
    const dateText = /^\d{4}-\d{2}-\d{2}$/.test(rawDateText)
      ? rawDateText
      : formatNewYorkDateText(timestamp);
    if (!Number.isFinite(timestamp) || !isValidMarketNumber(close) || !dateText) return;
    if (!isCompletedUsDailyBar(dateText)) return;
    const previous = byDate.get(dateText);
    if (!previous || timestamp >= previous[0]) byDate.set(dateText, [timestamp, close, dateText]);
  });
  return [...byDate.values()].sort((a, b) => a[0] - b[0]);
}

function calcTradingReturnVolatility(rows, endIndex, windowSize = 30) {
  const sample = rows.slice(Math.max(0, endIndex - windowSize), endIndex + 1);
  if (sample.length < windowSize + 1) return null;
  const returns = [];
  for (let index = 1; index < sample.length; index += 1) {
    const previous = Number(sample[index - 1]?.[1]);
    const current = Number(sample[index]?.[1]);
    if (isValidMarketNumber(previous) && isValidMarketNumber(current)) {
      returns.push((current - previous) / previous);
    }
  }
  if (returns.length !== windowSize) return null;
  const mean = returns.reduce((sum, item) => sum + item, 0) / returns.length;
  const variance = returns.reduce((sum, item) => sum + ((item - mean) ** 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252);
}

function buildDcaPlanAtIndex(rows, endIndex) {
  if (!Array.isArray(rows) || endIndex < 251 || endIndex >= rows.length) return null;
  const latest = rows[endIndex];
  const latestPrice = Number(latest?.[1]);
  if (!isValidMarketNumber(latestPrice)) return null;

  const maWindow = rows.slice(endIndex - 199, endIndex + 1);
  const highWindow = rows.slice(endIndex - 251, endIndex + 1);
  if (maWindow.length !== 200 || highWindow.length !== 252) return null;

  const ma200 = maWindow.reduce((sum, item) => sum + Number(item[1]), 0) / maWindow.length;
  const high52w = Math.max(...highWindow.map((item) => Number(item[1])));
  const volatility30 = calcTradingReturnVolatility(rows, endIndex, 30);
  if (!isValidMarketNumber(ma200) || !isValidMarketNumber(high52w) || !Number.isFinite(volatility30)) return null;

  const deviation = (latestPrice - ma200) / ma200;
  const drawdown52w = (latestPrice - high52w) / high52w;

  const ma200Score = interpolateScore(
    deviation,
    [-0.35, -0.25, -0.15, -0.05, 0.00, 0.10, 0.20, 0.35],
    [1.00, 0.85, 0.60, 0.25, 0.00, -0.35, -0.70, -1.00],
  );
  const drawdownScore = interpolateScore(
    drawdown52w,
    [-0.55, -0.40, -0.30, -0.20, -0.10, -0.03, 0.0],
    [1.00, 0.90, 0.75, 0.55, 0.25, -0.10, -0.45],
  );
  const volatilityScore = interpolateScore(
    volatility30,
    [0.08, 0.12, 0.18, 0.25, 0.35, 0.50, 0.70],
    [-0.60, -0.35, 0.00, 0.25, 0.55, 0.85, 1.00],
  );
  if (![ma200Score, drawdownScore, volatilityScore].every(Number.isFinite)) return null;

  const { base, dynamicBudget, dailyCap, weights } = DCA_STRATEGY_PARAMS;
  const contributions = {
    ma200: weights.ma200 * ma200Score,
    drawdown: weights.drawdown * drawdownScore,
    volatility: weights.volatility * volatilityScore,
  };
  const score = contributions.ma200 + contributions.drawdown + contributions.volatility;
  const dynamicFactor = clamp((score + 1) / 2, 0, 1);
  const dynamicInvest = dynamicBudget * dynamicFactor;
  const dailyInvest = clamp(base + dynamicInvest, 0, dailyCap);

  return {
    latestPrice,
    date: latest?.[2] || formatNewYorkDateText(latest?.[0]) || '--',
    dateText: latest?.[2] || formatNewYorkDateText(latest?.[0]) || '--',
    timestamp: Number(latest?.[0]) || Date.now(),
    ma200,
    high52w,
    deviation,
    drawdown52w,
    volatility30,
    scores: { ma200: ma200Score, drawdown: drawdownScore, volatility: volatilityScore, total: score },
    contributions,
    signals: [
      {
        key: 'ma200',
        label: 'MA200偏离',
        windowLabel: '200个交易日',
        rawValue: deviation,
        displayValue: formatPercent(deviation * 100),
        score: ma200Score,
        weight: weights.ma200,
        contribution: contributions.ma200,
      },
      {
        key: 'drawdown',
        label: '52周回撤',
        windowLabel: '252个交易日高点',
        rawValue: drawdown52w,
        displayValue: formatPercent(drawdown52w * 100),
        score: drawdownScore,
        weight: weights.drawdown,
        contribution: contributions.drawdown,
      },
      {
        key: 'volatility',
        label: '30日波动',
        windowLabel: '30个交易日收益率',
        rawValue: volatility30,
        displayValue: formatPercent(volatility30 * 100),
        score: volatilityScore,
        weight: weights.volatility,
        contribution: contributions.volatility,
      },
    ],
    dynamicFactor,
    baseInvest: base,
    dynamicInvest,
    dailyInvest,
    dailyInvestRounded: Math.round(dailyInvest),
    sample: {
      ma200: maWindow.length,
      drawdown: highWindow.length,
      volatilityReturns: 30,
      totalRows: rows.length,
    },
  };
}

function getChinaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function isChinaFundTradingDay(date = new Date()) {
  const values = getChinaDateParts(date);
  return !['Sat', 'Sun'].includes(values.weekday);
}

function addUtcDays(dateText, offset) {
  const timestamp = Date.parse(`${dateText}T12:00:00Z`);
  if (!Number.isFinite(timestamp)) return '';
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + offset);
  return toDateTextUtc(date);
}

function isUsTradingDateText(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText))) return false;
  const weekday = new Date(`${dateText}T12:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !isUsMarketHoliday(dateText);
}

function previousUsTradingDateText(dateText) {
  let cursor = dateText;
  for (let index = 0; index < 14; index += 1) {
    cursor = addUtcDays(cursor, -1);
    if (isUsTradingDateText(cursor)) return cursor;
  }
  return '';
}

function getExpectedLatestUsTradingDateText(now = new Date()) {
  const marketInfo = getNewYorkCalendarInfo(now);
  let candidate = marketInfo.dateText;
  if (!isUsTradingDateText(candidate) || marketInfo.minutes < 16 * 60 + 5) {
    candidate = previousUsTradingDateText(candidate);
  }
  return candidate;
}

function nextChinaFundCutoffAfter(timestamp) {
  const start = new Date(Number(timestamp));
  if (!Number.isFinite(start.getTime())) return null;

  for (let offset = 0; offset < 14; offset += 1) {
    const probe = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000);
    const values = getChinaDateParts(probe);
    const cutoff = new Date(`${values.year}-${values.month}-${values.day}T15:00:00+08:00`);
    if (cutoff.getTime() <= start.getTime()) continue;
    if (isChinaFundTradingDay(cutoff)) return cutoff.getTime();
  }

  return null;
}

function getChinaDcaOperationState(latestDataTimestamp, latestUsDateText) {
  return {
    label: '',
    isInvestWindow: true,
    validUntil: null,
    expectedLatestUsDateText: latestUsDateText || '',
  };
}

function mergeCompletedIntradayClose(dailySeries, intradaySeries) {
  const byDate = new Map();
  normalizeDcaDailyRows(dailySeries).forEach((row) => {
    byDate.set(row[2], row);
  });

  const latestIntraday = normalizeMarketSeries(intradaySeries).at(-1);
  const latestTimestamp = Number(latestIntraday?.[0]);
  const latestPrice = Number(latestIntraday?.[1]);
  const latestDateText = formatNewYorkDateText(latestTimestamp);
  if (Number.isFinite(latestTimestamp)
    && isValidMarketNumber(latestPrice)
    && latestDateText
    && isCompletedUsDailyBar(latestDateText)) {
    const previous = byDate.get(latestDateText);
    if (!previous || latestTimestamp >= Number(previous[0])) {
      byDate.set(latestDateText, [latestTimestamp, latestPrice, latestDateText]);
    }
  }

  return [...byDate.values()].sort((a, b) => a[0] - b[0]);
}

function buildDcaPlanFromDailySeries(dailySeries, sourceLabel = '接口') {
  const rows = normalizeDcaDailyRows(dailySeries);
  if (rows.length < 252) return {
    status: 'unavailable',
    sourceLabel,
    reason: '日线交易样本不足',
    sample: { totalRows: rows.length },
  };

  const latestPlan = buildDcaPlanAtIndex(rows, rows.length - 1);
  if (!latestPlan) return {
    status: 'unavailable',
    sourceLabel,
    reason: '指标计算失败',
    sample: { totalRows: rows.length },
  };

  const previousPlan = buildDcaPlanAtIndex(rows, rows.length - 2);
  const previousDailyInvest = Number(previousPlan?.dailyInvestRounded);
  const dailyInvest = Number(latestPlan.dailyInvestRounded);
  const deltaInvest = Number.isFinite(previousDailyInvest) && Number.isFinite(dailyInvest)
    ? dailyInvest - previousDailyInvest
    : null;
  return {
    ...latestPlan,
    status: 'ready',
    operationState: getChinaDcaOperationState(latestPlan.timestamp, latestPlan.dateText),
    sourceLabel,
    previousDateText: previousPlan?.dateText || '--',
    previousDailyInvest: Number.isFinite(previousDailyInvest) ? previousDailyInvest : null,
    deltaInvest,
  };
}

function buildRsiRowsWithLatest(dailySeries, latestSeries) {
  const byDate = new Map();
  normalizeDcaDailyRows(dailySeries).forEach((row) => {
    byDate.set(row[2], row);
  });

  const latestPoint = normalizeMarketSeries(latestSeries).at(-1);
  const latestTimestamp = Number(latestPoint?.[0]);
  const latestPrice = Number(latestPoint?.[1]);
  const latestDateText = formatNewYorkDateText(latestTimestamp);
  if (Number.isFinite(latestTimestamp) && isValidMarketNumber(latestPrice) && latestDateText) {
    const previous = byDate.get(latestDateText);
    if (!previous || latestTimestamp >= Number(previous[0])) {
      byDate.set(latestDateText, [latestTimestamp, latestPrice, latestDateText]);
    }
  }

  return [...byDate.values()].sort((a, b) => a[0] - b[0]);
}

function calculateRsi14(rows, period = 14) {
  if (!Array.isArray(rows) || rows.length < period + 1) return null;

  let gainSum = 0;
  let lossSum = 0;
  for (let index = 1; index <= period; index += 1) {
    const previous = Number(rows[index - 1]?.[1]);
    const current = Number(rows[index]?.[1]);
    if (!isValidMarketNumber(previous) || !isValidMarketNumber(current)) return null;
    const delta = current - previous;
    if (delta >= 0) gainSum += delta;
    else lossSum += Math.abs(delta);
  }

  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;
  for (let index = period + 1; index < rows.length; index += 1) {
    const previous = Number(rows[index - 1]?.[1]);
    const current = Number(rows[index]?.[1]);
    if (!isValidMarketNumber(previous) || !isValidMarketNumber(current)) return null;
    const delta = current - previous;
    averageGain = ((averageGain * (period - 1)) + Math.max(delta, 0)) / period;
    averageLoss = ((averageLoss * (period - 1)) + Math.max(-delta, 0)) / period;
  }

  if (averageLoss === 0) return 100;
  if (averageGain === 0) return 0;
  const relativeStrength = averageGain / averageLoss;
  return 100 - (100 / (1 + relativeStrength));
}

function buildRsi14Indicator(dailySeries, latestSeries, sourceLabel = '纳指') {
  const rows = buildRsiRowsWithLatest(dailySeries, latestSeries);
  const value = calculateRsi14(rows, 14);
  const previousValue = rows.length > 15 ? calculateRsi14(rows.slice(0, -1), 14) : null;
  const latest = rows.at(-1);
  if (!Number.isFinite(value) || !latest) {
    return { ...RSI_SIGNAL_CONFIG, error: true, sourceLabel, series: [] };
  }

  return {
    ...RSI_SIGNAL_CONFIG,
    price: value,
    previousClose: Number.isFinite(previousValue) ? previousValue : null,
    change: Number.isFinite(previousValue) ? value - previousValue : null,
    timestamp: Number(latest[0]) || Date.now(),
    dateText: latest[2] || formatNewYorkDateText(latest[0]) || '--',
    marketSession: '最新窗口',
    sourceLabel,
    series: [],
  };
}

function buildMaDeviationSeries(visibleSeries, dailySeries) {
  const visible = (Array.isArray(visibleSeries) ? visibleSeries : [])
    .filter((point) => Array.isArray(point) && Number.isFinite(Number(point[0])) && isValidMarketNumber(point[1]))
    .map(([timestamp, value]) => [Number(timestamp), Number(value)])
    .sort((a, b) => a[0] - b[0]);
  const ma200Daily = computeMovingAverageSeries(dailySeries, 200);
  if (!visible.length || !ma200Daily.length) {
    return { ma200Series: [], deviationSeries: [], latestDeviation: null };
  }

  const ma200Series = [];
  const deviationSeries = [];
  let maIndex = 0;
  visible.forEach(([timestamp, price]) => {
    while (maIndex < ma200Daily.length - 1 && ma200Daily[maIndex + 1][0] <= timestamp) {
      maIndex += 1;
    }
    const maValue = ma200Daily[maIndex]?.[1];
    if (!isValidMarketNumber(maValue)) return;
    ma200Series.push([timestamp, maValue]);
    deviationSeries.push([timestamp, ((price - maValue) / maValue) * 100]);
  });

  return {
    ma200Series,
    deviationSeries,
    latestDeviation: deviationSeries.at(-1)?.[1] ?? null,
  };
}

async function fetchYahooChartSeries(symbol, options) {
  const data = await requestYahooJsonp(symbol, options);
  return normalizeChartSeries(data?.chart?.result?.[0]);
}

async function fetchPreferredNasdaqQuote(asset) {
  const loaders = [
    () => fetchYahooMarketAsset(asset),
    () => fetchSinaNasdaqQuote(asset),
  ];

  for (const load of loaders) {
    try {
      const quote = await load();
      if (quote && isValidMarketNumber(quote.price)) {
        const { series: _series, ma200Series: _ma200Series, deviationSeries: _deviationSeries, ...quoteOnly } = quote;
        return quoteOnly;
      }
    } catch {
      // Try the next quote source.
    }
  }

  return null;
}

async function fetchPreferredNasdaqDailySeries(asset, limit = 520) {
  const loadYahooDaily = async () => {
    const range = limit > 800 ? '5y' : limit > 260 ? '2y' : '1y';
    const rows = normalizeMarketSeries(await fetchYahooChartSeries(asset.symbol, {
      range,
      interval: '1d',
      includePrePost: false,
      timeoutMs: 14000,
    })).map(([timestamp, price]) => [timestamp, price, formatNewYorkDateText(timestamp)]);
    return rows.filter(([timestamp, price, dateText]) => (
      Number.isFinite(timestamp)
      && isValidMarketNumber(price)
      && dateText
      && isCompletedUsDailyBar(dateText)
    )).slice(-limit);
  };

  const loaders = asset.domesticSecid
    ? [
      { sourceLabel: 'Yahoo', load: loadYahooDaily },
      { sourceLabel: '新浪', load: () => fetchSinaNasdaqDailyKline(limit) },
      { sourceLabel: '东方财富', load: () => fetchEastmoneyDailyKline(asset, limit) },
    ]
    : [
      { sourceLabel: 'Yahoo', load: loadYahooDaily },
      { sourceLabel: '新浪', load: () => fetchSinaNasdaqDailyKline(limit) },
    ];

  for (const loader of loaders) {
    try {
      const rows = await loader.load();
      if (Array.isArray(rows) && rows.length) {
        writeNdxDailyKlineCache(rows);
        return { rows, sourceLabel: loader.sourceLabel };
      }
    } catch {
      // Try the next daily source.
    }
  }

  return { rows: readNdxDailyKlineCache(limit), sourceLabel: '缓存' };
}

async function fetchPreferredNasdaqIntradaySeries(asset) {
  const loadYahooIntraday = async () => filterRegularUsMarketSeries(await fetchYahooChartSeries(asset.symbol, {
    range: '1d',
    interval: '1m',
    includePrePost: false,
    timeoutMs: 14000,
  }));

  const loaders = asset.domesticSecid
    ? [
      { sourceLabel: 'Yahoo', load: loadYahooIntraday },
      { sourceLabel: '新浪', load: () => fetchSinaNasdaqTrend() },
      { sourceLabel: '东方财富', load: () => fetchEastmoneyTrend(asset) },
    ]
    : [
      { sourceLabel: 'Yahoo', load: loadYahooIntraday },
      { sourceLabel: '新浪', load: () => fetchSinaNasdaqTrend() },
    ];

  for (const loader of loaders) {
    try {
      const rows = await loader.load();
      const series = filterRegularUsMarketSeries(rows);
      if (series.length) return { rows: series, sourceLabel: loader.sourceLabel };
    } catch {
      // Try the next intraday source.
    }
  }

  return { rows: [], sourceLabel: '' };
}

async function fetchNasdaqTrendSeries(asset, rangeKey = DEFAULT_NDX_TREND_RANGE, quote = null) {
  const rangeOption = resolveNdxTrendRange(rangeKey);
  let sourceLabel = 'Yahoo';
  let series = [];
  let dailySeries = [];
  let intradayPayload = { rows: [], sourceLabel: '' };

  try {
    if (asset.key === 'nasdaq') {
      const dailyPayload = await fetchPreferredNasdaqDailySeries(asset, rangeOption.historyLimit || 520);
      dailySeries = dailyPayload.rows;
      sourceLabel = dailyPayload.sourceLabel || sourceLabel;
    } else {
      dailySeries = await fetchEastmoneyDailyKline(asset, rangeOption.historyLimit || 520);
      sourceLabel = '东方财富';
    }
  } catch {
    dailySeries = asset.key === 'nasdaq' ? readNdxDailyKlineCache(rangeOption.historyLimit || 520) : [];
  }

  const quoteAlignedDailySeries = asset.key === 'nasdaq'
    ? alignDcaDailySeriesLatestToQuote(dailySeries, quote)
    : normalizeDcaDailyRows(dailySeries);
  const dailyCloseQuote = asset.key === 'nasdaq'
    ? deriveNasdaqQuoteFromDailySeries(asset, quoteAlignedDailySeries, sourceLabel)
    : null;
  const baseQuote = isValidMarketNumber(quote?.price) ? quote : dailyCloseQuote;

  if (asset.key === 'nasdaq') {
    try {
      intradayPayload = await fetchPreferredNasdaqIntradaySeries(asset);
    } catch {
      intradayPayload = { rows: [], sourceLabel: '' };
    }
  }

  if (rangeOption.key === 'day') {
    try {
      if (asset.key === 'nasdaq') {
        series = intradayPayload.rows;
        sourceLabel = intradayPayload.sourceLabel || sourceLabel;
      } else {
        series = filterRegularUsMarketSeries(await fetchEastmoneyTrend(asset));
        sourceLabel = '东方财富';
      }
    } catch {
      series = [];
    }
  } else if (quoteAlignedDailySeries.length) {
    series = quoteAlignedDailySeries.slice(-(rangeOption.visiblePoints || quoteAlignedDailySeries.length));
  }

  if (!series.length) {
    const yahooRange = rangeOption.key === 'week'
      ? '5d'
      : rangeOption.key === 'month'
        ? '1mo'
        : rangeOption.key === 'year'
          ? '1y'
          : rangeOption.key === 'fiveYear'
            ? '5y'
            : '1d';
    const yahooInterval = rangeOption.key === 'day' ? '1m' : rangeOption.key === 'week' ? '15m' : '1d';
    const fallbackSeries = normalizeMarketSeries(await fetchYahooChartSeries(asset.symbol, {
      range: yahooRange,
      interval: yahooInterval,
      includePrePost: rangeOption.key !== 'day',
      timeoutMs: 14000,
    }));
    series = rangeOption.key === 'day' ? filterRegularUsMarketSeries(fallbackSeries) : fallbackSeries;
    sourceLabel = 'Yahoo';
  }

  if (!quoteAlignedDailySeries.length) {
    try {
      const fallbackDaily = normalizeMarketSeries(await fetchYahooChartSeries(asset.symbol, {
        range: rangeOption.key === 'fiveYear' ? '5y' : '2y',
        interval: '1d',
        includePrePost: false,
        timeoutMs: 14000,
      })).map(([timestamp, price]) => [timestamp, price, formatNewYorkDateText(timestamp)]);
      dailySeries = fallbackDaily.filter(([timestamp, price, dateText]) => (
        Number.isFinite(timestamp)
        && isValidMarketNumber(price)
        && dateText
        && isCompletedUsDailyBar(dateText)
      ));
    } catch {
      dailySeries = [];
    }
  }

  const liveSeriesForQuote = intradayPayload.rows.length ? intradayPayload.rows : (rangeOption.key === 'day' ? series : []);
  const intradayQuote = asset.key === 'nasdaq'
    ? deriveNasdaqQuoteFromIntradaySeries(
      asset,
      liveSeriesForQuote,
      baseQuote,
      dailyCloseQuote,
      intradayPayload.sourceLabel || sourceLabel,
    )
    : null;
  const useIntradayQuote = shouldPreferIntradayQuote(intradayQuote, baseQuote);
  const effectiveQuote = useIntradayQuote ? intradayQuote : baseQuote;

  const dcaDailyBaseSeries = quoteAlignedDailySeries.length ? quoteAlignedDailySeries : dailySeries;
  const dcaDailySeries = asset.key === 'nasdaq'
    ? alignDcaDailySeriesLatestToQuote(dcaDailyBaseSeries, effectiveQuote)
    : normalizeDcaDailyRows(dailySeries);

  const rawVisibleSeries = asset.key === 'nasdaq'
    ? normalizeMarketSeries(series)
    : appendLivePoint(series, effectiveQuote);
  const visibleSeries = asset.key === 'nasdaq' && rangeOption.key === 'day'
    ? alignLatestSeriesPointToQuote(filterRegularUsMarketSeries(rawVisibleSeries), effectiveQuote)
    : rawVisibleSeries;

  const indicatorDailySeries = asset.key === 'nasdaq' ? dcaDailySeries : appendLivePoint(dailySeries, effectiveQuote);
  const indicators = buildMaDeviationSeries(visibleSeries, indicatorDailySeries);
  const dcaPlan = asset.key === 'nasdaq' ? buildDcaPlanFromDailySeries(dcaDailySeries, sourceLabel) : null;
  const rsi14 = asset.key === 'nasdaq' ? buildRsi14Indicator(dcaDailySeries, visibleSeries, sourceLabel) : null;
  return {
    series: visibleSeries,
    ma200Series: indicators.ma200Series,
    deviationSeries: indicators.deviationSeries,
    latestDeviation: indicators.latestDeviation,
    dcaPlan,
    rsi14,
    rangeChange: calcSeriesChange(visibleSeries),
    trendRangeKey: rangeOption.key,
    trendRangeLabel: rangeOption.rangeLabel,
    trendIntervalLabel: rangeOption.intervalLabel,
    trendSourceLabel: sourceLabel,
    quoteFallback: baseQuote && !isValidMarketNumber(quote?.price) ? baseQuote : null,
    liveQuoteFallback: useIntradayQuote ? intradayQuote : null,
  };
}

async function fetchCboeVolatilityAsset(asset) {
  const url = `https://cdn.cboe.com/api/global/us_indices/daily_prices/${asset.name}_History.csv`;
  const response = await CapacitorHttp.get({
    url,
    headers: { Accept: 'text/csv' },
    connectTimeout: 6000,
    readTimeout: 15000,
  });
  const csv = typeof response.data === 'string' ? response.data : '';
  const rows = csv.trim().split(/\r?\n/).slice(1).map((line) => line.split(','))
    .filter((cells) => cells.length >= 5 && isValidMarketNumber(Number(cells[4])));
  const latest = rows.at(-1);
  const previous = rows.at(-2);
  if (!latest) return null;
  const price = Number(latest[4]);
  const previousClose = Number(previous?.[4]);
  const [month, day, year] = latest[0].split('/').map(Number);
  return {
    ...asset,
    price,
    previousClose: isValidMarketNumber(previousClose) ? previousClose : null,
    change: isValidMarketNumber(previousClose) ? ((price - previousClose) / previousClose) * 100 : null,
    timestamp: new Date(year, month - 1, day, 16, 0, 0).getTime(),
    marketSession: '最近收盘',
    quoteSource: 'cboe',
    sourceLabel: 'Cboe',
    series: [],
  };
}

async function fetchNightMarketSnapshot({ includeTrend = false, includeVolatility = false, trendRangeKey = DEFAULT_NDX_TREND_RANGE } = {}) {
  const assets = [...NIGHT_MARKET_SIGNALS, ...MAGNIFICENT_SEVEN]
    .filter((asset) => asset.key !== 'vxn');
  const entries = await Promise.all(assets.map(async (asset) => {
    if (Capacitor.isNativePlatform() && asset.key === 'vxn') {
      try {
        const cboeQuote = await fetchCboeVolatilityAsset(asset);
        if (cboeQuote) return [asset.key, cboeQuote];
      } catch {
        // Continue with the overseas quote fallback.
      }
    }

    try {
      if (asset.key === 'nasdaq') {
        const quote = await fetchPreferredNasdaqQuote(asset);
        const trendPayload = includeTrend ? await fetchNasdaqTrendSeries(asset, trendRangeKey, quote) : {};
        const { quoteFallback, liveQuoteFallback, ...trendData } = trendPayload;
        const effectiveQuote = liveQuoteFallback || quote || quoteFallback;
        if (effectiveQuote || Array.isArray(trendData.series)) {
          return [asset.key, { ...asset, ...effectiveQuote, ...trendData }];
        }
        return [asset.key, { ...asset, error: true, series: [] }];
      }

      if (asset.domesticSecid) {
        const quote = await fetchEastmoneyQuote(asset);
        const trendPayload = {};
        if (quote) return [asset.key, { ...quote, ...trendPayload }];
      }
    } catch {
      // Continue with the overseas fallback.
    }

    if (asset.domesticSecid) {
      return [asset.key, { ...asset, error: true, series: [] }];
    }

    try {
      const fallback = await fetchYahooMarketAsset(asset);
      return [asset.key, fallback || { ...asset, error: true, series: [] }];
    } catch {
      return [asset.key, { ...asset, error: true, series: [] }];
    }
  }));
  return Object.fromEntries(entries);
}

function mergeNightMarketSnapshot(current, snapshot) {
  const merged = { ...current };
  Object.entries(snapshot).forEach(([key, incoming]) => {
    if (incoming?.error) {
      if (!merged[key]) merged[key] = incoming;
      return;
    }
    const previous = current[key] || {};
    if (key !== 'nasdaq') {
      merged[key] = { ...previous, ...incoming };
      return;
    }

    if (isNativeDashboardRuntime() && incoming?.sourceLabel === '东方财富') {
      merged[key] = previous.price ? previous : { ...previous, ...incoming, error: true };
      return;
    }

    const incomingRangeKey = incoming.trendRangeKey || previous.trendRangeKey || DEFAULT_NDX_TREND_RANGE;
    const incomingHasSeries = Array.isArray(incoming.series);

    if (incomingRangeKey === DEFAULT_NDX_TREND_RANGE && !incomingHasSeries) {
      merged[key] = {
        ...previous,
        ...incoming,
        trendRangeKey: incomingRangeKey,
        series: Array.isArray(previous.series) ? previous.series : [],
        rangeChange: previous.rangeChange,
        ma200Series: [],
        deviationSeries: [],
        latestDeviation: previous.latestDeviation,
      };
      return;
    }

    if (incomingRangeKey !== DEFAULT_NDX_TREND_RANGE && !incomingHasSeries) {
      merged[key] = {
        ...previous,
        ...incoming,
        trendRangeKey: incomingRangeKey,
        series: Array.isArray(previous.series) ? previous.series : [],
        ma200Series: Array.isArray(previous.ma200Series) ? previous.ma200Series : [],
        deviationSeries: Array.isArray(previous.deviationSeries) ? previous.deviationSeries : [],
        rangeChange: previous.rangeChange,
        latestDeviation: previous.latestDeviation,
      };
      return;
    }

    const previousSeriesLength = Array.isArray(previous.series) ? previous.series.length : 0;
    const incomingSeriesLength = incomingHasSeries ? incoming.series.length : 0;
    const incomingSeriesIsIncomplete = incomingRangeKey !== DEFAULT_NDX_TREND_RANGE
      && previous.trendRangeKey === incomingRangeKey
      && previousSeriesLength >= 6
      && incomingSeriesLength > 0
      && incomingSeriesLength < Math.max(4, previousSeriesLength * 0.7);

    if (incomingSeriesIsIncomplete) {
      merged[key] = {
        ...previous,
        ...incoming,
        trendRangeKey: incomingRangeKey,
        series: previous.series,
        ma200Series: previous.ma200Series || [],
        deviationSeries: previous.deviationSeries || [],
        rangeChange: previous.rangeChange,
        latestDeviation: previous.latestDeviation,
      };
      return;
    }

    const shouldReplaceSeries = incomingRangeKey !== DEFAULT_NDX_TREND_RANGE
      || previous.trendRangeKey !== incomingRangeKey
      || Array.isArray(incoming.ma200Series)
      || Array.isArray(incoming.deviationSeries);

    if (shouldReplaceSeries && incomingHasSeries) {
      merged[key] = {
        ...previous,
        ...incoming,
        trendRangeKey: incomingRangeKey,
        series: incoming.series,
        ma200Series: Array.isArray(incoming.ma200Series) ? incoming.ma200Series : previous.ma200Series || [],
        deviationSeries: Array.isArray(incoming.deviationSeries) ? incoming.deviationSeries : previous.deviationSeries || [],
      };
      return;
    }

    const points = [
      ...(Array.isArray(previous.series) ? previous.series : []),
      ...(Array.isArray(incoming.series) ? incoming.series : []),
    ];
    if (isValidMarketNumber(incoming.price) && Number.isFinite(Number(incoming.timestamp))) {
      points.push([Number(incoming.timestamp), Number(incoming.price)]);
    }
    const latestTime = Math.max(0, ...points.map((point) => Number(point[0]) || 0));
    const cutoff = latestTime - 24 * 60 * 60 * 1000;
    const series = Array.from(new Map(points
      .filter(([timestamp, price]) => timestamp >= cutoff && isValidMarketNumber(price))
      .map(([timestamp, price]) => [Number(timestamp), Number(price)])).entries())
      .sort((a, b) => a[0] - b[0]);
    const indicators = buildMaDeviationSeries(series, previous.ma200DailySeries || []);
    merged[key] = {
      ...previous,
      ...incoming,
      trendRangeKey: incomingRangeKey,
      series,
      rangeChange: calcSeriesChange(series),
      ma200Series: Array.isArray(incoming.ma200Series) ? incoming.ma200Series : previous.ma200Series || indicators.ma200Series,
      deviationSeries: Array.isArray(incoming.deviationSeries) ? incoming.deviationSeries : previous.deviationSeries || indicators.deviationSeries,
      latestDeviation: incoming.latestDeviation ?? previous.latestDeviation ?? indicators.latestDeviation,
    };
  });
  return merged;
}

function stockHoldingPageScript(code, period) {
  return requestApidataScript(
    `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&top=10&year=${period.year}&month=${period.month}&rt=${Math.random()}`,
    'holding',
  ).then(parseStockHoldings);
}

async function fetchStockQuotes(rows) {
  const secids = rows.map((item) => item.quotePath).filter(Boolean);
  if (!secids.length) {
    const yahooMap = await fetchYahooQuotes(rows);
    return rows.map((row) => {
      const quote = yahooMap.get(row.code);
      return quote ? { ...row, change: quote.change, price: quote.price, quoteSource: quote.quoteSource, yahooSymbol: quote.yahooSymbol } : row;
    });
  }

  return new Promise((resolve) => {
    const callbackName = `stock_quote_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(rows);
    }, 8000);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      delete window[callbackName];
    };

    window[callbackName] = (data) => {
      cleanup();
      const quoteMap = new Map((data?.data?.diff || []).map((item) => [`${item.f13}.${item.f12}`, item]));
      const eastmoneyRows = rows.map((row) => {
        const quote = quoteMap.get(row.quotePath);
        if (!quote || !isValidMarketNumber(quote.f2)) return row;
        return { ...row, change: Number(quote.f3), price: Number(quote.f2), quoteSource: 'eastmoney' };
      });
      const missingRows = eastmoneyRows.filter((row) => !isValidMarketNumber(row.price));

      if (!missingRows.length) {
        resolve(eastmoneyRows);
        return;
      }

      fetchYahooQuotes(missingRows)
        .then((yahooMap) => resolve(eastmoneyRows.map((row) => {
          const quote = yahooMap.get(row.code);
          return quote ? { ...row, change: quote.change, price: quote.price, quoteSource: quote.quoteSource, yahooSymbol: quote.yahooSymbol } : row;
        })))
        .catch(() => resolve(eastmoneyRows));
    };

    script.src = `https://push2delay.eastmoney.com/api/qt/ulist.np/get?cb=${callbackName}&fltt=2&secids=${secids.join(',')}&fields=f12,f14,f2,f3,f4,f13&rt=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      resolve(rows);
    };
    document.body.appendChild(script);
  });
}

function getChangeColor(value) {
  const number = Number(value);
  if (number > 0) return '#ff4b63';
  if (number < 0) return '#24ff72';
  return '#86dca6';
}

function formatPrice(value) {
  const number = Number(value);
  if (!isValidMarketNumber(number)) return '--';
  return number >= 100 ? number.toFixed(2) : number.toFixed(3);
}

function parsePercentValue(value) {
  const number = Number(String(value || '').replace('%', '').trim());
  return Number.isFinite(number) ? number : null;
}

function isUsRelatedFund(fund) {
  const text = [
    fund?.name,
    fund?.shortName,
    fund?.group,
    fund?.note,
    ...(Array.isArray(fund?.tags) ? fund.tags : []),
  ].filter(Boolean).join(' ');
  return /美股|美国|纳斯达克|纳指|标普|道琼斯|NASDAQ|Nasdaq|S&P|全球科技|全球产业|全球成长/i.test(text);
}

function calcHoldingEstimate(rows) {
  const usableRows = rows
    .map((row) => ({
      ratio: parsePercentValue(row.ratio),
      change: Number(row.change),
    }))
    .filter((row) => Number.isFinite(row.ratio) && Number.isFinite(row.change));

  const coverage = usableRows.reduce((sum, row) => sum + row.ratio, 0);
  const estimate = usableRows.reduce((sum, row) => sum + (row.ratio * row.change / 100), 0);

  return {
    estimate,
    coverage,
    count: usableRows.length,
  };
}

function getSentiment(change) {
  const number = Number(change);
  if (!Number.isFinite(number)) return { label: '中性', score: '--', tone: 'flat' };
  const score = Math.max(0, Math.min(100, Math.round(50 + number * 6)));
  if (number >= 5) return { label: '强利好', score, tone: 'up' };
  if (number > 0) return { label: '利好', score, tone: 'up' };
  if (number <= -5) return { label: '强利空', score, tone: 'down' };
  if (number < 0) return { label: '利空', score, tone: 'down' };
  return { label: '中性', score, tone: 'flat' };
}

async function stockHoldingScript(code) {
  for (const period of HOLDING_PERIODS) {
    try {
      const result = await stockHoldingPageScript(code, period);
      if (result.rows.length) {
        return { ...result, rows: await fetchStockQuotes(result.rows) };
      }
    } catch {
      // Continue with older disclosure periods.
    }
  }
  return { date: '--', rows: [] };
}

function makeFallbackHistory(code, days) {
  const base = Number(FALLBACK_QUOTES[code]?.dwjz || 1);
  const seed = Number(code.slice(-3));
  const today = new Date('2026-05-29T00:00:00');

  return Array.from({ length: days }, (_, index) => {
    const distance = days - index;
    const date = new Date(today);
    date.setDate(today.getDate() - distance);
    const wave = Math.sin((index + seed) / 5) * 0.018 + Math.cos((index + seed) / 11) * 0.012;
    const trend = (index - days) * 0.0009;
    const nav = base * (1 + wave + trend);
    const previous = index === 0 ? nav : base * (1 + Math.sin((index - 1 + seed) / 5) * 0.018 + Math.cos((index - 1 + seed) / 11) * 0.012 + (index - 1 - days) * 0.0009);
    return {
      date: date.toISOString().slice(0, 10),
      nav: Number(nav.toFixed(4)),
      accumulative: Number(nav.toFixed(4)),
      change: Number((((nav - previous) / previous) * 100).toFixed(2)),
    };
  });
}

function formatPercent(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(digits)}%`;
}

function formatCurrency(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

function formatProfitCurrency(value) {
  return formatCurrency(value, 2);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatMarketPrice(item) {
  if (!isValidMarketNumber(item?.price)) return '--';
  if (item.suffix === '%') return `${Number(item.price).toFixed(3)}%`;
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(item.price));
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHoldingValue(value) {
  if (!value || value === '--') return '--';
  return `${value} 万`;
}

function formatSecondMoment(date = new Date()) {
  return date.toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatMinuteMoment(date = new Date()) {
  return date.toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatChartBoundary(item) {
  if (!item?.date) return '--';
  return item.date;
}

function resolveLatestNavDate(quote, history) {
  const quoteDate = String(quote?.jzrq || '').slice(0, 10);
  const historyDate = String(history?.at(-1)?.date || '').slice(0, 10);
  if (quoteDate && historyDate) return quoteDate > historyDate ? quoteDate : historyDate;
  return quoteDate || historyDate || '--';
}

function enhanceQuoteWithHistory(code, quote, history) {
  const latestHistory = [...(history || [])].reverse().find((item) => Number.isFinite(item.nav));
  if (!latestHistory) return quote || FALLBACK_QUOTES[code] || { dwjz: '1.0000', gszzl: '0', jzrq: '--' };

  const baseQuote = quote || FALLBACK_QUOTES[code] || {};
  const quoteDate = String(baseQuote.jzrq || '').slice(0, 10);
  if (quoteDate && quoteDate > latestHistory.date) return baseQuote;

  const historyRows = history || [];
  const latestIndex = historyRows.findIndex((item) => item.date === latestHistory.date);
  const previousHistory = latestIndex > 0 ? historyRows[latestIndex - 1] : null;
  const historyChange = Number.isFinite(latestHistory.change)
    ? latestHistory.change
    : previousHistory && Number.isFinite(previousHistory.nav)
      ? ((latestHistory.nav - previousHistory.nav) / previousHistory.nav) * 100
      : Number(baseQuote.gszzl || 0);

  return {
    ...baseQuote,
    dwjz: latestHistory.nav.toFixed(4),
    gsz: latestHistory.nav.toFixed(4),
    gszzl: Number.isFinite(historyChange) ? String(Number(historyChange.toFixed(2))) : baseQuote.gszzl || '0',
    jzrq: latestHistory.date,
    gztime: `${latestHistory.date} 00:00`,
  };
}

function nextMinuteDelay(date = new Date()) {
  return Math.max(1000, ((60 - date.getSeconds()) * 1000) - date.getMilliseconds());
}

function changeClass(value) {
  const number = Number(value);
  if (number > 0) return 'up';
  if (number < 0) return 'down';
  return 'flat';
}

function normalizeFundCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function compactFundName(name, code) {
  const cleanName = String(name || '').replace(/\s+/g, '').trim();
  if (!cleanName) return `基金${code}`;
  return cleanName
    .replace(/混合型?证券投资基金|股票型?证券投资基金|指数型?证券投资基金|证券投资基金/g, '')
    .replace(/人民币份额|人民币|联接基金/g, '')
    .slice(0, 12);
}

function createCustomFund(code, quote = {}) {
  const name = quote.name || quote.fundname || `基金 ${code}`;
  return {
    code,
    name,
    shortName: compactFundName(name, code),
    tags: ['自选', '待分类'],
    group: '自选基金',
    risk: '待评估',
    note: '由搜索栏加入的自选基金。',
  };
}

function mergeDefaultFund(fund) {
  const code = normalizeFundCode(fund.code);
  const preset = DEFAULT_FUNDS.find((item) => item.code === code);
  if (preset) return preset;
  return {
    ...createCustomFund(code, fund),
    ...fund,
    code,
    tags: Array.isArray(fund.tags) && fund.tags.length ? fund.tags : ['自选', '待分类'],
  };
}

function normalizeWatchFunds(funds, fallback = DEFAULT_FUNDS) {
  if (!Array.isArray(funds) || !funds.length) return fallback;
  const unique = new Map();
  funds.forEach((fund) => {
    const code = normalizeFundCode(fund.code);
    if (code.length === 6) unique.set(code, mergeDefaultFund({ ...fund, code }));
  });
  return unique.size ? Array.from(unique.values()) : fallback;
}

function loadWatchFundsBackup() {
  try {
    const raw = localStorage.getItem(WATCH_FUNDS_KEY);
    if (!raw) return DEFAULT_FUNDS;
    return normalizeWatchFunds(JSON.parse(raw));
  } catch {
    localStorage.removeItem(WATCH_FUNDS_KEY);
    return DEFAULT_FUNDS;
  }
}

async function fetchWatchFundsFile() {
  const response = await fetch(WATCH_FUNDS_API);
  if (!response.ok) throw new Error('watch funds load failed');
  const payload = await response.json();
  return normalizeWatchFunds(payload.funds || payload, []);
}

async function persistWatchFundsFile(funds) {
  const normalized = normalizeWatchFunds(funds);
  localStorage.setItem(WATCH_FUNDS_KEY, JSON.stringify(normalized));
  const response = await fetch(WATCH_FUNDS_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ funds: normalized }),
  });
  if (!response.ok) throw new Error('watch funds save failed');
  return normalized;
}

function calcMetrics(history) {
  if (!history?.length) {
    return { rangeReturn: 0, maxDrawdown: 0, volatility: 0, latestNav: 0 };
  }
  const first = history[0].nav;
  const last = history[history.length - 1].nav;
  const changes = history.map((item) => item.change).filter(Number.isFinite);
  let peak = first;
  let maxDrawdown = 0;

  history.forEach((item) => {
    peak = Math.max(peak, item.nav);
    maxDrawdown = Math.min(maxDrawdown, ((item.nav - peak) / peak) * 100);
  });

  const average = changes.reduce((sum, item) => sum + item, 0) / Math.max(changes.length, 1);
  const variance = changes.reduce((sum, item) => sum + (item - average) ** 2, 0) / Math.max(changes.length, 1);

  return {
    rangeReturn: ((last - first) / first) * 100,
    maxDrawdown,
    volatility: Math.sqrt(variance) * Math.sqrt(252),
    latestNav: last,
  };
}

function normalizeInvestmentRecords(records) {
  if (!Array.isArray(records)) return [];
  return records
    .map((record) => ({
      id: String(record.id || crypto.randomUUID()),
      type: record.type === 'sell' ? 'sell' : 'buy',
      date: record.date,
      fundCode: record.fundCode,
      amount: Number(record.amount),
      nav: Number(record.nav ?? record.buyNav),
      navDate: record.navDate || record.buyNavDate || record.date,
      createdAt: record.createdAt || '',
    }))
    .filter((record) => (
      record.date
      && record.fundCode
      && Number.isFinite(record.amount)
      && record.amount > 0
      && Number.isFinite(record.nav)
      && record.nav > 0
    ));
}

function loadInvestmentRecordsBackup() {
  try {
    const raw = localStorage.getItem(INVESTMENT_RECORDS_KEY);
    if (!raw) return [];
    return normalizeInvestmentRecords(JSON.parse(raw));
  } catch {
    localStorage.removeItem(INVESTMENT_RECORDS_KEY);
    return [];
  }
}

async function fetchInvestmentRecordsFile() {
  const response = await fetch(INVESTMENT_RECORDS_API);
  if (!response.ok) throw new Error('investment records load failed');
  const payload = await response.json();
  return normalizeInvestmentRecords(payload.records || payload);
}

async function persistInvestmentRecordsFile(records) {
  const normalized = normalizeInvestmentRecords(records);
  localStorage.setItem(INVESTMENT_RECORDS_KEY, JSON.stringify(normalized));
  const response = await fetch(INVESTMENT_RECORDS_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: normalized }),
  });
  if (!response.ok) throw new Error('investment records save failed');
  return normalized;
}

function resolveHistoryPointForDate(code, date, historyMap) {
  const history = historyMap[code] || makeFallbackHistory(code, MAX_HISTORY_DAYS);
  let index = -1;
  for (let cursor = history.length - 1; cursor >= 0; cursor -= 1) {
    if (history[cursor].date <= date && Number.isFinite(history[cursor].nav)) {
      index = cursor;
      break;
    }
  }
  if (index < 0) return { current: null, previous: null };
  return {
    current: history[index],
    previous: index > 0 ? history[index - 1] : null,
  };
}

function resolveNavForDate(code, date, historyMap, quoteMap) {
  const quote = quoteMap[code] || FALLBACK_QUOTES[code];
  const quoteDate = quote?.jzrq;
  const quoteNav = Number(quote?.dwjz);
  const { current: matched } = resolveHistoryPointForDate(code, date, historyMap);
  const candidates = [];
  if (quoteDate && quoteDate <= date && Number.isFinite(quoteNav)) candidates.push({ nav: quoteNav, date: quoteDate });
  if (matched) candidates.push({ nav: matched.nav, date: matched.date });
  if (candidates.length) return candidates.sort((a, b) => a.date.localeCompare(b.date)).at(-1);

  const history = historyMap[code] || makeFallbackHistory(code, MAX_HISTORY_DAYS);
  const first = history.find((item) => Number.isFinite(item.nav));
  if (first) return { nav: first.nav, date: first.date };
  return { nav: quoteNav || 0, date: quoteDate || '--' };
}

function buildInvestmentStats(records, quoteMap, historyMap, funds) {
  const rows = records.map((record, sourceIndex) => {
    const fund = funds.find((item) => item.code === record.fundCode)
      || DEFAULT_FUNDS.find((item) => item.code === record.fundCode)
      || createCustomFund(record.fundCode);
    const currentNav = Number(resolveNavForDate(record.fundCode, formatLocalDate(), historyMap, quoteMap).nav || record.nav);
    const sign = record.type === 'sell' ? -1 : 1;
    const units = sign * (record.amount / record.nav);
    const netAmount = sign * record.amount;
    const currentValue = units * currentNav;
    const profit = currentValue - netAmount;
    return {
      ...record,
      sourceIndex,
      fund,
      currentNav,
      units,
      netAmount,
      currentValue,
      profit,
      returnRate: Math.abs(netAmount) ? (profit / Math.abs(netAmount)) * 100 : 0,
    };
  });

  const byFund = Array.from(rows.reduce((map, row) => {
    const current = map.get(row.fundCode) || {
      code: row.fundCode,
      name: row.fund.shortName,
      netAmount: 0,
      units: 0,
      currentNav: row.currentNav,
    };
    current.netAmount += row.netAmount;
    current.units += row.units;
    current.currentNav = row.currentNav;
    map.set(row.fundCode, current);
    return map;
  }, new Map()).values()).map((item) => ({
    ...item,
    currentValue: item.units * item.currentNav,
  })).map((item) => ({
    ...item,
    profit: item.currentValue - item.netAmount,
    returnRate: Math.abs(item.netAmount) ? ((item.currentValue - item.netAmount) / Math.abs(item.netAmount)) * 100 : 0,
    dailyChange: Number((quoteMap[item.code] || FALLBACK_QUOTES[item.code])?.gszzl),
  }));

  const enrichedByFund = byFund.map((item) => {
    const dailyChange = Number.isFinite(item.dailyChange) ? item.dailyChange : 0;
    const previousValue = item.currentValue / (1 + dailyChange / 100);
    const dailyProfit = item.currentValue - previousValue;
    return {
      ...item,
      dailyChange,
      previousValue,
      dailyProfit,
    };
  });

  const totalAmount = rows.reduce((sum, row) => sum + row.netAmount, 0);
  const totalValue = enrichedByFund.reduce((sum, item) => sum + item.currentValue, 0);
  const totalProfit = totalValue - totalAmount;
  const totalDailyProfit = enrichedByFund.reduce((sum, item) => sum + item.dailyProfit, 0);
  return {
    rows,
    byFund: enrichedByFund,
    totalAmount,
    totalValue,
    totalProfit,
    totalDailyProfit,
    totalReturn: Math.abs(totalAmount) ? (totalProfit / Math.abs(totalAmount)) * 100 : 0,
  };
}

function sortInvestmentRowsByRecent(rows) {
  return rows.slice().sort((a, b) => (
    b.date.localeCompare(a.date)
    || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    || (a.sourceIndex || 0) - (b.sourceIndex || 0)
  ));
}

function buildDailyProfitGrid(records, funds, historyMap) {
  const codes = Array.from(new Set(records.map((record) => record.fundCode)));
  const dateSet = new Set();
  codes.forEach((code) => {
    const history = historyMap[code] || makeFallbackHistory(code, MAX_HISTORY_DAYS);
    history.slice(-18).forEach((item) => dateSet.add(item.date));
  });
  records.forEach((record) => dateSet.add(record.date));

  const dates = Array.from(dateSet).sort().slice(-14);
  return dates.map((date) => {
    const details = codes.map((code) => {
      const fund = funds.find((item) => item.code === code)
        || DEFAULT_FUNDS.find((item) => item.code === code)
        || createCustomFund(code);
      const { current, previous } = resolveHistoryPointForDate(code, date, historyMap);
      const units = records
        .filter((record) => record.fundCode === code && record.date <= date)
        .reduce((sum, record) => {
          const direction = record.type === 'sell' ? -1 : 1;
          return sum + direction * (record.amount / record.nav);
        }, 0);
      const settledUnits = current ? records
        .filter((record) => record.fundCode === code && record.date < current.date)
        .reduce((sum, record) => {
          const direction = record.type === 'sell' ? -1 : 1;
          return sum + direction * (record.amount / record.nav);
        }, 0) : 0;

      if (!current || Math.abs(units) <= 0.000001) return null;

      const hasSettledPosition = Math.abs(settledUnits) > 0.000001;
      const dailyChange = previous && hasSettledPosition ? ((current.nav - previous.nav) / previous.nav) * 100 : 0;
      const dailyProfit = previous && hasSettledPosition ? settledUnits * (current.nav - previous.nav) : 0;
      return {
        code,
        name: fund.shortName,
        date,
        nav: current?.nav || null,
        units,
        dailyChange,
        dailyProfit,
      };
    }).filter(Boolean);
    const totalProfit = details.reduce((sum, item) => sum + item.dailyProfit, 0);
    return { date, totalProfit, details };
  });
}

function transactionTypeLabel(type) {
  return type === 'sell' ? '卖出' : '买入';
}

function formatPlainNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return number.toFixed(digits);
}

const MARKET_SNAPSHOT_PERIODS = [
  { label: '1月', days: 22 },
  { label: '3月', days: 66 },
  { label: '6月', days: 132 },
  { label: '1年', days: 252 },
];

function buildInvestmentTemplateContext({ funds, enrichedFunds, investmentStats, investmentRecords, quoteMap, historyMap, generatedAt }) {
  const heldPositions = investmentStats.byFund.filter((fund) => Math.abs(Number(fund.units)) > 0.000001);
  const heldCodes = new Set(heldPositions.map((fund) => fund.code));
  const heldRows = investmentStats.rows.filter((record) => heldCodes.has(record.fundCode));
  const heldRecords = investmentRecords.filter((record) => heldCodes.has(record.fundCode));
  const heldFundSnapshots = enrichedFunds.filter((fund) => heldCodes.has(fund.code));
  const heldTotalAmount = heldPositions.reduce((sum, fund) => sum + fund.netAmount, 0);
  const heldTotalValue = heldPositions.reduce((sum, fund) => sum + fund.currentValue, 0);
  const heldTotalProfit = heldTotalValue - heldTotalAmount;
  const heldTotalReturn = Math.abs(heldTotalAmount) ? (heldTotalProfit / Math.abs(heldTotalAmount)) * 100 : 0;

  const fundSnapshot = heldFundSnapshots.map((fund, index) => {
    const fullHistory = historyMap[fund.code] || makeFallbackHistory(fund.code, MAX_HISTORY_DAYS);
    const periodCells = MARKET_SNAPSHOT_PERIODS.flatMap((period) => {
      const metrics = calcMetrics(fullHistory.slice(-period.days));
      return [formatPercent(metrics.rangeReturn), formatPercent(metrics.maxDrawdown)];
    });
    return `| ${index + 1} | ${fund.shortName} | ${fund.code} | ${fund.group} | ${Number(fund.quote?.dwjz || 0).toFixed(4)} | ${fund.navDate || fund.quote?.jzrq || '--'} | ${periodCells.join(' | ')} |`;
  }).join('\n') || '| -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |';

  const positionRows = heldPositions.map((fund, index) => (
    `| ${index + 1} | ${fund.name} | ${fund.code} | ${formatPlainNumber(fund.units, 4)} | ${fund.currentNav.toFixed(4)} | ${formatCurrency(fund.netAmount)} | ${formatCurrency(fund.currentValue)} | ${formatCurrency(fund.profit)} | ${formatPercent(fund.returnRate)} |`
  )).join('\n') || '| -- | -- | -- | -- | -- | -- | -- | -- | -- |';

  const recordRows = heldRows
    .slice()
    .sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`))
    .map((record, index) => (
      `| ${index + 1} | ${record.date} | ${transactionTypeLabel(record.type)} | ${record.fund.shortName} | ${record.fundCode} | ${formatCurrency(record.amount)} | ${record.nav.toFixed(4)} | ${record.navDate || '--'} | ${formatPlainNumber(record.units, 4)} | ${formatCurrency(record.currentValue)} | ${formatCurrency(record.profit)} | ${formatPercent(record.returnRate)} |`
    )).join('\n') || '| -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |';

  const rawRecords = heldRecords
    .slice()
    .sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`))
    .map((record) => ({
      type: transactionTypeLabel(record.type),
      date: record.date,
      fundCode: record.fundCode,
      amount: record.amount,
      nav: record.nav,
      navDate: record.navDate,
      currentNav: Number((quoteMap[record.fundCode] || FALLBACK_QUOTES[record.fundCode])?.dwjz || record.nav),
    }));

  const watchFunds = funds.filter((fund) => heldCodes.has(fund.code)).map((fund) => ({
    code: fund.code,
    name: fund.name,
    shortName: fund.shortName,
    group: fund.group,
    risk: fund.risk,
    tags: fund.tags,
  }));

  const structuredRawData = JSON.stringify({
    generatedAt,
    summary: {
      totalAmount: heldTotalAmount,
      totalValue: heldTotalValue,
      totalProfit: heldTotalProfit,
      totalReturn: heldTotalReturn,
    },
    watchFunds,
    positions: heldPositions,
    records: rawRecords,
  }, null, 2);

  return {
    generatedAt,
    heldPositions,
    heldRows,
    heldRecords,
    heldFundSnapshots,
    heldTotalAmount,
    heldTotalValue,
    heldTotalProfit,
    heldTotalReturn,
    positionRows,
    recordRows,
    fundSnapshot,
    marketRows: fundSnapshot,
    watchFunds,
    rawRecords,
    structuredRawData,
  };
}

function resolveTemplateExpression(expression, context) {
  const trimmed = expression.trim();
  const directValue = trimmed.split('.').reduce((value, key) => value?.[key], context);
  if (directValue !== undefined) return directValue;

  const currencyMatch = trimmed.match(/^formatCurrency\(([^)]+)\)$/);
  if (currencyMatch) return formatCurrency(resolveTemplateExpression(currencyMatch[1], context));

  const percentMatch = trimmed.match(/^formatPercent\(([^)]+)\)$/);
  if (percentMatch) return formatPercent(resolveTemplateExpression(percentMatch[1], context));

  return '';
}

function renderPromptTemplate(template, context) {
  return template.replace(/\$\{([^}]+)\}/g, (_, expression) => String(resolveTemplateExpression(expression, context) ?? ''));
}

async function loadPromptTemplate() {
  try {
    const response = await fetch(`${PROMPT_TEMPLATE_API}?t=${Date.now()}`);
    if (!response.ok) throw new Error('prompt template load failed');
    return response.text();
  } catch {
    return promptTemplateMarkdown;
  }
}

function buildFallbackInvestmentCopyText(context) {
  return `# 个人基金投资记录与规划分析输入

## 数据生成信息
- 生成时间：${context.generatedAt}
- 当前持仓基金数量：${context.heldPositions.length}
- 当前持仓相关交易记录数量：${context.heldRows.length}

## 投资统计汇总
- 净投入：${formatCurrency(context.heldTotalAmount)}
- 当前市值：${formatCurrency(context.heldTotalValue)}
- 浮动盈亏：${formatCurrency(context.heldTotalProfit)}
- 总收益率：${formatPercent(context.heldTotalReturn)}

## 当前持仓汇总
${context.positionRows}

## 当前持仓相关交易记录
${context.recordRows}

## 当前持仓基金行情与风险快照
${context.fundSnapshot}

## 结构化原始数据
\`\`\`json
${context.structuredRawData}
\`\`\`
`;
}

function fallbackCopyText(text) {
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      if (ok) resolve();
      else reject(new Error('copy failed'));
    } catch (error) {
      reject(error);
    }
  });
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to textarea copy when browser permissions block Clipboard API.
    }
  }

  await fallbackCopyText(text);
}

function EChart({ option, className }) {
  const ref = React.useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const chart = echarts.init(ref.current, null, { renderer: 'canvas' });
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} className={className} />;
}

function StockHoldingList({ rows, loading, fund }) {
  const nativeUi = Capacitor.isNativePlatform()
    || document.documentElement.classList.contains('capacitor-native');
  const [liveRows, setLiveRows] = useState(rows);
  const [quoteTime, setQuoteTime] = useState(formatSecondMoment);
  const usRelated = isUsRelatedFund(fund);
  const holdingEstimate = useMemo(() => calcHoldingEstimate(liveRows), [liveRows]);
  const canShowEstimate = !usRelated && holdingEstimate.count > 0;

  useEffect(() => {
    setLiveRows(rows);
  }, [rows]);

  useEffect(() => {
    if (!rows.length) return undefined;
    let active = true;
    let fetching = false;

    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const nextRows = await fetchStockQuotes(rows);
        if (!active) return;
        setLiveRows((currentRows) => {
          const currentMap = new Map(currentRows.map((row) => [row.code, row]));
          return nextRows.map((row) => {
            const current = currentMap.get(row.code);
            const currentPrice = Number(current?.price);
            const nextPrice = Number(row.price);
            const tick = Number.isFinite(currentPrice) && Number.isFinite(nextPrice)
              ? nextPrice - currentPrice
              : 0;
            return {
              ...row,
              tickDirection: tick > 0 ? 'up' : tick < 0 ? 'down' : current?.tickDirection || '',
              tickKey: tick ? Date.now() : current?.tickKey || 0,
            };
          });
        });
        setQuoteTime(formatSecondMoment());
      } finally {
        fetching = false;
      }
    };

    const timer = window.setInterval(refresh, nativeUi ? 3000 : 1000);
    refresh();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [nativeUi, rows]);

  return (
    <>
      <span className={`mini-badge holding-estimate-badge ${canShowEstimate ? changeClass(holdingEstimate.estimate) : 'flat'}`}>
        {usRelated ? '持仓估涨 不估' : canShowEstimate ? `持仓估涨 ${formatPercent(holdingEstimate.estimate)}` : '持仓估涨 --'}
        {!usRelated && canShowEstimate ? <small>覆盖 {formatPercent(holdingEstimate.coverage, 1)}</small> : null}
      </span>
      <span className="mini-badge stock-local-badge">{loading ? '读取中' : `个股行情 ${quoteTime}`}</span>
      <div className="stock-holding-list">
        {liveRows.map((stock, index) => {
          const sentiment = getSentiment(stock.change);
          return (
            <article className="stock-holding-row" key={`${stock.code}-${index}`}>
              <div className={`stock-rank ${changeClass(stock.change)}`}>{index + 1}</div>
              <div className="stock-main">
                <strong>{stock.name}</strong>
                <small>{stock.code}</small>
              </div>
              <div className={`stock-price ${stock.tickDirection ? `tick-${stock.tickDirection}` : ''}`}>
                <span>实时股价</span>
                <strong key={`${stock.code}-${stock.tickKey || 0}`}>{formatPrice(stock.price)}</strong>
              </div>
              <div className="stock-ratio">
                <span>占净值</span>
                <strong>{stock.ratio}</strong>
              </div>
              <div className="stock-value">
                <span>持仓市值</span>
                <strong>{formatHoldingValue(stock.value)}</strong>
              </div>
              <div className={`stock-sentiment ${sentiment.tone}`}>
                <span>舆情</span>
                <strong>{sentiment.label}</strong>
                <small>{sentiment.score === '--' ? '--' : `${sentiment.score}/100`}</small>
              </div>
              <div className={`stock-change ${changeClass(stock.change)}`}>
                <span>涨幅</span>
                <strong>{Number.isFinite(stock.change) ? formatPercent(stock.change) : '--'}</strong>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function usePriceTick(price) {
  const previousPriceRef = useRef(null);
  const [priceTick, setPriceTick] = useState('');

  useEffect(() => {
    const currentPrice = Number(price);
    if (!Number.isFinite(currentPrice)) return undefined;
    const previousPrice = previousPriceRef.current;
    previousPriceRef.current = currentPrice;
    if (!Number.isFinite(previousPrice) || currentPrice === previousPrice) return undefined;
    setPriceTick(currentPrice > previousPrice ? 'tick-up' : 'tick-down');
    const timer = window.setTimeout(() => setPriceTick(''), 900);
    return () => window.clearTimeout(timer);
  }, [price]);

  return priceTick;
}

function MarketQuoteTile({ config, item, featured = false }) {
  const priceTick = usePriceTick(item?.price);
  const change = Number(item?.change);
  return (
    <article className={`market-quote-tile ${featured ? 'featured' : ''} ${changeClass(change)}`}>
      <div className="market-quote-name">
        <strong>{config.name}</strong>
        <span>{config.symbol}</span>
      </div>
      <strong className={`market-quote-price ${priceTick}`}>{formatMarketPrice(item || config)}</strong>
      <div className="market-quote-meta">
        <span>{item?.marketSession || '读取中'}</span>
        <em className={changeClass(change)}>{Number.isFinite(change) ? formatPercent(change) : '--'}</em>
      </div>
    </article>
  );
}

function getRsiZoneLabel(value) {
  if (!Number.isFinite(value)) return '读取中';
  if (value > 70) return '超买';
  if (value >= 50) return '偏强';
  if (value >= 30) return '偏弱';
  return '超卖';
}

function formatGaugeDelta(value) {
  if (!Number.isFinite(value)) return '--';
  const absValue = Math.abs(value);
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${absValue.toFixed(2)}`;
}

function VolatilityGauge({ config, item }) {
  const change = Number(item?.change);
  const rawValue = Number(item?.price);
  const minValue = Number.isFinite(config?.min) ? Number(config.min) : 0;
  const maxValue = Number.isFinite(config?.max) ? Number(config.max) : 60;
  const valueRange = Math.max(1, maxValue - minValue);
  const barValue = Number.isFinite(rawValue) ? clamp(rawValue, minValue, maxValue) : null;
  const barPercent = Number.isFinite(barValue) ? ((barValue - minValue) / valueRange) * 100 : 0;
  const scaleMarks = Array.isArray(config?.scaleMarks) && config.scaleMarks.length
    ? config.scaleMarks
    : [{ value: 30, label: '30' }, { value: 50, label: '50' }, { value: 70, label: '70' }];
  const riskLabel = getRsiZoneLabel(rawValue);
  const scalePosition = (value) => `${clamp(((Number(value) - minValue) / valueRange) * 100, 0, 100)}%`;

  return (
    <article className={`volatility-gauge-card volatility-bar-card ${changeClass(change)}`}>
      <div className="volatility-gauge-head">
        <div>
          <span>{config.role}</span>
          <strong>{config.name}</strong>
        </div>
        <code>{config.symbol}</code>
      </div>

      <div className="volatility-bar-main">
        <div className="volatility-bar-value">
          <strong>{Number.isFinite(rawValue) ? rawValue.toFixed(2) : '--'}</strong>
          <span>{riskLabel}</span>
        </div>
        <div className="volatility-bar-track">
          {scaleMarks.map((mark) => (
            <i
              className="volatility-bar-tick"
              key={mark.label}
              style={{ left: scalePosition(mark.value) }}
            />
          ))}
          <i className="volatility-bar-marker" style={{ left: `${barPercent}%` }} />
        </div>
        <div className="volatility-bar-scale">
          {scaleMarks.map((mark) => (
            <span key={mark.label} style={{ left: scalePosition(mark.value) }}>{mark.label}</span>
          ))}
        </div>
      </div>

      <div className="volatility-gauge-footer">
        <span>较上一点</span>
        <span className={changeClass(change)}>{formatGaugeDelta(change)}</span>
      </div>
    </article>
  );
}

function DcaCalculatorCard({ plan }) {
  const isUnavailable = !plan || plan.status === 'unavailable';
  const fallbackOperationState = getChinaDcaOperationState(plan?.timestamp, plan?.dateText || plan?.date);
  const operationState = typeof plan?.operationState === 'object' && plan.operationState
    ? plan.operationState
    : fallbackOperationState;
  const isInvestWindow = operationState.isInvestWindow !== false;
  const score = Number(plan?.scores?.total);
  const invest = Number(plan?.dailyInvestRounded);
  const dynamic = Number(plan?.dynamicInvest);
  const factor = Number(plan?.dynamicFactor);
  const delta = Number(plan?.deltaInvest);
  const isInvestDimmed = !isUnavailable && !isInvestWindow;
  const priceTick = usePriceTick(!isUnavailable && !isInvestDimmed && Number.isFinite(invest) ? invest : null);
  const rowTemplates = [
    { key: 'ma200', label: 'MA200偏离', windowLabel: '200个交易日' },
    { key: 'drawdown', label: '52周回撤', windowLabel: '252个交易日高点' },
    { key: 'volatility', label: '30日波动', windowLabel: '30个交易日收益率' },
  ];
  const rows = Array.isArray(plan?.signals) && plan.signals.length ? plan.signals : rowTemplates;
  const statusText = isUnavailable ? '读取中' : null;
  const investText = statusText || (Number.isFinite(invest) ? invest.toFixed(0) : '--');
  const deltaText = isUnavailable
    ? '读取中'
    : `较上次${Number.isFinite(delta) ? ` ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}¥` : ' --'}`;
  const scoreText = Number.isFinite(score) ? score.toFixed(2) : '--';
  const factorText = Number.isFinite(factor) ? factor.toFixed(2) : '--';
  const dynamicText = Number.isFinite(dynamic) ? dynamic.toFixed(0) : '--';
  const sampleText = plan?.sample
    ? `${plan.sample.ma200 || '--'}/${plan.sample.drawdown || '--'}/${plan.sample.volatilityReturns || '--'}T`
    : '--';

  return (
    <article className={`dca-calculator-card ${isUnavailable ? 'loading' : changeClass(score)} ${isInvestDimmed ? 'outside-invest-window' : ''}`}>
      <div className="dca-card-head">
        <div>
          <span>最优增强 DCA · 今日计算</span>
        </div>
        <code>A40</code>
      </div>

      <div className="dca-invest-main">
        <strong className={`dca-invest-value ${priceTick}`}>{investText}</strong>
        <span>{statusText ? '' : '/ 100'}</span>
        <small className={`dca-invest-delta ${changeClass(delta)}`}>{deltaText}</small>
      </div>

      <div className="dca-score-strip">
        <span>固定 {isUnavailable ? '--' : DCA_STRATEGY_PARAMS.base}</span>
        <span>总分 {isUnavailable ? '--' : scoreText}</span>
        <span>系数 {isUnavailable ? '--' : factorText}</span>
        <span>动态 {isUnavailable ? '--' : dynamicText}</span>
      </div>

      <div className="dca-signal-grid">
        {rows.map((row) => {
          const rowScore = Number(row.score);
          const weight = Number(row.weight);
          const contribution = Number(row.contribution);
          return (
            <div className="dca-signal-row detailed" key={row.key || row.label}>
              <span className="dca-signal-name">
                <b>{row.label}</b>
                <small>{row.windowLabel}{Number.isFinite(weight) && !isUnavailable ? ` · w${weight.toFixed(1)}` : ''}</small>
              </span>
              <strong>{isUnavailable ? '--' : row.displayValue || '--'}</strong>
              <span className="dca-signal-calc">
                <em className={changeClass(rowScore)}>分 {isUnavailable ? '--' : Number.isFinite(rowScore) ? rowScore.toFixed(2) : '--'}</em>
                <em className={changeClass(contribution)}>贡 {isUnavailable ? '--' : Number.isFinite(contribution) ? `${contribution >= 0 ? '+' : ''}${contribution.toFixed(2)}` : '--'}</em>
              </span>
            </div>
          );
        })}
      </div>

      <div className="dca-card-footer stacked">
        <span>{isUnavailable ? '计算：40 + 60 × -- = 读取中' : `计算：40 + 60 × ${factorText} = ${investText}`}</span>
        <span>美东基准 {plan?.dateText || plan?.date || '--'} · 上次 {plan?.previousDateText || '--'} · 样本 {isUnavailable ? '--' : sampleText}</span>
      </div>
    </article>
  );
}

function NightMarketDashboard({ marketMap, loading, fetchedAt, onRefresh, rangeKey, onRangeChange }) {
  const nativeUi = Capacitor.isNativePlatform()
    || document.documentElement.classList.contains('capacitor-native');
  const nasdaq = marketMap.nasdaq || {};
  const priceTick = usePriceTick(nasdaq.price);
  const activeRange = resolveNdxTrendRange(rangeKey || nasdaq.trendRangeKey);
  const dataRangeMatches = (nasdaq.trendRangeKey || DEFAULT_NDX_TREND_RANGE) === activeRange.key;
  const series = dataRangeMatches && Array.isArray(nasdaq.series) ? nasdaq.series : [];
  const showLongTermIndicators = activeRange.key !== 'day';
  const ma200Series = showLongTermIndicators && dataRangeMatches && Array.isArray(nasdaq.ma200Series) ? nasdaq.ma200Series : [];
  const deviationSeries = showLongTermIndicators && dataRangeMatches && Array.isArray(nasdaq.deviationSeries) ? nasdaq.deviationSeries : [];
  const prices = series.map((item) => item[1]).filter(Number.isFinite);
  const quoteDayHigh = Number(nasdaq.dayHigh);
  const quoteDayLow = Number(nasdaq.dayLow);
  const sessionHigh = activeRange.key === DEFAULT_NDX_TREND_RANGE && isValidMarketNumber(quoteDayHigh)
    ? quoteDayHigh
    : prices.length ? Math.max(...prices) : null;
  const sessionLow = activeRange.key === DEFAULT_NDX_TREND_RANGE && isValidMarketNumber(quoteDayLow)
    ? quoteDayLow
    : prices.length ? Math.min(...prices) : null;
  const latestTimestamp = Math.max(0, ...Object.values(marketMap).map((item) => Number(item?.timestamp) || 0));
  const chartDataTimestamp = Number(series.at(-1)?.[0]) || Number(nasdaq.timestamp) || latestTimestamp;
  const dataTimeLabel = latestTimestamp
    ? new Date(latestTimestamp).toLocaleString('zh-CN', { hour12: false })
    : '--';
  const chartDataTimeLabel = chartDataTimestamp
    ? new Date(chartDataTimestamp).toLocaleString('zh-CN', { hour12: false })
    : '--';
  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('zh-CN', { hour12: false })
    : '--';
  const displayedChange = activeRange.key === DEFAULT_NDX_TREND_RANGE
    ? Number(nasdaq.change)
    : dataRangeMatches && Number.isFinite(Number(nasdaq.rangeChange))
      ? Number(nasdaq.rangeChange)
      : Number(nasdaq.change);
  const latestDeviation = Number(nasdaq.latestDeviation);
  const deviationAxisLimit = useMemo(() => {
    if (!showLongTermIndicators || !deviationSeries.length) return 100;
    const maxAbs = Math.max(
      0,
      ...deviationSeries
        .map((point) => Math.abs(Number(point?.[1])))
        .filter(Number.isFinite),
    );
    const padded = Math.max(maxAbs * 1.25, 5);
    return [10, 20, 30, 50, 75, 100, 150, 200].find((limit) => padded <= limit) || Math.ceil(padded / 50) * 50;
  }, [deviationSeries, showLongTermIndicators]);
  const lineColor = Number(displayedChange) >= 0 ? '#ff6b7a' : '#4ade80';

  const chartOption = useMemo(() => {
    const ma200Color = 'rgba(245, 216, 132, 0.9)';
    const deviationColor = 'rgba(214, 220, 232, 0.58)';
    const marker = (color) => `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};margin-right:8px;"></span>`;
    const formatXAxisLabel = (value) => {
      const date = new Date(value);
      if (activeRange.key === 'fiveYear') return String(date.getFullYear());
      if (activeRange.key === 'year') return `${date.getMonth() + 1}月`;
      if (activeRange.key === 'week' || activeRange.key === 'month') return `${date.getMonth() + 1}/${date.getDate()}`;
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return {
      animation: false,
      color: [lineColor, ma200Color, deviationColor],
      grid: { left: nativeUi ? 2 : 12, right: nativeUi ? 4 : 18, top: 24, bottom: nativeUi ? 14 : 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(12, 18, 32, 0.94)',
        borderColor: 'rgba(255,255,255,0.14)',
        textStyle: { color: '#fff' },
        axisPointer: { lineStyle: { color: 'rgba(255,255,255,0.58)', type: 'dashed' } },
        formatter: (params) => {
          const points = Array.isArray(params) ? params : [];
          const firstPoint = points[0];
          if (!firstPoint) return '';
          const time = new Date(firstPoint.value[0]).toLocaleString('zh-CN', { hour12: false });
          const colorMap = { 纳指100: lineColor, MA200: ma200Color, 偏离率: deviationColor };
          const rows = points.map((point) => {
            const value = Number(point.value?.[1]);
            if (!Number.isFinite(value)) return '';
            const formatted = point.seriesName === '偏离率'
              ? formatPercent(value)
              : value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `${marker(colorMap[point.seriesName] || point.color || '#fff')}${point.seriesName} ${formatted}`;
          }).filter(Boolean);
          return [time, ...rows].join('<br/>');
        },
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        splitNumber: nativeUi ? 4 : 6,
        minInterval: activeRange.key === 'day' && nativeUi ? 3 * 60 * 60 * 1000 : undefined,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(255,255,255,0.42)',
          fontSize: nativeUi ? 9 : 10,
          margin: nativeUi ? 7 : 8,
          hideOverlap: true,
          formatter: formatXAxisLabel,
        },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          scale: true,
          position: 'right',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: !nativeUi, color: 'rgba(255,255,255,0.42)', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.055)' } },
        },
        {
          type: 'value',
          min: -deviationAxisLimit,
          max: deviationAxisLimit,
          interval: deviationAxisLimit,
          position: 'left',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            show: false,
            color: 'rgba(214, 220, 232, 0.42)',
            fontSize: nativeUi ? 8 : 10,
            formatter: (value) => `${Number(value).toFixed(0)}%`,
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          type: 'line',
          name: '纳指100',
          data: series,
          showSymbol: false,
          smooth: activeRange.key === 'day' || activeRange.key === 'week' ? 0.12 : 0.18,
          connectNulls: true,
          itemStyle: { color: lineColor },
          lineStyle: { width: 2, color: lineColor, shadowBlur: 12, shadowColor: `${lineColor}55` },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: `${lineColor}36` }, { offset: 1, color: `${lineColor}02` }],
            },
          },
        },
        ...(ma200Series.length ? [{
          type: 'line',
          name: 'MA200',
          data: ma200Series,
          showSymbol: false,
          smooth: 0.16,
          connectNulls: true,
          itemStyle: { color: ma200Color },
          lineStyle: { width: 1.5, color: ma200Color },
          emphasis: { focus: 'series' },
        }] : []),
        ...(deviationSeries.length ? [{
          type: 'line',
          name: '偏离率',
          yAxisIndex: 1,
          data: deviationSeries,
          showSymbol: false,
          smooth: 0.16,
          connectNulls: true,
          itemStyle: { color: deviationColor },
          lineStyle: { width: 1.1, color: deviationColor },
          emphasis: { focus: 'series' },
        }] : []),
      ],
    };
  }, [activeRange.key, deviationAxisLimit, deviationSeries, lineColor, ma200Series, nativeUi, series, showLongTermIndicators]);

  return (
    <section className="glass-panel night-dashboard">
      <div className="panel-title night-dashboard-heading">
        <div>
          <p className="eyebrow"><Activity size={15} /> 纳指 100 指数</p>
          <h2>美股仪表盘</h2>
        </div>
        <div className="night-dashboard-actions">
          <span className="mini-badge" title={`最新数据时间 ${dataTimeLabel}`}>8 秒刷新 · 本次 {fetchedLabel}</span>
          <button className="icon-button" type="button" onClick={onRefresh} disabled={loading} title="刷新行情" aria-label="刷新行情">
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="futures-layout">
        <section className="futures-chart-card">
          <div className="futures-quote-row">
            <div className="futures-live-quote">
              <span>{nasdaq.domesticCode || nasdaq.symbol || '^NDX'} · {nasdaq.venue || 'Nasdaq'} · {nasdaq.sourceLabel || '读取中'}</span>
              <div className="futures-price-line">
                <strong className={`futures-live-price ${priceTick}`}>{loading && !series.length ? '读取中' : formatMarketPrice(nasdaq)}</strong>
                <small className={changeClass(displayedChange)}>{Number.isFinite(displayedChange) ? formatPercent(displayedChange) : '--'}</small>
              </div>
              <div className="futures-range-switch" aria-label="纳指100走势图区间">
                {NDX_TREND_RANGE_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.key}
                    className={option.key === activeRange.key ? 'selected' : ''}
                    onClick={() => onRangeChange(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="futures-session-stats">
              <span>区间高<strong>{formatMarketPrice({ price: sessionHigh })}</strong></span>
              <span>区间低<strong>{formatMarketPrice({ price: sessionLow })}</strong></span>
              <span>数据点<strong>{series.length || '--'}</strong></span>
            </div>
          </div>
          {series.length ? <EChart option={chartOption} className="futures-chart" /> : (
            <div className="futures-chart-empty">{loading ? '正在读取 1 分钟行情' : '当前纳指100行情暂不可用'}</div>
          )}
          <div className="futures-chart-meta">
            <span>{activeRange.rangeLabel}</span>
            <span>{activeRange.intervalLabel}</span>
            {showLongTermIndicators ? <span>偏离MA200 {Number.isFinite(latestDeviation) ? formatPercent(latestDeviation) : '--'}</span> : <span>日内走势</span>}
            <span>数据 {chartDataTimeLabel}</span>
          </div>
          <div className="lower-market-heading">
            <strong>实时联动行情</strong>
            <span>纳指100期货 + 七姐妹 · 含盘前盘后</span>
          </div>
          <div className="live-market-grid">
            <MarketQuoteTile
              config={NIGHT_MARKET_SIGNALS.find((item) => item.key === 'nasdaqFuture')}
              item={marketMap.nasdaqFuture}
              featured
            />
            {MAGNIFICENT_SEVEN.map((config) => (
              <MarketQuoteTile config={config} item={marketMap[config.key]} key={config.key} />
            ))}
          </div>
        </section>

        <aside className="volatility-column">
          <div className="volatility-heading">
            <p className="eyebrow">纳指定投</p>
            <small>RSI(14) + 今日增强 DCA 计算</small>
          </div>
          <VolatilityGauge
            config={RSI_SIGNAL_CONFIG}
            item={nasdaq.rsi14}
          />
          <DcaCalculatorCard plan={nasdaq.dcaPlan} />
        </aside>
      </div>

    </section>
  );
}

export default function App() {
  const nativeUi = Capacitor.isNativePlatform()
    || document.documentElement.classList.contains('capacitor-native');
  const initialWatchFunds = useMemo(loadWatchFundsBackup, []);
  const [funds, setFunds] = useState(initialWatchFunds);
  const [watchFundsReady, setWatchFundsReady] = useState(false);
  const [selectedCode, setSelectedCode] = useState(() => initialWatchFunds[0]?.code || DEFAULT_FUNDS[0].code);
  const [range, setRange] = useState(RANGE_OPTIONS[2]);
  const [quoteMap, setQuoteMap] = useState({});
  const [historyMap, setHistoryMap] = useState({});
  const [stockHoldingMap, setStockHoldingMap] = useState({});
  const [holdingLoading, setHoldingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nightMarketMap, setNightMarketMap] = useState(() => ({ ...VOLATILITY_FALLBACK_SEED }));
  const [nightMarketLoading, setNightMarketLoading] = useState(true);
  const [nightMarketFetchedAt, setNightMarketFetchedAt] = useState(0);
  const [nightTrendRangeKey, setNightTrendRangeKey] = useState(DEFAULT_NDX_TREND_RANGE);
  const [updatedAt, setUpdatedAt] = useState('');
  const [displayMode, setDisplayMode] = useState('nav');
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [investmentRecords, setInvestmentRecords] = useState(loadInvestmentRecordsBackup);
  const [investmentRecordsReady, setInvestmentRecordsReady] = useState(false);
  const [watchQuery, setWatchQuery] = useState('');
  const [addingFund, setAddingFund] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [selectedDailyDate, setSelectedDailyDate] = useState('');
  const [navManual, setNavManual] = useState(false);
  const [investmentForm, setInvestmentForm] = useState({
    type: 'buy',
    date: formatLocalDate(),
    fundCode: initialWatchFunds[0]?.code || DEFAULT_FUNDS[0].code,
    amount: '',
    nav: '',
  });

  const selectedFund = funds.find((fund) => fund.code === selectedCode) || funds[0] || DEFAULT_FUNDS[0];
  const selectedFullHistory = historyMap[selectedCode] || makeFallbackHistory(selectedCode, MAX_HISTORY_DAYS);
  const selectedQuote = quoteMap[selectedCode] || FALLBACK_QUOTES[selectedCode] || { dwjz: selectedFullHistory.at(-1)?.nav || '1.0000', gszzl: '0', jzrq: '--' };
  const selectedHistory = selectedFullHistory.slice(-range.days);
  const selectedMetrics = calcMetrics(selectedHistory);
  const selectedStockHolding = stockHoldingMap[selectedCode] || { date: '--', rows: [] };
  const selectedChangeColor = getChangeColor(selectedQuote?.gszzl);
  const selectedNavDate = resolveLatestNavDate(selectedQuote, selectedFullHistory);
  const chartStartDate = formatChartBoundary(selectedHistory[0]);
  const chartEndDate = formatChartBoundary(selectedHistory[selectedHistory.length - 1]);
  const formNav = useMemo(
    () => resolveNavForDate(investmentForm.fundCode, investmentForm.date, historyMap, quoteMap),
    [historyMap, investmentForm.date, investmentForm.fundCode, quoteMap],
  );
  const investmentStats = useMemo(
    () => buildInvestmentStats(investmentRecords, quoteMap, historyMap, funds),
    [funds, historyMap, investmentRecords, quoteMap],
  );
  const sortedInvestmentRows = useMemo(
    () => sortInvestmentRowsByRecent(investmentStats.rows),
    [investmentStats.rows],
  );
  const investmentHoldings = useMemo(
    () => investmentStats.byFund.filter((item) => Math.abs(item.units) > 0.000001 && item.currentValue > 0),
    [investmentStats.byFund],
  );
  const dailyProfitGrid = useMemo(
    () => buildDailyProfitGrid(investmentRecords, funds, historyMap),
    [funds, historyMap, investmentRecords],
  );
  const selectedDailyProfit = dailyProfitGrid.find((item) => item.date === selectedDailyDate) || dailyProfitGrid.at(-1);

  const enrichedFunds = useMemo(() => funds.map((fund) => {
    const fullHistory = historyMap[fund.code] || makeFallbackHistory(fund.code, MAX_HISTORY_DAYS);
    const quote = quoteMap[fund.code] || FALLBACK_QUOTES[fund.code] || { dwjz: fullHistory.at(-1)?.nav || '1.0000', gszzl: '0', jzrq: '--' };
    const metrics = calcMetrics(fullHistory.slice(-range.days));
    return {
      ...fund,
      quote,
      metrics,
      navDate: resolveLatestNavDate(quote, fullHistory),
    };
  }), [funds, historyMap, quoteMap, range.days]);

  const filteredFunds = useMemo(() => {
    const query = watchQuery.trim().toLowerCase();
    if (!query) return enrichedFunds;
    return enrichedFunds.filter((fund) => (
      fund.code.includes(query)
      || fund.name.toLowerCase().includes(query)
      || fund.shortName.toLowerCase().includes(query)
      || fund.group.toLowerCase().includes(query)
    ));
  }, [enrichedFunds, watchQuery]);

  const candidateCode = normalizeFundCode(watchQuery);
  const canAddFund = candidateCode.length === 6 && !funds.some((fund) => fund.code === candidateCode);

  const loadData = async (targetFunds = funds) => {
    setLoading(true);
    const quoteEntries = [];
    for (const fund of targetFunds) {
      try {
        const quote = await jsonpQuote(fund.code);
        quoteEntries.push([fund.code, quote]);
      } catch {
        quoteEntries.push([fund.code, FALLBACK_QUOTES[fund.code] || { dwjz: '1.0000', gszzl: '0', jzrq: '--' }]);
      }
    }

    const historyEntries = [];
    for (const fund of targetFunds) {
      try {
        const history = await historyScript(fund.code, MAX_HISTORY_DAYS);
        historyEntries.push([fund.code, history.length ? history : makeFallbackHistory(fund.code, MAX_HISTORY_DAYS)]);
      } catch {
        historyEntries.push([fund.code, makeFallbackHistory(fund.code, MAX_HISTORY_DAYS)]);
      }
    }

    const nextHistoryMap = Object.fromEntries(historyEntries);
    const rawQuoteMap = Object.fromEntries(quoteEntries);
    const nextQuoteMap = Object.fromEntries(
      targetFunds.map((fund) => [fund.code, enhanceQuoteWithHistory(fund.code, rawQuoteMap[fund.code], nextHistoryMap[fund.code])]),
    );

    setQuoteMap(nextQuoteMap);
    setHistoryMap(nextHistoryMap);
    setUpdatedAt(formatMinuteMoment());
    setLoading(false);
  };

  const refreshNightMarket = async () => {
    setNightMarketLoading(true);
    try {
      const snapshot = await fetchNightMarketSnapshot({ includeTrend: true, includeVolatility: true, trendRangeKey: nightTrendRangeKey });
      setNightMarketMap((current) => mergeNightMarketSnapshot(current, snapshot));
      setNightMarketFetchedAt(Date.now());
    } finally {
      setNightMarketLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    let refreshing = false;
    let cycle = 0;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const snapshot = await fetchNightMarketSnapshot({
          includeTrend: cycle % 8 === 0,
          includeVolatility: cycle % 8 === 0,
          trendRangeKey: nightTrendRangeKey,
        });
        cycle += 1;
        if (!active) return;
        setNightMarketMap((current) => mergeNightMarketSnapshot(current, snapshot));
        setNightMarketFetchedAt(Date.now());
        setNightMarketLoading(false);
      } finally {
        refreshing = false;
      }
    };
    refresh();
    const timer = window.setInterval(refresh, NIGHT_REFRESH_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [nightTrendRangeKey]);

  useEffect(() => {
    let timer = 0;
    let active = true;

    const scheduleMinuteRefresh = () => {
      timer = window.setTimeout(async () => {
        if (!active) return;
        await loadData(funds);
        if (active) scheduleMinuteRefresh();
      }, nextMinuteDelay());
    };

    scheduleMinuteRefresh();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [funds]);

  useEffect(() => {
    let active = true;

    fetchWatchFundsFile()
      .then(async (fileFunds) => {
        if (!active) return;
        const backupFunds = loadWatchFundsBackup();
        const hasFileFunds = fileFunds.length > 0;
        if (hasFileFunds) {
          setFunds(fileFunds);
          setSelectedCode((current) => fileFunds.some((fund) => fund.code === current) ? current : fileFunds[0]?.code || DEFAULT_FUNDS[0].code);
          setInvestmentForm((current) => ({
            ...current,
            fundCode: fileFunds.some((fund) => fund.code === current.fundCode) ? current.fundCode : fileFunds[0]?.code || DEFAULT_FUNDS[0].code,
          }));
        } else {
          setFunds(backupFunds);
          await persistWatchFundsFile(backupFunds);
        }
      })
      .catch(() => {
        if (!active) return;
        setFunds(loadWatchFundsBackup());
      })
      .finally(() => {
        if (active) setWatchFundsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadData(funds);
  }, [funds]);

  useEffect(() => {
    if (!watchFundsReady) return;
    persistWatchFundsFile(funds).catch(() => {
      localStorage.setItem(WATCH_FUNDS_KEY, JSON.stringify(funds));
    });
  }, [funds, watchFundsReady]);

  useEffect(() => {
    if (nativeUi) {
      setInvestmentRecordsReady(true);
      return undefined;
    }
    let active = true;

    fetchInvestmentRecordsFile()
      .then(async (fileRecords) => {
        if (!active) return;
        const backupRecords = loadInvestmentRecordsBackup();
        if (fileRecords.length || !backupRecords.length) {
          setInvestmentRecords(fileRecords);
        } else {
          setInvestmentRecords(backupRecords);
          await persistInvestmentRecordsFile(backupRecords);
        }
      })
      .catch(() => {
        if (!active) return;
        setInvestmentRecords(loadInvestmentRecordsBackup());
      })
      .finally(() => {
        if (active) setInvestmentRecordsReady(true);
      });

    return () => {
      active = false;
    };
  }, [nativeUi]);

  useEffect(() => {
    if (nativeUi) return;
    if (!investmentRecordsReady) return;
    persistInvestmentRecordsFile(investmentRecords).catch(() => {
      localStorage.setItem(INVESTMENT_RECORDS_KEY, JSON.stringify(investmentRecords));
    });
  }, [investmentRecords, investmentRecordsReady, nativeUi]);

  useEffect(() => {
    if (funds.some((fund) => fund.code === selectedCode)) return;
    setSelectedCode(funds[0]?.code || DEFAULT_FUNDS[0].code);
  }, [funds, selectedCode]);

  useEffect(() => {
    if (funds.some((fund) => fund.code === investmentForm.fundCode)) return;
    setInvestmentForm((current) => ({ ...current, fundCode: funds[0]?.code || DEFAULT_FUNDS[0].code }));
  }, [funds, investmentForm.fundCode]);

  useEffect(() => {
    if (!dailyProfitGrid.length) return;
    if (dailyProfitGrid.some((item) => item.date === selectedDailyDate)) return;
    setSelectedDailyDate(dailyProfitGrid.at(-1).date);
  }, [dailyProfitGrid, selectedDailyDate]);

  useEffect(() => {
    if (navManual) return;
    setInvestmentForm((current) => ({
      ...current,
      nav: Number(formNav.nav || 0).toFixed(4),
    }));
  }, [formNav.nav, navManual]);

  useEffect(() => {
    let active = true;
    if (stockHoldingMap[selectedCode]) return undefined;

    setHoldingLoading(true);
    stockHoldingScript(selectedCode)
      .then((result) => {
        if (!active) return;
        setStockHoldingMap((current) => ({ ...current, [selectedCode]: result }));
      })
      .finally(() => {
        if (active) setHoldingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCode, stockHoldingMap]);

  const addInvestmentRecord = (event) => {
    event.preventDefault();
    const amount = Number(investmentForm.amount);
    const nav = Number(investmentForm.nav || formNav.nav);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(nav) || nav <= 0) return;

    setInvestmentRecords((current) => [
      {
        id: crypto.randomUUID(),
        type: investmentForm.type,
        date: investmentForm.date,
        fundCode: investmentForm.fundCode,
        amount,
        nav: Number(nav.toFixed(4)),
        navDate: formNav.date,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setInvestmentForm((current) => ({ ...current, amount: '' }));
    setNavManual(false);
  };

  const removeInvestmentRecord = (id) => {
    setInvestmentRecords((current) => current.filter((record) => record.id !== id));
  };

  const addWatchFund = async (event) => {
    event.preventDefault();
    if (!canAddFund || addingFund) return;

    setAddingFund(true);
    try {
      let quote = null;
      try {
        quote = await jsonpQuote(candidateCode);
      } catch {
        quote = FALLBACK_QUOTES[candidateCode] || {};
      }
      const nextFund = mergeDefaultFund(createCustomFund(candidateCode, quote));
      setFunds((current) => {
        if (current.some((fund) => fund.code === nextFund.code)) return current;
        return [...current, nextFund];
      });
      setSelectedCode(nextFund.code);
      setWatchQuery('');
    } finally {
      setAddingFund(false);
    }
  };

  const removeWatchFund = (code) => {
    if (funds.length <= 1) return;
    const nextFunds = funds.filter((fund) => fund.code !== code);
    setFunds(nextFunds);
    setQuoteMap((current) => {
      const next = { ...current };
      delete next[code];
      return next;
    });
    setHistoryMap((current) => {
      const next = { ...current };
      delete next[code];
      return next;
    });
    setStockHoldingMap((current) => {
      const next = { ...current };
      delete next[code];
      return next;
    });
    if (selectedCode === code) setSelectedCode(nextFunds[0]?.code || DEFAULT_FUNDS[0].code);
  };

  const copyInvestmentBrief = async () => {
    const generatedAt = formatSecondMoment();
    const context = buildInvestmentTemplateContext({
      funds,
      enrichedFunds,
      investmentStats,
      investmentRecords,
      quoteMap,
      historyMap,
      generatedAt,
    });

    try {
      const template = await loadPromptTemplate();
      const text = renderPromptTemplate(template, context);
      await copyTextToClipboard(text);
      setCopyStatus('已复制');
    } catch {
      try {
        await copyTextToClipboard(buildFallbackInvestmentCopyText(context));
        setCopyStatus('已复制');
      } catch {
        setCopyStatus('复制失败');
      }
    }

    window.setTimeout(() => setCopyStatus(''), 1800);
  };

  const mainChartOption = useMemo(() => {
    const dates = selectedHistory.map((item) => item.date.slice(5));
    const values = selectedHistory.map((item) => item.nav);
    const returns = selectedHistory.map((item, index) => {
      if (index === 0) return 0;
      return Number((((item.nav - selectedHistory[0].nav) / selectedHistory[0].nav) * 100).toFixed(2));
    });
    const data = displayMode === 'nav' ? values : returns;
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const axisPadding = Math.max((maxValue - minValue) * 0.12, displayMode === 'nav' ? 0.02 : 1);
    return {
      animationDuration: 600,
      color: [selectedChangeColor],
      grid: { left: nativeUi ? 4 : 12, right: nativeUi ? 4 : 18, top: nativeUi ? 28 : 42, bottom: nativeUi ? 18 : 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(12, 18, 32, 0.94)',
        borderColor: 'rgba(255,255,255,0.14)',
        textStyle: { color: '#fff' },
        axisPointer: { lineStyle: { color: 'rgba(255,255,255,0.58)', type: 'dashed' } },
        valueFormatter: (value) => displayMode === 'nav' ? Number(value).toFixed(4) : formatPercent(value),
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(255,255,255,0.42)',
          margin: nativeUi ? 8 : 12,
          interval: 'auto',
          hideOverlap: true,
          showMinLabel: true,
          showMaxLabel: true,
          fontSize: nativeUi ? 9 : 10,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        position: 'right',
        min: Number((minValue - axisPadding).toFixed(displayMode === 'nav' ? 2 : 0)),
        max: Number((maxValue + axisPadding).toFixed(displayMode === 'nav' ? 2 : 0)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(255,255,255,0.42)',
          fontSize: nativeUi ? 9 : 10,
          formatter: (value) => displayMode === 'nav' ? Number(value).toFixed(2) : `${Number(value).toFixed(0)}%`,
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.055)' } },
      },
      series: [
        {
          type: 'line',
          name: displayMode === 'nav' ? '单位净值' : '区间收益',
          data,
          smooth: 0.18,
          showSymbol: false,
          itemStyle: { color: selectedChangeColor },
          lineStyle: { width: 2.2, color: selectedChangeColor, shadowBlur: 12, shadowColor: `${selectedChangeColor}55` },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${selectedChangeColor}36` },
              { offset: 0.65, color: `${selectedChangeColor}14` },
              { offset: 1, color: `${selectedChangeColor}00` },
            ]),
          },
        },
      ],
    };
  }, [displayMode, nativeUi, range.days, selectedChangeColor, selectedHistory]);

  return (
    <main className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero-band">
        <div>
          <p className="eyebrow"><Sparkles size={16} /> 基金看板</p>
          <h1>个人基金组合中枢</h1>
        </div>
        <div className="hero-actions">
          {!nativeUi && (
            <button className="icon-button" type="button" onClick={() => setInvestmentOpen(true)} title="投资记录" aria-label="投资记录">
              <ClipboardList size={19} />
            </button>
          )}
          <button className="icon-button" type="button" onClick={loadData} title="刷新数据" aria-label="刷新数据">
            <RefreshCw size={19} className={loading ? 'spin' : ''} />
          </button>
          <div className="status-pill">
            <CalendarClock size={16} />
            <span>{updatedAt || '等待更新'}</span>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="watch-panel glass-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow"><Layers3 size={15} /> 自选基金</p>
              <h2>观察列表</h2>
            </div>
            <span className="mini-badge">{loading ? '同步中' : `${funds.length} 支`}</span>
          </div>

          <form className="watch-search" onSubmit={addWatchFund}>
            <Search size={15} />
            <input
              type="search"
              inputMode="numeric"
              placeholder="搜索 / 输入基金代码"
              value={watchQuery}
              onChange={(event) => setWatchQuery(event.target.value)}
            />
            <button type="submit" disabled={!canAddFund || addingFund} title="加入自选" aria-label="加入自选">
              <Plus size={15} />
            </button>
          </form>

          <div className="fund-list">
            {filteredFunds.map((fund) => (
              <article
                className={`fund-row ${fund.code === selectedCode ? 'active' : ''}`}
                key={fund.code}
              >
                <button className="fund-select" type="button" onClick={() => setSelectedCode(fund.code)}>
                  <span className="fund-accent" style={{ background: getChangeColor(fund.quote?.gszzl), color: getChangeColor(fund.quote?.gszzl) }} />
                  <span className="fund-copy">
                    <strong>{fund.shortName}</strong>
                    <small>{fund.code} · {fund.group}</small>
                  </span>
                  <span className="fund-quote">
                    <strong>{Number(fund.quote?.dwjz || 0).toFixed(4)}</strong>
                    <small className={changeClass(fund.quote?.gszzl)}>{formatPercent(fund.quote?.gszzl)}</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="fund-remove"
                  type="button"
                  onClick={() => removeWatchFund(fund.code)}
                  disabled={funds.length <= 1}
                  title="删除自选"
                  aria-label={`删除${fund.shortName}`}
                >
                  <Trash2 size={14} />
                </button>
              </article>
            ))}
            {!filteredFunds.length && (
              <div className="watch-empty">
                <strong>没有匹配基金</strong>
                <span>输入 6 位基金代码后可加入自选。</span>
              </div>
            )}
          </div>
        </aside>

        <section className="chart-panel glass-panel">
          <div className="panel-title chart-heading">
            <div>
              <p className="eyebrow"><LineChart size={15} /> {selectedFund.code}</p>
              <h2>{selectedFund.name}</h2>
              <div className="tag-row">
                {selectedFund.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <div className="quote-block">
              <span>单位净值</span>
              <strong>{Number(selectedQuote?.dwjz || selectedMetrics.latestNav).toFixed(4)}</strong>
              <small className={changeClass(selectedQuote?.gszzl)}>
                {formatPercent(selectedQuote?.gszzl)}
              </small>
            </div>
          </div>

          <div className="toolbar chart-toolbar">
            <div className="segmented chart-segmented">
              {RANGE_OPTIONS.map((item) => (
                <button key={item.label} type="button" className={range.label === item.label ? 'selected' : ''} onClick={() => setRange(item)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="segmented chart-segmented chart-mode-switch">
              <button type="button" className={displayMode === 'nav' ? 'selected' : ''} onClick={() => setDisplayMode('nav')}>净值</button>
              <button type="button" className={displayMode === 'return' ? 'selected' : ''} onClick={() => setDisplayMode('return')}>收益</button>
            </div>
          </div>

          <div className="chart-range-meta">
            <span>{chartStartDate}</span>
            <i />
            <span>{chartEndDate}</span>
            <strong>{selectedHistory.length} 个数据点</strong>
          </div>

          <div className="chart-stage">
            <div className="metrics-strip chart-metrics-inline">
              <MetricMini label="区间收益" value={formatPercent(selectedMetrics.rangeReturn)} />
              <MetricMini label="最大回撤" value={formatPercent(selectedMetrics.maxDrawdown)} />
              <MetricMini label="年化波动" value={formatPercent(selectedMetrics.volatility)} />
              <MetricMini label="净值日期" value={selectedNavDate} />
            </div>
            <EChart option={mainChartOption} className="main-chart" />
          </div>
        </section>
      </section>

      <section className="planning-grid">
        <section className="glass-panel allocation-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow"><WalletCards size={15} /> 持仓情况</p>
              <h2>{selectedFund.shortName} · 股票持仓</h2>
            </div>
          </div>
          {selectedStockHolding.rows.length ? (
            <StockHoldingList rows={selectedStockHolding.rows} loading={holdingLoading} fund={selectedFund} />
          ) : (
            <div className="holding-empty">
              <strong>{holdingLoading ? '正在读取持仓明细' : '暂无公开股票持仓明细'}</strong>
              <span>{holdingLoading ? '正在连接基金公开披露数据。' : '该基金可能未披露股票明细，或主要通过 ETF、商品、债券、现金等资产完成配置。'}</span>
            </div>
          )}
        </section>
      </section>

      <NightMarketDashboard
        marketMap={nightMarketMap}
        loading={nightMarketLoading}
        fetchedAt={nightMarketFetchedAt}
        onRefresh={refreshNightMarket}
        rangeKey={nightTrendRangeKey}
        onRangeChange={(nextRangeKey) => {
          setNightTrendRangeKey(nextRangeKey);
          setNightMarketLoading(true);
        }}
      />

      {!nativeUi && investmentOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setInvestmentOpen(false)}>
          <section className="investment-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="investment-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow"><ClipboardList size={15} /> 投资记录</p>
                <h2 id="investment-title">个人投资统计</h2>
              </div>
              <div className="modal-actions">
                <button
                  className={`copy-brief-button ${copyStatus === '已复制' ? 'copied' : ''}`}
                  type="button"
                  onClick={copyInvestmentBrief}
                  title="复制投资分析输入"
                  aria-label="复制投资分析输入"
                >
                  {copyStatus === '已复制' ? <Check size={17} /> : <Copy size={17} />}
                  <span>{copyStatus || '复制分析包'}</span>
                </button>
                <button className="icon-button" type="button" onClick={() => setInvestmentOpen(false)} title="关闭" aria-label="关闭">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="investment-layout">
              <section className="record-panel">
                <form className="record-form" onSubmit={addInvestmentRecord}>
                  <div className="type-switch" role="group" aria-label="记录类型">
                    <button
                      type="button"
                      className={investmentForm.type === 'buy' ? 'selected' : ''}
                      onClick={() => setInvestmentForm((current) => ({ ...current, type: 'buy' }))}
                    >
                      买入
                    </button>
                    <button
                      type="button"
                      className={investmentForm.type === 'sell' ? 'selected' : ''}
                      onClick={() => setInvestmentForm((current) => ({ ...current, type: 'sell' }))}
                    >
                      卖出
                    </button>
                  </div>
                  <label>
                    <span>{transactionTypeLabel(investmentForm.type)}日期</span>
                    <input
                      type="date"
                      value={investmentForm.date}
                      onChange={(event) => {
                        setNavManual(false);
                        setInvestmentForm((current) => ({ ...current, date: event.target.value }));
                      }}
                    />
                  </label>
                  <label>
                    <span>基金</span>
                    <select
                      value={investmentForm.fundCode}
                      onChange={(event) => {
                        setNavManual(false);
                        setInvestmentForm((current) => ({ ...current, fundCode: event.target.value }));
                      }}
                    >
                      {funds.map((fund) => (
                        <option key={fund.code} value={fund.code}>{fund.shortName} · {fund.code}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{transactionTypeLabel(investmentForm.type)}金额</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={investmentForm.amount}
                      onChange={(event) => setInvestmentForm((current) => ({ ...current, amount: event.target.value }))}
                    />
                  </label>
                  <label className="nav-field">
                    <span>成交净值</span>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={investmentForm.nav}
                      onChange={(event) => {
                        setNavManual(true);
                        setInvestmentForm((current) => ({ ...current, nav: event.target.value }));
                      }}
                    />
                    <small>自动匹配 {Number(formNav.nav || 0).toFixed(4)} · {formNav.date}</small>
                  </label>
                  <button className="command-button" type="submit">
                    <Plus size={17} />
                    <span>新增记录</span>
                  </button>
                </form>

                <div className="record-list">
                  {sortedInvestmentRows.length ? sortedInvestmentRows.map((record) => (
                    <article className="record-row" key={record.id}>
                      <div>
                        <strong><span className={`record-type ${record.type}`}>{transactionTypeLabel(record.type)}</span>{record.fund.shortName}</strong>
                        <small>{record.date} · 成交净值 {record.nav.toFixed(4)}</small>
                      </div>
                      <div className="record-numbers">
                        <strong>{record.type === 'sell' ? '-' : '+'}{formatCurrency(record.amount)}</strong>
                        <small className={changeClass(record.profit)}>{formatProfitCurrency(record.profit)} · {formatPercent(record.returnRate)}</small>
                      </div>
                      <button type="button" className="ghost-button" onClick={() => removeInvestmentRecord(record.id)} title="删除记录" aria-label="删除记录">
                        <Trash2 size={15} />
                      </button>
                    </article>
                  )) : (
                    <div className="record-empty">
                      <strong>暂无记录</strong>
                      <span>新增买入或卖出记录后生成统计分析。</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="analysis-panel">
                <div className="analysis-metrics investment-summary-grid">
                  <MetricMini label="净投入" value={formatCurrency(investmentStats.totalAmount)} />
                  <MetricMini label="当前市值" value={formatCurrency(investmentStats.totalValue)} />
                  <MetricMini label="累计盈亏" value={formatProfitCurrency(investmentStats.totalProfit)} tone={investmentStats.totalProfit >= 0 ? 'up' : 'down'} />
                  <MetricMini label="收益率" value={formatPercent(investmentStats.totalReturn)} tone={investmentStats.totalReturn >= 0 ? 'up' : 'down'} />
                </div>

                {investmentStats.rows.length ? (
                  <div className="investment-analytics">
                    <div className="terminal-chart allocation-card compact">
                      <p className="eyebrow"><WalletCards size={14} /> 市值占比</p>
                      <div className="allocation-strip">
                        {investmentHoldings.map((item, index) => {
                          const percent = investmentStats.totalValue > 0 ? (item.currentValue / investmentStats.totalValue) * 100 : 0;
                          return (
                            <i
                              key={item.code}
                              style={{
                                width: `${Math.max(2, percent)}%`,
                                background: INVESTMENT_COLORS[index % INVESTMENT_COLORS.length],
                              }}
                              title={`${item.name} ${formatPercent(percent, 1)}`}
                            />
                          );
                        })}
                      </div>
                      <div className="allocation-strip-labels">
                        {investmentHoldings.map((item, index) => {
                          const percent = investmentStats.totalValue > 0 ? (item.currentValue / investmentStats.totalValue) * 100 : 0;
                          return (
                            <span key={item.code}>
                              <i style={{ background: INVESTMENT_COLORS[index % INVESTMENT_COLORS.length] }} />
                              {item.name} {formatPercent(percent, 1)}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="daily-grid-panel">
                      <div className="panel-inline-title">
                        <p className="eyebrow"><Activity size={14} /> 日期盈亏</p>
                        <strong className={changeClass(selectedDailyProfit?.totalProfit || 0)}>
                          {selectedDailyProfit?.date || '--'} · {formatProfitCurrency(selectedDailyProfit?.totalProfit || 0)}
                        </strong>
                      </div>
                      <div className="daily-profit-grid">
                        {dailyProfitGrid.map((day) => (
                          <button
                            className={`daily-profit-cell ${changeClass(day.totalProfit)} ${day.date === selectedDailyProfit?.date ? 'selected' : ''}`}
                            key={day.date}
                            type="button"
                            onClick={() => setSelectedDailyDate(day.date)}
                          >
                            <span>{day.date.slice(5)}</span>
                            <strong>{formatProfitCurrency(day.totalProfit)}</strong>
                          </button>
                        ))}
                      </div>
                      <div className="daily-detail-list compact">
                        {(selectedDailyProfit?.details || []).map((item) => (
                          <div className={`daily-detail-row ${changeClass(item.dailyProfit)}`} key={item.code}>
                            <strong>{item.name}</strong>
                            <small>{item.code} · {item.nav ? `净值 ${item.nav.toFixed(4)}` : '无当日净值'}</small>
                            <em>{formatProfitCurrency(item.dailyProfit)}</em>
                            <span>{formatPercent(item.dailyChange)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="terminal-chart console-profit-card">
                      <p className="eyebrow"><Activity size={14} /> 累计盈亏日志</p>
                      <div className="profit-console">
                        {investmentHoldings.map((item) => (
                          <div className={`profit-console-line ${changeClass(item.profit)}`} key={item.code}>
                            <span>{'>'}</span>
                            <strong>{item.name}</strong>
                            <code>{item.code}</code>
                            <em>{formatProfitCurrency(item.profit)}</em>
                            <small>{formatPercent(item.returnRate)}</small>
                            <small>净投入 {formatCurrency(item.netAmount)}</small>
                            <small>当前 {formatCurrency(item.currentValue)}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="analysis-empty">
                    <strong>等待记录输入</strong>
                    <span>统计区将根据当前净值计算持有份额、市值、盈亏与收益率。</span>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function MetricMini({ label, value, tone = '' }) {
  return (
    <div className={`metric-mini ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
