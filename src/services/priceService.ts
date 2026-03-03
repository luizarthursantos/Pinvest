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

  // Try batch first
  try {
    const resp = await fetch(buildBrapiUrl(brapiTickers, token));
    if (!resp.ok) throw new Error(`brapi ${resp.status}`);
    const data = await resp.json();
    parseBrapiResults(data.results ?? [], tickerMap, result);
  } catch (err) {
    console.error('brapi batch fetch error, falling back to individual:', err);
    // Fallback: fetch each ticker individually
    for (const ticker of brapiTickers) {
      try {
        const resp = await fetch(buildBrapiUrl([ticker], token));
        if (!resp.ok) {
          console.warn(`brapi skip ${ticker}: HTTP ${resp.status}`);
          continue;
        }
        const data = await resp.json();
        parseBrapiResults(data.results ?? [], tickerMap, result);
      } catch (e) {
        console.warn(`brapi skip ${ticker}:`, e);
      }
    }
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

export async function testBrapiConnection(token: string, tickers?: string[]): Promise<string> {
  const testTickers = tickers && tickers.length > 0 ? tickers : ['PETR4'];
  const lines: string[] = [];

  // Test batch
  const joined = testTickers.map((t) => stripSaSuffix(t)).join(',');
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  const url = `https://brapi.dev/api/quote/${joined}?fundamental=false${tokenParam}`;
  lines.push(`Tickers: ${testTickers.join(', ')}`);
  lines.push(`URL: ${url}`);

  try {
    const resp = await fetch(url);
    const status = resp.status;
    const text = await resp.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    if (!resp.ok) {
      lines.push(`BATCH FAILED: HTTP ${status}`);
      lines.push(`Response: ${JSON.stringify(parsed, null, 2)}`);
      return lines.join('\n');
    }

    const data = parsed as Record<string, unknown>;
    const results = (data.results as Array<Record<string, unknown>>) ?? [];
    lines.push(`HTTP ${status} - ${results.length}/${testTickers.length} results`);

    const found = new Set<string>();
    for (const item of results) {
      found.add(String(item.symbol).toUpperCase());
      lines.push(`  ${item.symbol}: R$ ${item.regularMarketPrice} (${item.regularMarketChangePercent}%)`);
    }

    const missing = testTickers.filter((t) => !found.has(stripSaSuffix(t).toUpperCase()));
    if (missing.length > 0) {
      lines.push(`Missing: ${missing.join(', ')}`);
    }
  } catch (err) {
    lines.push(`Network error: ${err instanceof Error ? err.message : String(err)}`);
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
