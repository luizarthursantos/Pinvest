import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { usePriceRefresh } from '../hooks/usePriceRefresh';
import AddInvestmentForm from './AddInvestmentForm';
import EditInvestmentForm from './EditInvestmentForm';
import ChartWidget from './ChartWidget';
import PivotTableWidget from './PivotTableWidget';
import type { Investment, AnalyticsChart, AnalyticsTable } from '../types';

const BADGE_COLORS = [
  'badge-blue', 'badge-green', 'badge-purple', 'badge-orange',
  'badge-pink', 'badge-teal', 'badge-red', 'badge-indigo',
];

function badgeColor(val: string): string {
  let h = 0;
  for (let i = 0; i < val.length; i++) h = ((h << 5) - h + val.charCodeAt(i)) | 0;
  return BADGE_COLORS[Math.abs(h) % BADGE_COLORS.length];
}

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
  { key: 'price', label: 'Price', className: 'cell-number', render: (inv, ctx) => inv.currentPrice ? ctx.fmt(inv.currentPrice) : '' },
  { key: 'qty', label: 'Qty', className: 'cell-number', render: (inv) => inv.quantity ? Math.round(inv.quantity).toLocaleString() : '' },
  { key: 'totalValue', label: 'Total', className: 'cell-number cell-value', render: (_inv, ctx) => ctx.value ? Math.round(ctx.value).toLocaleString() : '' },
  { key: 'pctTotal', label: '% Total', className: 'cell-number', render: (_inv, ctx) => ctx.pctTotal ? `${ctx.pctTotal.toFixed(1)}%` : '' },
  {
    key: 'targetTotal', label: 'Target Total %', className: 'cell-number',
    render: (inv) => inv.targetTotalWeight != null ? `${inv.targetTotalWeight.toFixed(1)}%` : '',
  },
  {
    key: 'deltaTotal', label: 'Delta Total', className: 'cell-number',
    render: (_inv, ctx) => ctx.deltaTotal != null
      ? <span className={ctx.deltaClass(ctx.deltaTotal)}>{ctx.pct(ctx.deltaTotal)}</span>
      : '',
  },
  { key: 'group', label: 'Group', render: (inv) => <span className={`badge ${badgeColor(inv.group)}`}>{inv.group}</span> },
  { key: 'pctType', label: '% Type', className: 'cell-number', render: (_inv, ctx) => ctx.pctType ? `${ctx.pctType.toFixed(1)}%` : '' },
  {
    key: 'targetType', label: 'Target Type %', className: 'cell-number',
    render: (inv) => inv.targetTypeWeight != null ? `${inv.targetTypeWeight.toFixed(1)}%` : '',
  },
  {
    key: 'deltaType', label: 'Delta Type', className: 'cell-number',
    render: (_inv, ctx) => ctx.deltaType != null
      ? <span className={ctx.deltaClass(ctx.deltaType)}>{ctx.pct(ctx.deltaType)}</span>
      : '',
  },
  { key: 'subgroup', label: 'Subgroup', render: (inv) => <span className={`badge ${badgeColor(inv.subgroup)}`}>{inv.subgroup}</span> },
  { key: 'custody', label: 'Custody', render: (inv) => <span className={`badge ${badgeColor(inv.custody)}`}>{inv.custody}</span> },
  {
    key: 'dailyChangePct', label: 'Day %', className: 'cell-number',
    render: (inv, ctx) => {
      const v = inv.dailyChangePercent;
      if (v == null || v === 0) return '';
      return <span className={ctx.deltaClass(v)}>{ctx.pct(v)}</span>;
    },
  },
  {
    key: 'dailyChangeVal', label: 'Day', className: 'cell-number',
    render: (inv, ctx) => {
      const v = inv.dailyChange;
      if (v == null) return '';
      const totalChange = v * inv.quantity;
      if (totalChange === 0) return '';
      return <span className={ctx.deltaClass(totalChange)}>{Math.round(totalChange).toLocaleString()}</span>;
    },
  },
];

const COLUMN_MAP = new Map(ALL_COLUMNS.map((c) => [c.key, c]));

export default function PositionsTab() {
  const investments = useStore((s) => s.investments);
  const removeInvestment = useStore((s) => s.removeInvestment);
  const positionColumns = useStore((s) => s.positionColumns);
  const setPositionColumns = useStore((s) => s.setPositionColumns);
  const widgets = useStore((s) => s.widgets);
  const favoriteWidgets = useMemo(() => widgets.filter((w) => w.favorite), [widgets]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showColConfig, setShowColConfig] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [compact, setCompact] = useState(true);
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

  const lastUpdate = useMemo(() => {
    const dates = investments.map((i) => i.lastPriceUpdate).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.reduce((a, b) => (a > b ? a : b));
  }, [investments]);

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
    {
      let weightedPct = 0;
      let weightSum = 0;
      let hasAny = false;
      for (const inv of investments) {
        if (inv.quantity > 0 && inv.dailyChangePercent != null) {
          const w = inv.quantity * inv.currentPrice;
          weightedPct += inv.dailyChangePercent * w;
          weightSum += w;
          hasAny = true;
        }
      }
      totals.dailyChangePct = hasAny && weightSum > 0 ? weightedPct / weightSum : null;
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
        <div>
          <h2 style={{ marginBottom: 0 }}>Positions</h2>
          {lastUpdate && (
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
              Prices: {new Date(lastUpdate).toLocaleString()}
            </span>
          )}
        </div>
        <div className="tab-actions">
          <button className="btn-secondary btn-sq" title="Refresh Prices" onClick={handleRefresh} disabled={refreshing}>
            <svg className={refreshing ? 'icon-spin' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          </button>
          <button className={`btn-secondary btn-sq ${compact ? 'btn-active' : ''}`} title="Compact View" onClick={() => setCompact(!compact)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8h18M3 12h18M3 16h18"/></svg>
          </button>
          <button
            className={`btn-secondary btn-sq ${editMode ? 'btn-active' : ''}`}
            title={editMode ? 'Done' : 'Edit'}
            onClick={() => { setEditMode(!editMode); if (editMode) setShowColConfig(false); }}
          >
            {editMode
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            }
          </button>
          {editMode && (
            <>
              <button className="btn-primary btn-sq" title="Add Investment" onClick={() => setShowAdd(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <button
                className={`btn-secondary btn-sq ${showColConfig ? 'btn-active' : ''}`}
                title={showColConfig ? 'Hide Columns' : 'Configure Columns'}
                onClick={() => setShowColConfig(!showColConfig)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

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
        <div className={`table-container${compact ? ' table-compact' : ''}`}>
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
                  if (val == null || val === 0) return <td key={col.key} className={col.className}></td>;
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

      {favoriteWidgets.length > 0 && (
        <div className="fav-widgets-grid">
          {favoriteWidgets.map((w) => (
            <div key={w.id} className="fav-widget-card">
              <div className="widget-body">
                {w.kind === 'chart' ? (
                  <ChartWidget widget={w as AnalyticsChart} compact interactive={false} />
                ) : (
                  <PivotTableWidget widget={w as AnalyticsTable} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddInvestmentForm onClose={() => setShowAdd(false)} />}
      {editId && (
        <EditInvestmentForm investmentId={editId} onClose={() => setEditId(null)} />
      )}
    </div>
  );
}
