import { useStore } from '../store/useStore';
import type { Theme, PriceSource } from '../types';

export default function SettingsTab() {
  const { theme, setTheme, priceSource, setPriceSource, brapiToken, setBrapiToken } = useStore();

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
            ? 'BRAPI provides real-time stock quotes. Use tickers like PETR4, VALE3, ITUB4 (without .SA).'
            : 'Yahoo Finance provides global stock data. Use tickers like AAPL, GOOGL, PETR4.SA.'}
        </p>

        {priceSource === 'brapi' && (
          <div className="setting-token">
            <label className="setting-row">
              <span>BRAPI Token</span>
              <input
                type="text"
                value={brapiToken}
                onChange={(e) => setBrapiToken(e.target.value.trim())}
                placeholder="Your brapi.dev token"
              />
            </label>
            <p className="text-muted">
              Get a free token at brapi.dev. Required for price quotes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
