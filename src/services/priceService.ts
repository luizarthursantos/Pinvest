import type { PriceSource } from '../types';

export interface PriceData {
  price: number;
  change?: number;
  changePercent?: number;
}

function stripSaSuffix(ticker: string): string {
  return ticker.replace(/\.SA$/i, '');
}

async function fetchBrapi(tickers: string[], token: string): Promise<Record<string, PriceData>> {
  const result: Record<string, PriceData> = {};

  // BRAPI uses tickers without .SA suffix
  const tickerMap: Record<string, string> = {};
  const brapiTickers: string[] = [];
  for (const t of tickers) {
    const stripped = stripSaSuffix(t);
    tickerMap[stripped.toUpperCase()] = t;
    brapiTickers.push(stripped);
  }

  const joined = brapiTickers.join(',');
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  try {
    const resp = await fetch(`https://brapi.dev/api/quote/${joined}?fundamental=false${tokenParam}`);
    if (!resp.ok) throw new Error(`brapi ${resp.status}`);
    const data = await resp.json();
    for (const item of data.results ?? []) {
      if (item.symbol && typeof item.regularMarketPrice === 'number') {
        const original = tickerMap[item.symbol.toUpperCase()] ?? item.symbol.toUpperCase();
        result[original.toUpperCase()] = {
          price: item.regularMarketPrice,
          change: typeof item.regularMarketChange === 'number' ? item.regularMarketChange : undefined,
          changePercent: typeof item.regularMarketChangePercent === 'number' ? item.regularMarketChangePercent : undefined,
        };
      }
    }
  } catch (err) {
    console.error('brapi fetch error:', err);
  }
  return result;
}

async function fetchYahoo(tickers: string[]): Promise<Record<string, PriceData>> {
  const result: Record<string, PriceData> = {};
  const joined = tickers.join(',');
  try {
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${joined}`
    );
    if (!resp.ok) throw new Error(`yahoo ${resp.status}`);
    const data = await resp.json();
    for (const item of data.quoteResponse?.result ?? []) {
      if (item.symbol && typeof item.regularMarketPrice === 'number') {
        result[item.symbol.toUpperCase()] = {
          price: item.regularMarketPrice,
          change: typeof item.regularMarketChange === 'number' ? item.regularMarketChange : undefined,
          changePercent: typeof item.regularMarketChangePercent === 'number' ? item.regularMarketChangePercent : undefined,
        };
      }
    }
  } catch (err) {
    console.error('yahoo fetch error:', err);
  }
  return result;
}

export async function testBrapiConnection(token: string): Promise<string> {
  const ticker = 'PETR4';
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  const url = `https://brapi.dev/api/quote/${ticker}?fundamental=false${tokenParam}`;
  try {
    const resp = await fetch(url);
    const status = resp.status;
    const text = await resp.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    if (!resp.ok) {
      return `HTTP ${status}\nURL: ${url}\nResponse: ${JSON.stringify(parsed, null, 2)}`;
    }

    const data = parsed as Record<string, unknown>;
    const results = (data.results as Array<Record<string, unknown>>) ?? [];
    if (results.length === 0) {
      return `OK (${status}) but no results\nURL: ${url}\nResponse: ${JSON.stringify(parsed, null, 2)}`;
    }

    const item = results[0];
    return `OK - ${item.symbol}: R$ ${item.regularMarketPrice}\nChange: ${item.regularMarketChange} (${item.regularMarketChangePercent}%)\nURL: ${url}`;
  } catch (err) {
    return `Network error: ${err instanceof Error ? err.message : String(err)}\nURL: ${url}`;
  }
}

export async function fetchPrices(
  tickers: string[],
  source: PriceSource,
  brapiToken: string = ''
): Promise<Record<string, PriceData>> {
  if (tickers.length === 0) return {};
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];

  switch (source) {
    case 'brapi':
      return fetchBrapi(unique, brapiToken);
    case 'yahoo':
      return fetchYahoo(unique);
    default:
      return fetchBrapi(unique, brapiToken);
  }
}
