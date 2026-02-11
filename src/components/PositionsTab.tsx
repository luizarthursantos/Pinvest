import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { usePriceRefresh } from '../hooks/usePriceRefresh';
import AddInvestmentForm from './AddInvestmentForm';
import EditInvestmentForm from './EditInvestmentForm';
import type { Investment } from '../types';

interface ColumnDef {
  key: string;
  label: string;
  render: (inv: Investment, ctx: RowCtx) => React.ReactNode;
  className?: string;
}

interface RowCtx {
  value: number;
  pctTotal: number;
  pctGroup: number;
  deltaTotal: number | null;
  deltaGrp: number | null;
  fmt: (n: number) => string;
  pct: (n: number) => string;
  deltaClass: (n: number) => string;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', render: (inv) => <span className="cell-name">{inv.name}</span> },
  {
    key: 'type', label: 'Type',
    render: (inv) => <span className={`badge badge-${inv.type}`}>{inv.type === 'stock' ? 'Stock' : 'Other'}</span>,
  },
  { key: 'ticker', label: 'Ticker', render: (inv) => inv.ticker || '-' },
  { key: 'price', label: 'Price', className: 'cell-number', render: (inv, ctx) => ctx.fmt(inv.currentPrice) },
  { key: 'qty', label: 'Qty', className: 'cell-number', render: (inv) => Math.round(inv.quantity).toLocaleString() },
  { key: 'totalValue', label: 'Total Value', className: 'cell-number cell-value', render: (_inv, ctx) => Math.round(ctx.value).toLocaleString() },
  { key: 'pctTotal', label: '% of Total', className: 'cell-number', render: (_inv, ctx) => `${ctx.pctTotal.toFixed(2)}%` },
  {
    key: 'targetTotal', label: 'Target Total %', className: 'cell-number',
    render: (inv) => inv.targetTotalWeight != null ? `${inv.targetTotalWeight.toFixed(2)}%` : '-',
  },
  {
    key: 'deltaTotal', label: 'Delta Total', className: 'cell-number',
    render: (_inv, ctx) => ctx.deltaTotal != null
      ? <span className={ctx.deltaClass(ctx.deltaTotal)}>{ctx.pct(ctx.deltaTotal)}</span>
      : '-',
  },
  { key: 'group', label: 'Group', render: (inv) => inv.group },
  { key: 'pctGroup', label: '% of Group', className: 'cell-number', render: (_inv, ctx) => `${ctx.pctGroup.toFixed(2)}%` },
  {
    key: 'targetGroup', label: 'Target Group %', className: 'cell-number',
    render: (inv) => inv.targetGroupWeight != null ? `${inv.targetGroupWeight.toFixed(2)}%` : '-',
  },
  {
    key: 'deltaGroup', label: 'Delta Group', className: 'cell-number',
    render: (_inv, ctx) => ctx.deltaGrp != null
      ? <span className={ctx.deltaClass(ctx.deltaGrp)}>{ctx.pct(ctx.deltaGrp)}</span>
      : '-',
  },
  { key: 'subgroup', label: 'Subgroup', render: (inv) => inv.subgroup },
  { key: 'custody', label: 'Custody', render: (inv) => inv.custody },
  {
    key: 'dailyChangePct', label: 'Day %', className: 'cell-number',
    render: (inv, ctx) => {
      const v = inv.dailyChangePercent;
      if (v == null) return '-';
      return <span className={ctx.deltaClass(v)}>{ctx.pct(v)}</span>;
    },
  },
  {
    key: 'dailyChangeVal', label: 'Day Value', className: 'cell-number',
    render: (inv, ctx) => {
      const v = inv.dailyChange;
      if (v == null) return '-';
      const totalChange = v * inv.quantity;
      return <span className={ctx.deltaClass(v)}>{Math.round(totalChange).toLocaleString()}</span>;
    },
  },
];

const COLUMN_MAP = new Map(ALL_COLUMNS.map((c) => [c.key, c]));

