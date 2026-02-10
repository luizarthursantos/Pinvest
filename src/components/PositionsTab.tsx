import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { usePriceRefresh } from '../hooks/usePriceRefresh';
import { exportToXlsx, importFromXlsx } from '../services/xlsxService';
import AddInvestmentForm from './AddInvestmentForm';
import EditInvestmentForm from './EditInvestmentForm';

export default function PositionsTab() {
  const investments = useStore((s) => s.investments);
  const removeInvestment = useStore((s) => s.removeInvestment);
  const importInvestments = useStore((s) => s.importInvestments);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = usePriceRefresh();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromXlsx(file);
      importInvestments(imported);
    } catch (err) {
      alert('Failed to import file. Make sure it is a valid .xlsx file.');
      console.error(err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalValue = useMemo(
    () => investments.reduce((sum, i) => sum + i.quantity * i.currentPrice, 0),
    [investments]
  );

  const groupTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of investments) {
      map[i.group] = (map[i.group] || 0) + i.quantity * i.currentPrice;
    }
    return map;
  }, [investments]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const deltaClass = (val: number) =>
    val > 0.5 ? 'delta-positive' : val < -0.5 ? 'delta-negative' : 'delta-neutral';

  return (
    <div className="positions-tab">
      <div className="tab-header">
        <h2>Positions</h2>
        <div className="tab-actions">
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Add Investment
          </button>
          <button className="btn-secondary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
          <button className="btn-secondary" onClick={() => exportToXlsx(investments)} disabled={investments.length === 0}>
            Export .xlsx
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Import .xlsx
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="summary-cards">
        <div className="card">
          <span className="card-label">Total Value</span>
          <span className="card-value">{fmt(totalValue)}</span>
        </div>
        <div className="card">
          <span className="card-label">Positions</span>
          <span className="card-value">{investments.length}</span>
        </div>
        <div className="card">
          <span className="card-label">Groups</span>
          <span className="card-value">{Object.keys(groupTotals).length}</span>
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="empty-state">
          <p>No investments yet. Click "Add Investment" to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Ticker</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total Value</th>
                <th>% of Total</th>
                <th>Target Total %</th>
                <th>Delta Total</th>
                <th>Group</th>
                <th>% of Group</th>
                <th>Target Group %</th>
                <th>Delta Group</th>
                <th>Subgroup</th>
                <th>Custody</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => {
                const value = inv.quantity * inv.currentPrice;
                const pctTotal = totalValue > 0 ? (value / totalValue) * 100 : 0;
                const groupVal = groupTotals[inv.group] || 1;
                const pctGroup = groupVal > 0 ? (value / groupVal) * 100 : 0;
                const deltaTotal = pctTotal - inv.targetTotalWeight;
                const deltaGrp = pctGroup - inv.targetGroupWeight;

                return (
                  <tr key={inv.id} className="clickable-row" onClick={() => setEditId(inv.id)}>
                    <td className="cell-name">{inv.name}</td>
                    <td>
                      <span className={`badge badge-${inv.type}`}>
                        {inv.type === 'stock' ? 'Stock' : 'Other'}
                      </span>
                    </td>
                    <td>{inv.ticker || '-'}</td>
                    <td className="cell-number">{fmt(inv.currentPrice)}</td>
                    <td className="cell-number">{fmt(inv.quantity)}</td>
                    <td className="cell-number cell-value">{fmt(value)}</td>
                    <td className="cell-number">{pctTotal.toFixed(2)}%</td>
                    <td className="cell-number">{inv.targetTotalWeight.toFixed(2)}%</td>
                    <td className={`cell-number ${deltaClass(deltaTotal)}`}>
                      {pct(deltaTotal)}
                    </td>
                    <td>{inv.group}</td>
                    <td className="cell-number">{pctGroup.toFixed(2)}%</td>
                    <td className="cell-number">{inv.targetGroupWeight.toFixed(2)}%</td>
                    <td className={`cell-number ${deltaClass(deltaGrp)}`}>
                      {pct(deltaGrp)}
                    </td>
                    <td>{inv.subgroup}</td>
                    <td>{inv.custody}</td>
                    <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon" title="Edit" onClick={() => setEditId(inv.id)}>
                        &#9998;
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        title="Remove"
                        onClick={() => {
                          if (confirm(`Remove "${inv.name}"?`)) removeInvestment(inv.id);
                        }}
                      >
                        &#10005;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddInvestmentForm onClose={() => setShowAdd(false)} />}
      {editId && (
        <EditInvestmentForm
          investmentId={editId}
          onClose={() => setEditId(null)}
        />
      )}
    </div>
  );
}
