import { useStore } from '../store/useStore';
import type { Theme, PriceSource } from '../types';

export default function SettingsTab() {
  const { theme, setTheme, priceSource, setPriceSource } = useStore();

  return (
    <div className="settings-tab">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Appearance</h3>
        <label className="setting-row">
          <span>Theme</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="settings-section">
        <h3>Price Data Source</h3>
        <label className="setting-row">
          <span>Source</span>
          <select value={priceSource} onChange={(e) => setPriceSource(e.target.value as PriceSource)}>
            <option value="brapi">BRAPI (brapi.dev)</option>
            <option value="yahoo">Yahoo Finance</option>
          </select>
        </label>
        <p className="text-muted">
          {priceSource === 'brapi'
            ? 'BRAPI provides real-time stock quotes. Use tickers like PETR4, VALE3, AAPL.'
            : 'Yahoo Finance provides global stock data. Use tickers like AAPL, GOOGL, PETR4.SA.'}
        </p>
      </div>
    </div>
  );
}
