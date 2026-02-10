import type { PriceSource } from '../types';

async function fetchBrapi(tickers: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const joined = tickers.join(',');
  try {
    const resp = await fetch(`https://brapi.dev/api/quote/${joined}?fundamental=false`);
    if (!resp.ok) throw new Error(`brapi ${resp.status}`);
    const data = await resp.json();
    for (const item of data.results ?? []) {
      if (item.symbol && typeof item.regularMarketPrice === 'number') {
        result[item.symbol.toUpperCase()] = item.regularMarketPrice;
      }
    }
  } catch (err) {
    console.error('brapi fetch error:', err);
  }
  return result;
}

async function fetchYahoo(tickers: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const joined = tickers.join(',');
  try {
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${joined}`
    );
    if (!resp.ok) throw new Error(`yahoo ${resp.status}`);
    const data = await resp.json();
    for (const item of data.quoteResponse?.result ?? []) {
      if (item.symbol && typeof item.regularMarketPrice === 'number') {
        result[item.symbol.toUpperCase()] = item.regularMarketPrice;
      }
    }
  } catch (err) {
    console.error('yahoo fetch error:', err);
  }
  return result;
}

export async function fetchPrices(
  tickers: string[],
  source: PriceSource
): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];

  switch (source) {
    case 'brapi':
      return fetchBrapi(unique);
    case 'yahoo':
      return fetchYahoo(unique);
    default:
      return fetchBrapi(unique);
  }
}
