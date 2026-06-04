import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
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
  ArrowDownRight,
  ArrowUpRight,
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

const INVESTMENT_COLORS = ['#ff4b63', '#24ff72', '#7affaa', '#ff3158', '#86dca6', '#d8ffe8', '#0eb85b'];
const MAX_HISTORY_DAYS = Math.max(...RANGE_OPTIONS.map((item) => item.days || 0));
const INVESTMENT_RECORDS_KEY = 'fund-terminal-investment-records-v1';
const INVESTMENT_RECORDS_API = '/api/investment-records';
const PROMPT_TEMPLATE_API = '/api/prompt-template';
const WATCH_FUNDS_KEY = 'fund-terminal-watch-funds-v1';
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
  const closeSeries = Array.isArray(quote.close) ? quote.close.filter(isValidMarketNumber) : [];
  const price = isValidMarketNumber(meta.regularMarketPrice)
    ? Number(meta.regularMarketPrice)
    : closeSeries.at(-1);
  const previous = isValidMarketNumber(meta.previousClose)
    ? Number(meta.previousClose)
    : Number(meta.chartPreviousClose);

  if (!isValidMarketNumber(price)) return null;

  return {
    price,
    change: isValidMarketNumber(previous) ? ((price - previous) / previous) * 100 : null,
  };
}

