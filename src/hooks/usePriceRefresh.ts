import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { fetchPrices } from '../services/priceService';

export function usePriceRefresh() {
  const investments = useStore((s) => s.investments);
  const priceSource = useStore((s) => s.priceSource);
  const brapiToken = useStore((s) => s.brapiToken);
  const updatePrices = useStore((s) => s.updatePrices);

  const refresh = useCallback(async () => {
    const tickers = investments
      .filter((i) => i.type === 'stock' && i.ticker)
      .map((i) => i.ticker!);
    if (tickers.length === 0) return;
    const prices = await fetchPrices(tickers, priceSource, brapiToken);
    updatePrices(prices);
  }, [investments, priceSource, brapiToken, updatePrices]);

  return refresh;
}
