import type { PriceSource } from '../types';

export interface PriceData {
  price: number;
  change?: number;
  changePercent?: number;
}

function stripSaSuffix(ticker: string): string {
  return ticker.replace(/\.SA$/i, '');
}

function buildBrapiUrl(brapiTickers: string[], token: string): string {
  const joined = brapiTickers.join(',');
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return `https://brapi.dev/api/quote/${joined}?fundamental=false${tokenParam}`;
}

function parseBrapiResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[],
  tickerMap: Record<string, string>,
  result: Record<string, PriceData>
) {
  for (const item of items) {
    if (item.symbol && typeof item.regularMarketPrice === 'number') {
      const original = tickerMap[item.symbol.toUpperCase()] ?? item.symbol.toUpperCase();
      result[original.toUpperCase()] = {
        price: item.regularMarketPrice,
        change: typeof item.regularMarketChange === 'number' ? item.regularMarketChange : undefined,
        changePercent: typeof item.regularMarketChangePercent === 'number' ? item.regularMarketChangePercent : undefined,
      };
    }
  }
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

  // Free tier only supports 1 ticker per request — fetch all in parallel
  const fetches = brapiTickers.map(async (ticker) => {
    try {
      const resp = await fetch(buildBrapiUrl([ticker], token));
      if (!resp.ok) {
        console.warn(`brapi skip ${ticker}: HTTP ${resp.status}`);
        return;
      }
      const data = await resp.json();
      parseBrapiResults(data.results ?? [], tickerMap, result);
    } catch (e) {
      console.warn(`brapi skip ${ticker}:`, e);
    }
  });

  await Promise.all(fetches);
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

export async function testBrapiConnection(token: string, tickers?: string[]): Promise<string> {
  const testTickers = tickers && tickers.length > 0 ? tickers : ['PETR4'];
  const lines: string[] = [];
  lines.push(`Testing ${testTickers.length} ticker(s)...`);

  const ok: string[] = [];
  const failed: string[] = [];

  // Fetch each ticker individually (free tier limit)
  const fetches = testTickers.map(async (t) => {
    const stripped = stripSaSuffix(t);
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const url = `https://brapi.dev/api/quote/${stripped}?fundamental=false${tokenParam}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        failed.push(`${t}: HTTP ${resp.status}`);
        return;
      }
      const data = await resp.json();
      const item = data.results?.[0];
      if (item && typeof item.regularMarketPrice === 'number') {
        ok.push(`${item.symbol}: R$ ${item.regularMarketPrice} (${item.regularMarketChangePercent}%)`);
      } else {
        failed.push(`${t}: no price data`);
      }
    } catch (err) {
      failed.push(`${t}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  await Promise.all(fetches);

  lines.push(`OK: ${ok.length}/${testTickers.length}`);
  for (const line of ok) lines.push(`  ${line}`);
  if (failed.length > 0) {
    lines.push(`Failed: ${failed.length}`);
    for (const line of failed) lines.push(`  ${line}`);
  }

  return lines.join('\n');
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