function requestYahooJsonp(symbol) {
  return new Promise((resolve, reject) => {
    const callbackName = `yahoo_quote_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('yahoo quote timeout'));
    }, 8000);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      delete window[callbackName];
    };

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.src = `/api/yahoo-jsonp?cb=${callbackName}&symbol=${symbol}&ts=${Date.now()}`;
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
  if (quoteDate && quoteDate >= latestHistory.date) return baseQuote;

  return {
    ...baseQuote,
    dwjz: latestHistory.nav.toFixed(4),
    gsz: latestHistory.nav.toFixed(4),
    gszzl: Number.isFinite(latestHistory.change) ? String(latestHistory.change) : baseQuote.gszzl || '0',
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

function loadWatchFunds() {
  try {
    const raw = localStorage.getItem(WATCH_FUNDS_KEY);
    if (!raw) return DEFAULT_FUNDS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_FUNDS;
    const unique = new Map();
    parsed.forEach((fund) => {
      const code = normalizeFundCode(fund.code);
      if (code.length === 6) unique.set(code, mergeDefaultFund({ ...fund, code }));
    });
    return unique.size ? Array.from(unique.values()) : DEFAULT_FUNDS;
  } catch {
    localStorage.removeItem(WATCH_FUNDS_KEY);
    return DEFAULT_FUNDS;
  }
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
  const rows = records.map((record) => {
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
        .filter((record) => record.fundCode === code && record.date <= current.date)
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

function buildInvestmentTemplateContext({ funds, enrichedFunds, investmentStats, investmentRecords, quoteMap, generatedAt }) {
  const heldPositions = investmentStats.byFund.filter((fund) => Math.abs(Number(fund.units)) > 0.000001);
  const heldCodes = new Set(heldPositions.map((fund) => fund.code));
  const heldRows = investmentStats.rows.filter((record) => heldCodes.has(record.fundCode));
  const heldRecords = investmentRecords.filter((record) => heldCodes.has(record.fundCode));
  const heldFundSnapshots = enrichedFunds.filter((fund) => heldCodes.has(fund.code));
  const heldTotalAmount = heldPositions.reduce((sum, fund) => sum + fund.netAmount, 0);
  const heldTotalValue = heldPositions.reduce((sum, fund) => sum + fund.currentValue, 0);
  const heldTotalProfit = heldTotalValue - heldTotalAmount;
  const heldTotalReturn = Math.abs(heldTotalAmount) ? (heldTotalProfit / Math.abs(heldTotalAmount)) * 100 : 0;

  const fundSnapshot = heldFundSnapshots.map((fund, index) => (
    `| ${index + 1} | ${fund.shortName} | ${fund.code} | ${fund.group} | ${fund.risk} | ${Number(fund.quote?.dwjz || 0).toFixed(4)} | ${formatPercent(fund.quote?.gszzl)} | ${fund.navDate || fund.quote?.jzrq || '--'} | ${formatPercent(fund.metrics.rangeReturn)} | ${formatPercent(fund.metrics.maxDrawdown)} |`
  )).join('\n') || '| -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |';

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

function StockHoldingList({ rows, loading }) {
  const [liveRows, setLiveRows] = useState(rows);
  const [quoteTime, setQuoteTime] = useState(formatSecondMoment);

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

    const timer = window.setInterval(refresh, 1000);
    refresh();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [rows]);

  return (
    <>
      <span className="mini-badge stock-local-badge">{loading ? '读取中' : `个股行情 ${quoteTime}`}</span>
      <div className="stock-holding-list">
        {liveRows.map((stock, index) => {
          const sentiment = getSentiment(stock.change);
          return (
            <article className="stock-holding-row" key={`${stock.code}-${index}`}>
              <div className="stock-rank">{index + 1}</div>
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

export default function App() {
  const [funds, setFunds] = useState(loadWatchFunds);
  const [selectedCode, setSelectedCode] = useState(() => loadWatchFunds()[0]?.code || DEFAULT_FUNDS[0].code);
  const [range, setRange] = useState(RANGE_OPTIONS[2]);
  const [quoteMap, setQuoteMap] = useState({});
  const [historyMap, setHistoryMap] = useState({});
  const [stockHoldingMap, setStockHoldingMap] = useState({});
  const [holdingLoading, setHoldingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
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
    fundCode: loadWatchFunds()[0]?.code || DEFAULT_FUNDS[0].code,
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
    localStorage.setItem(WATCH_FUNDS_KEY, JSON.stringify(funds));
    loadData(funds);
  }, [funds]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!investmentRecordsReady) return;
    persistInvestmentRecordsFile(investmentRecords).catch(() => {
      localStorage.setItem(INVESTMENT_RECORDS_KEY, JSON.stringify(investmentRecords));
    });
  }, [investmentRecords, investmentRecordsReady]);

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
    const labelInterval = range.days <= 22 ? 2 : range.days <= 66 ? 6 : range.days <= 132 ? 12 : 24;

    return {
      animationDuration: 600,
      color: [selectedChangeColor],
      grid: { left: 8, right: 8, top: 24, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(5,12,8,0.92)',
        borderColor: 'rgba(36,255,114,0.55)',
        textStyle: { color: '#d8ffe8' },
        valueFormatter: (value) => displayMode === 'nav' ? Number(value).toFixed(4) : formatPercent(value),
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(36,255,114,0.28)' } },
        axisTick: { show: false },
        axisLabel: { color: '#7affaa', margin: 12, interval: labelInterval },
      },
      yAxis: {
        type: 'value',
        scale: true,
        min: Number((minValue - axisPadding).toFixed(displayMode === 'nav' ? 2 : 0)),
        max: Number((maxValue + axisPadding).toFixed(displayMode === 'nav' ? 2 : 0)),
        axisLabel: {
          color: '#7affaa',
          formatter: (value) => displayMode === 'nav' ? value.toFixed(2) : `${value.toFixed(0)}%`,
        },
        splitLine: { lineStyle: { color: 'rgba(36,255,114,0.12)' } },
      },
      series: [
        {
          type: 'line',
          name: displayMode === 'nav' ? '单位净值' : '区间收益',
          data,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 4, color: selectedChangeColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${selectedChangeColor}55` },
              { offset: 0.65, color: `${selectedChangeColor}16` },
              { offset: 1, color: `${selectedChangeColor}00` },
            ]),
          },
        },
      ],
    };
  }, [displayMode, range.days, selectedChangeColor, selectedHistory]);

  return (
    <main className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero-band">
        <div>
          <p className="eyebrow"><Sparkles size={16} /> 基金看板</p>
          <h1>个人基金组合中枢</h1>
          <p className="hero-copy">整合 {funds.length} 支自选基金的估值、净值趋势、关键指标与底层持仓，呈现轻量终端看板。</p>
        </div>
        <div className="hero-actions">
          <button className="icon-button" type="button" onClick={() => setInvestmentOpen(true)} title="投资记录" aria-label="投资记录">
            <ClipboardList size={19} />
          </button>
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

          <div className="toolbar">
            <div className="segmented">
              {RANGE_OPTIONS.map((item) => (
                <button key={item.label} type="button" className={range.label === item.label ? 'selected' : ''} onClick={() => setRange(item)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="segmented">
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

          <EChart option={mainChartOption} className="main-chart" />

          <div className="metrics-strip">
            <MetricMini label="区间收益" value={formatPercent(selectedMetrics.rangeReturn)} tone={selectedMetrics.rangeReturn >= 0 ? 'up' : 'down'} />
            <MetricMini label="最大回撤" value={formatPercent(selectedMetrics.maxDrawdown)} tone="down" />
            <MetricMini label="年化波动" value={formatPercent(selectedMetrics.volatility)} />
            <MetricMini label="净值日期" value={selectedNavDate} />
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
            <StockHoldingList rows={selectedStockHolding.rows} loading={holdingLoading} />
          ) : (
            <div className="holding-empty">
              <strong>{holdingLoading ? '正在读取持仓明细' : '暂无公开股票持仓明细'}</strong>
              <span>{holdingLoading ? '正在连接基金公开披露数据。' : '该基金可能未披露股票明细，或主要通过 ETF、商品、债券、现金等资产完成配置。'}</span>
            </div>
          )}
        </section>
      </section>

      <section className="glass-panel table-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow"><Activity size={15} /> 全量明细</p>
            <h2>基金数据表</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <colgroup>
              <col className="fund-col" />
              <col className="code-col" />
              <col className="nav-col" />
              <col className="change-col" />
              <col className="return-col" />
              <col className="drawdown-col" />
              <col className="risk-col" />
              <col className="group-col" />
            </colgroup>
            <thead>
              <tr>
                <th>基金</th>
                <th>代码</th>
                <th>单位净值</th>
                <th>估算涨跌</th>
                <th>区间收益</th>
                <th>最大回撤</th>
                <th>风险</th>
                <th>分类</th>
              </tr>
            </thead>
            <tbody>
              {enrichedFunds.map((fund) => (
                <tr key={fund.code} onClick={() => setSelectedCode(fund.code)}>
                  <td>
                    <strong>{fund.shortName}</strong>
                    <small>{fund.note}</small>
                  </td>
                  <td>{fund.code}</td>
                  <td>{Number(fund.quote?.dwjz || 0).toFixed(4)}</td>
                  <td className={changeClass(fund.quote?.gszzl)}>
                    <span className="return-cell">
                      {Number(fund.quote?.gszzl) >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                      {formatPercent(fund.quote?.gszzl)}
                    </span>
                  </td>
                  <td className={changeClass(fund.metrics.rangeReturn)}>{formatPercent(fund.metrics.rangeReturn)}</td>
                  <td className="down">{formatPercent(fund.metrics.maxDrawdown)}</td>
                  <td>{fund.risk}</td>
                  <td>{fund.group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {investmentOpen && (
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
                  {investmentStats.rows.length ? investmentStats.rows.map((record) => (
                    <article className="record-row" key={record.id}>
                      <div>
                        <strong><span className={`record-type ${record.type}`}>{transactionTypeLabel(record.type)}</span>{record.fund.shortName}</strong>
                        <small>{record.date} · 成交净值 {record.nav.toFixed(4)}</small>
                      </div>
                      <div className="record-numbers">
                        <strong>{record.type === 'sell' ? '-' : '+'}{formatCurrency(record.amount)}</strong>
                        <small className={changeClass(record.profit)}>{formatCurrency(record.profit)} · {formatPercent(record.returnRate)}</small>
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
                  <MetricMini label="累计盈亏" value={formatCurrency(investmentStats.totalProfit)} tone={investmentStats.totalProfit >= 0 ? 'up' : 'down'} />
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
                        <strong>{selectedDailyProfit?.date || '--'} · {formatCurrency(selectedDailyProfit?.totalProfit || 0)}</strong>
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
                            <strong>{formatCurrency(day.totalProfit)}</strong>
                          </button>
                        ))}
                      </div>
                      <div className="daily-detail-list compact">
                        {(selectedDailyProfit?.details || []).map((item) => (
                          <div className={`daily-detail-row ${changeClass(item.dailyProfit)}`} key={item.code}>
                            <strong>{item.name}</strong>
                            <small>{item.code} · {item.nav ? `净值 ${item.nav.toFixed(4)}` : '无当日净值'}</small>
                            <em>{formatCurrency(item.dailyProfit)}</em>
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
                            <em>{formatCurrency(item.profit)}</em>
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
