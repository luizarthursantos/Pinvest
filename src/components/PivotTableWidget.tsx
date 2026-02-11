import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { AnalyticsTable, Investment } from '../types';

function getCategoryValue(inv: Investment, cat: string): string {
  switch (cat) {
    case 'group': return inv.group;
    case 'subgroup': return inv.subgroup;
    case 'custody': return inv.custody;
    case 'type': return inv.type;
    case 'name': return inv.name;
    case 'ticker': return inv.ticker || '-';
    default: return '';
  }
}

function categoryLabel(c: string) {
  switch (c) {
    case 'name': return 'Name';
    case 'ticker': return 'Ticker';
    default: return c.charAt(0).toUpperCase() + c.slice(1);
  }
}

function applyFilters(investments: Investment[], filters: Record<string, string[]>) {
  return investments.filter((inv) => {
    for (const [cat, vals] of Object.entries(filters)) {
      if (vals.length > 0 && !vals.includes(getCategoryValue(inv, cat))) return false;
    }
    return true;
  });
}

function getMetricValue(inv: Investment, metric: string, totalValue: number, groupTotals: Record<string, number>): number {
  switch (metric) {
    case 'totalValue': return inv.quantity * inv.currentPrice;
    case 'quantity': return inv.quantity;
    case 'currentPrice': return inv.currentPrice;
    case 'pctTotal': return totalValue > 0 ? (inv.quantity * inv.currentPrice / totalValue) * 100 : 0;
    case 'pctGroup': {
      const gv = groupTotals[inv.group] || 1;
      return (inv.quantity * inv.currentPrice / gv) * 100;
    }
    case 'dailyReturn': return (inv.dailyChange ?? 0) * inv.quantity;
    case 'dailyReturnPct': return inv.dailyChangePercent ?? 0;
    default: return 0;
  }
}

function getCompositeKey(inv: Investment, categories: string[]): string {
  return categories.map((c) => getCategoryValue(inv, c)).join(' / ');
}

type DisplayRow =
  | { type: 'data'; levels: string[]; showLevels: boolean[]; colValues: Record<string, number>; total: number }
  | { type: 'subtotal'; level: number; label: string; colValues: Record<string, number>; total: number }
  | { type: 'grandTotal'; colValues: Record<string, number>; total: number };

