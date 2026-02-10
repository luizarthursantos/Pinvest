import { useRef } from 'react';
import { useStore } from '../store/useStore';
import ListEditor from './ListEditor';
import { exportToXlsx, importFromXlsx } from '../services/xlsxService';
import type { Theme, PriceSource } from '../types';

export default function SettingsTab() {
  const {
    theme, setTheme, priceSource, setPriceSource, brapiToken, setBrapiToken,
    groups, addGroup, renameGroup, removeGroup,
    subgroups, addSubgroup, renameSubgroup, removeSubgroup,
    custodies, addCustody, renameCustody, removeCustody,
    investments, importInvestments, clearAllData,
  } = useStore();

  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromXlsx(file);
      importInvestments(imported);
      alert(`Imported ${imported.length} investments.`);
    } catch {
      alert('Failed to import file.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

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

      <div className="settings-section">
        <h3>Import / Export</h3>
        <div className="setting-buttons">
          <button className="btn-secondary" onClick={() => exportToXlsx(investments)}>
            Export XLSX
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            Import XLSX
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
        <p className="text-muted">
          Export your investments to a spreadsheet or import from one.
        </p>
      </div>

      <div className="settings-section">
        <h3>Manage Lists</h3>
        <ListEditor title="Groups" items={groups} onRename={renameGroup} onRemove={removeGroup} onAdd={addGroup} />
        <ListEditor title="Subgroups" items={subgroups} onRename={renameSubgroup} onRemove={removeSubgroup} onAdd={addSubgroup} />
        <ListEditor title="Custodies" items={custodies} onRename={renameCustody} onRemove={removeCustody} onAdd={addCustody} />
      </div>

      <div className="settings-section settings-danger">
        <h3>Danger Zone</h3>
        <button
          className="btn-primary btn-danger-fill"
          onClick={() => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
              clearAllData();
            }
          }}
        >
          Clear All Data
        </button>
        <p className="text-muted">
          Permanently deletes all investments, groups, subgroups, custodies, and widgets.
        </p>
      </div>
    </div>
  );
}