export default function PositionsTab() {
  const investments = useStore((s) => s.investments);
  const removeInvestment = useStore((s) => s.removeInvestment);
  const positionColumns = useStore((s) => s.positionColumns);
  const setPositionColumns = useStore((s) => s.setPositionColumns);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showColConfig, setShowColConfig] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = usePriceRefresh();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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

  const visibleCols = useMemo(
    () => positionColumns.map((k) => COLUMN_MAP.get(k)).filter(Boolean) as ColumnDef[],
    [positionColumns]
  );

  const toggleColumn = (key: string) => {
    if (positionColumns.includes(key)) {
      setPositionColumns(positionColumns.filter((k) => k !== key));
    } else {
      setPositionColumns([...positionColumns, key]);
    }
  };

  const moveColumn = (key: string, dir: -1 | 1) => {
    const idx = positionColumns.indexOf(key);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= positionColumns.length) return;
    const cols = [...positionColumns];
    [cols[idx], cols[newIdx]] = [cols[newIdx], cols[idx]];
    setPositionColumns(cols);
  };

  return (
    <div className="positions-tab">
      <div className="tab-header">
        <h2>Positions</h2>
        <div className="tab-actions">
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Add
          </button>
          <button className="btn-secondary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
          <button
            className={`btn-secondary ${editMode ? 'btn-active' : ''}`}
            onClick={() => { setEditMode(!editMode); if (editMode) setShowColConfig(false); }}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="card">
          <span className="card-label">Total Value</span>
          <span className="card-value">{Math.round(totalValue).toLocaleString()}</span>
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

      {editMode && (
        <div className="col-config-toggle">
          <button
            className={`btn-secondary ${showColConfig ? 'btn-active' : ''}`}
            onClick={() => setShowColConfig(!showColConfig)}
          >
            {showColConfig ? 'Hide Columns' : 'Configure Columns'}
          </button>
        </div>
      )}

      {showColConfig && (
        <div className="col-config-panel">
          <div className="col-config-list">
            {positionColumns.map((key, idx) => {
              const col = COLUMN_MAP.get(key);
              if (!col) return null;
              return (
                <div key={key} className="col-config-item">
                  <label>
                    <input type="checkbox" checked onChange={() => toggleColumn(key)} />
                    {col.label}
                  </label>
                  <div className="col-config-arrows">
                    <button className="btn-icon" disabled={idx === 0} onClick={() => moveColumn(key, -1)} title="Move up">&#9650;</button>
                    <button className="btn-icon" disabled={idx === positionColumns.length - 1} onClick={() => moveColumn(key, 1)} title="Move down">&#9660;</button>
                  </div>
                </div>
              );
            })}
            {ALL_COLUMNS.filter((c) => !positionColumns.includes(c.key)).map((col) => (
              <div key={col.key} className="col-config-item col-config-hidden">
                <label>
                  <input type="checkbox" checked={false} onChange={() => toggleColumn(col.key)} />
                  {col.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="empty-state">
          <p>No investments yet. Click "+ Add" to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {visibleCols.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                {editMode && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => {
                const value = inv.quantity * inv.currentPrice;
                const pctTotal = totalValue > 0 ? (value / totalValue) * 100 : 0;
                const groupVal = groupTotals[inv.group] || 1;
                const pctGroup = groupVal > 0 ? (value / groupVal) * 100 : 0;
                const deltaTotal = inv.targetTotalWeight != null ? pctTotal - inv.targetTotalWeight : null;
                const deltaGrp = inv.targetGroupWeight != null ? pctGroup - inv.targetGroupWeight : null;
                const ctx: RowCtx = { value, pctTotal, pctGroup, deltaTotal, deltaGrp, fmt, pct, deltaClass };

                return (
                  <tr
                    key={inv.id}
                    className={editMode ? 'clickable-row' : ''}
                    onClick={editMode ? () => setEditId(inv.id) : undefined}
                  >
                    {visibleCols.map((col) => (
                      <td key={col.key} className={col.className}>{col.render(inv, ctx)}</td>
                    ))}
                    {editMode && (
                      <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon" title="Edit" onClick={() => setEditId(inv.id)}>&#9998;</button>
                        <button
                          className="btn-icon btn-danger"
                          title="Remove"
                          onClick={() => { if (confirm(`Remove "${inv.name}"?`)) removeInvestment(inv.id); }}
                        >&#10005;</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddInvestmentForm onClose={() => setShowAdd(false)} />}
      {editId && (
        <EditInvestmentForm investmentId={editId} onClose={() => setEditId(null)} />
      )}
    </div>
  );
}