export default function PivotTableWidget({ widget }: { widget: AnalyticsTable }) {
  const investments = useStore((s) => s.investments);

  const rowCats = widget.rowCategories;
  const colCats = widget.columnCategories;

  const { cols, displayRows } = useMemo(() => {
    const filtered = applyFilters(investments, widget.filters);
    const totalValue = filtered.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
    const groupTotals: Record<string, number> = {};
    for (const i of filtered) {
      groupTotals[i.group] = (groupTotals[i.group] || 0) + i.quantity * i.currentPrice;
    }

    // Build leaf rows keyed by row-level tuple
    const leafMap = new Map<string, { levels: string[]; colValues: Record<string, number>; total: number }>();
    const colSet = new Set<string>();

    for (const inv of filtered) {
      const levels = rowCats.map((c) => getCategoryValue(inv, c));
      const rowKey = levels.join('\0');
      const colKey = colCats.length > 0 ? getCompositeKey(inv, colCats) : 'Value';
      colSet.add(colKey);
      if (!leafMap.has(rowKey)) {
        leafMap.set(rowKey, { levels, colValues: {}, total: 0 });
      }
      const leaf = leafMap.get(rowKey)!;
      const val = getMetricValue(inv, widget.metric, totalValue, groupTotals);
      leaf.colValues[colKey] = (leaf.colValues[colKey] || 0) + val;
      leaf.total += val;
    }

    const cols = [...colSet].sort();
    const leafRows = [...leafMap.values()].sort((a, b) => {
      for (let i = 0; i < rowCats.length; i++) {
        const cmp = a.levels[i].localeCompare(b.levels[i]);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    // Build display rows with subtotals and outline info
    const displayRows: DisplayRow[] = [];
    const prev: string[] = new Array(rowCats.length).fill('');
    const subs: { colValues: Record<string, number>; total: number }[] =
      rowCats.map(() => ({ colValues: {}, total: 0 }));

    const emitSubtotals = (fromLevel: number) => {
      for (let i = rowCats.length - 2; i >= fromLevel; i--) {
        displayRows.push({
          type: 'subtotal',
          level: i,
          label: prev[i],
          colValues: { ...subs[i].colValues },
          total: subs[i].total,
        });
        subs[i] = { colValues: {}, total: 0 };
      }
    };

    let prevData: string[] = new Array(rowCats.length).fill('\0');

    for (const leaf of leafRows) {
      let changedLevel = rowCats.length;
      for (let i = 0; i < rowCats.length; i++) {
        if (leaf.levels[i] !== prev[i]) {
          changedLevel = i;
          break;
        }
      }

      if (displayRows.length > 0 && changedLevel < rowCats.length) {
        emitSubtotals(changedLevel);
      }

      // Determine which levels to show (outline)
      let firstChanged = rowCats.length;
      for (let i = 0; i < rowCats.length; i++) {
        if (leaf.levels[i] !== prevData[i]) {
          firstChanged = i;
          break;
        }
      }
      const showLevels = rowCats.map((_, li) => li >= firstChanged);
      prevData = [...leaf.levels];

      displayRows.push({
        type: 'data',
        levels: leaf.levels,
        showLevels,
        colValues: leaf.colValues,
        total: leaf.total,
      });

      for (let i = 0; i < rowCats.length; i++) {
        for (const [col, val] of Object.entries(leaf.colValues)) {
          subs[i].colValues[col] = (subs[i].colValues[col] || 0) + val;
        }
        subs[i].total += leaf.total;
        prev[i] = leaf.levels[i];
      }
    }

    if (leafRows.length > 0) {
      emitSubtotals(0);
    }

    // Grand total
    const grandColValues: Record<string, number> = {};
    let grandTotal = 0;
    for (const leaf of leafRows) {
      for (const [col, val] of Object.entries(leaf.colValues)) {
        grandColValues[col] = (grandColValues[col] || 0) + val;
      }
      grandTotal += leaf.total;
    }
    displayRows.push({ type: 'grandTotal', colValues: grandColValues, total: grandTotal });

    return { cols, displayRows };
  }, [investments, widget, rowCats, colCats]);

  const fmt = (widget.metric === 'totalValue' || widget.metric === 'quantity' || widget.metric === 'dailyReturn')
    ? (n: number) => Math.round(n).toLocaleString()
    : widget.metric === 'dailyReturnPct'
      ? (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
      : (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="pivot-table-container">
      <table className="pivot-table">
        <thead>
          <tr>
            {rowCats.map((c) => <th key={c}>{categoryLabel(c)}</th>)}
            {cols.map((c) => <th key={c}>{c}</th>)}
            <th className="cell-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, idx) => {
            if (row.type === 'data') {
              return (
                <tr key={`d-${idx}`}>
                  {row.levels.map((val, li) => (
                    <td key={li} className="cell-header">
                      {row.showLevels[li] ? val : ''}
                    </td>
                  ))}
                  {cols.map((c) => (
                    <td key={c} className="cell-number">{fmt(row.colValues[c] || 0)}</td>
                  ))}
                  <td className="cell-number cell-total">{fmt(row.total)}</td>
                </tr>
              );
            }

            if (row.type === 'subtotal') {
              const spanCols = rowCats.length - row.level;
              return (
                <tr key={`s-${idx}`} className="row-subtotal">
                  {row.level > 0 && <td colSpan={row.level} className="cell-header" />}
                  <td colSpan={spanCols} className="cell-header cell-subtotal-label">
                    {row.label} Total
                  </td>
                  {cols.map((c) => (
                    <td key={c} className="cell-number cell-total">{fmt(row.colValues[c] || 0)}</td>
                  ))}
                  <td className="cell-number cell-total">{fmt(row.total)}</td>
                </tr>
              );
            }

            return (
              <tr key="grand" className="row-total">
                <td colSpan={rowCats.length} className="cell-header">Total</td>
                {cols.map((c) => (
                  <td key={c} className="cell-number cell-total">{fmt(row.colValues[c] || 0)}</td>
                ))}
                <td className="cell-number cell-total cell-grand">{fmt(row.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
