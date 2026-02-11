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
  pctType: number;
  deltaTotal: number | null;
  deltaType: number | null;
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
  { key: 'pctTotal', label: '% of Total', className: 'cell-number', render: (_inv, ctx) => `${ctx.pctTotal.toFixed(1)}%` },
  {
    key: 'targetTotal', label: 'Target Total %', className: 'cell-number',
    render: (inv) => inv.targetTotalWeight != null ? `${inv.targetTotalWeight.toFixed(1)}%` : '-',
  },
  {
    key: 'deltaTotal', label: 'Delta Total', className: 'cell-number',
    render: (_inv, ctx) => ctx.deltaTotal != null
      ? <span className={ctx.deltaClass(ctx.deltaTotal)}>{ctx.pct(ctx.deltaTotal)}</span>
      : '-',
  },
  { key: 'group', label: 'Group', render: (inv) => inv.group },
  { key: 'pctType', label: '% of Type', className: 'cell-number', render: (_inv, ctx) => `${ctx.pctType.toFixed(1)}%` },
  {
    key: 'targetType', label: 'Target Type %', className: 'cell-number',
    render: (inv) => inv.targetTypeWeight != null ? `${inv.targetTypeWeight.toFixed(1)}%` : '-',
  },
  {
    key: 'deltaType', label: 'Delta Type', className: 'cell-number',
    render: (_inv, ctx) => ctx.deltaType != null
      ? <span className={ctx.deltaClass(ctx.deltaType)}>{ctx.pct(ctx.deltaType)}</span>
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
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
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

  const typeTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of investments) {
      map[i.type] = (map[i.type] || 0) + i.quantity * i.currentPrice;
    }
    return map;
  }, [investments]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  const deltaClass = (val: number) =>
    val > 0.5 ? 'delta-positive' : val < -0.5 ? 'delta-negative' : 'delta-neutral';

  const visibleCols = useMemo(
    () => positionColumns.map((k) => COLUMN_MAP.get(k)).filter(Boolean) as ColumnDef[],
    [positionColumns]
  );

  const totalsRow = useMemo(() => {
    const totals: Record<string, number | null> = {};
    const sumTotalValue = totalValue;
    totals.totalValue = sumTotalValue;
    totals.pctTotal = 100;
    totals.pctType = 100;

    // Sum of all target weights (weighted average doesn't make sense; sum shows allocation)
    let sumTargetTotal = 0;
    let hasTargetTotal = false;
    let sumTargetType = 0;
    let hasTargetType = false;
    let sumDailyChangeVal = 0;
    let hasDailyChangeVal = false;

    for (const inv of investments) {
      if (inv.targetTotalWeight != null) {
        sumTargetTotal += inv.targetTotalWeight;
        hasTargetTotal = true;
      }
      if (inv.targetTypeWeight != null) {
        sumTargetType += inv.targetTypeWeight;
        hasTargetType = true;
      }
      if (inv.dailyChange != null) {
        sumDailyChangeVal += inv.dailyChange * inv.quantity;
        hasDailyChangeVal = true;
      }
    }

    totals.targetTotal = hasTargetTotal ? sumTargetTotal : null;
    totals.deltaTotal = hasTargetTotal ? sumTargetTotal - 100 : null;
    totals.targetType = hasTargetType ? sumTargetType : null;
    totals.deltaType = hasTargetType ? sumTargetType - 100 : null;
    totals.dailyChangeVal = hasDailyChangeVal ? sumDailyChangeVal : null;

    // Weighted average daily change %
    if (sumTotalValue > 0) {
      let weightedPct = 0;
      let hasAny = false;
      for (const inv of investments) {
        if (inv.dailyChangePercent != null) {
          const w = (inv.quantity * inv.currentPrice) / sumTotalValue;
          weightedPct += inv.dailyChangePercent * w;
          hasAny = true;
        }
      }
      totals.dailyChangePct = hasAny ? weightedPct : null;
    } else {
      totals.dailyChangePct = null;
    }

    return totals;
  }, [investments, totalValue]);

  const getSortValue = (inv: Investment, key: string): number | string => {
    const value = inv.quantity * inv.currentPrice;
    switch (key) {
      case 'name': return inv.name.toLowerCase();
      case 'type': return inv.type;
      case 'ticker': return (inv.ticker || '').toLowerCase();
      case 'price': return inv.currentPrice;
      case 'qty': return inv.quantity;
      case 'totalValue': return value;
      case 'pctTotal': return totalValue > 0 ? value / totalValue : 0;
      case 'targetTotal': return inv.targetTotalWeight ?? -Infinity;
      case 'deltaTotal': {
        const pt = totalValue > 0 ? (value / totalValue) * 100 : 0;
        return inv.targetTotalWeight != null ? inv.targetTotalWeight - pt : -Infinity;
      }
      case 'group': return inv.group.toLowerCase();
      case 'pctType': {
        const tv = typeTotals[inv.type] || 1;
        return value / tv;
      }
      case 'targetType': return inv.targetTypeWeight ?? -Infinity;
      case 'deltaType': {
        const tv = typeTotals[inv.type] || 1;
        const pt = (value / tv) * 100;
        return inv.targetTypeWeight != null ? inv.targetTypeWeight - pt : -Infinity;
      }
      case 'subgroup': return inv.subgroup.toLowerCase();
      case 'custody': return inv.custody.toLowerCase();
      case 'dailyChangePct': return inv.dailyChangePercent ?? -Infinity;
      case 'dailyChangeVal': return (inv.dailyChange ?? 0) * inv.quantity;
      default: return 0;
    }
  };

  const sortedInvestments = useMemo(() => {
    if (!sortKey) return investments;
    return [...investments].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      let cmp: number;
      if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb);
      } else {
        cmp = (va as number) - (vb as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments, sortKey, sortDir, totalValue, typeTotals]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

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
          <span className="card-label">Types</span>
          <span className="card-value">{Object.keys(typeTotals).length}</span>
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
                  <th
                    key={col.key}
                    className="sortable-th"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : ''}
                  </th>
                ))}
                {editMode && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              <tr className="row-total">
                {visibleCols.map((col) => {
                  const TOTAL_KEYS = new Set([
                    'totalValue', 'pctTotal', 'targetTotal', 'deltaTotal',
                    'pctType', 'targetType', 'deltaType',
                    'dailyChangePct', 'dailyChangeVal',
                  ]);
                  if (!TOTAL_KEYS.has(col.key)) {
                    return <td key={col.key} className={col.className}>{col.key === 'name' ? 'Total' : ''}</td>;
                  }
                  const val = totalsRow[col.key];
                  if (val == null) return <td key={col.key} className={col.className}>-</td>;
                  let content: React.ReactNode;
                  if (col.key === 'totalValue') {
                    content = Math.round(val).toLocaleString();
                  } else if (col.key === 'dailyChangeVal') {
                    content = <span className={deltaClass(val)}>{Math.round(val).toLocaleString()}</span>;
                  } else if (col.key === 'dailyChangePct') {
                    content = <span className={deltaClass(val)}>{pct(val)}</span>;
                  } else if (col.key === 'deltaTotal' || col.key === 'deltaType') {
                    content = <span className={deltaClass(val)}>{pct(val)}</span>;
                  } else {
                    content = `${val.toFixed(1)}%`;
                  }
                  return <td key={col.key} className={col.className}>{content}</td>;
                })}
                {editMode && <td />}
              </tr>
              {sortedInvestments.map((inv) => {
                const value = inv.quantity * inv.currentPrice;
                const pctTotal = totalValue > 0 ? (value / totalValue) * 100 : 0;
                const typeVal = typeTotals[inv.type] || 1;
                const pctType = typeVal > 0 ? (value / typeVal) * 100 : 0;
                const deltaTotal = inv.targetTotalWeight != null ? inv.targetTotalWeight - pctTotal : null;
                const deltaType = inv.targetTypeWeight != null ? inv.targetTypeWeight - pctType : null;
                const ctx: RowCtx = { value, pctTotal, pctType, deltaTotal, deltaType, fmt, pct, deltaClass };

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
