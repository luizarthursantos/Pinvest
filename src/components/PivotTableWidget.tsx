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
    default: return 0;
  }
}

function metricLabel(m: string) {
  switch (m) {
    case 'totalValue': return 'Total Value';
    case 'quantity': return 'Quantity';
    case 'currentPrice': return 'Price';
    case 'pctTotal': return '% of Total';
    case 'pctGroup': return '% of Group';
    default: return m;
  }
}

export default function PivotTableWidget({ widget }: { widget: AnalyticsTable }) {
  const investments = useStore((s) => s.investments);

  const { rows, cols, data, rowTotals, colTotals, grandTotal } = useMemo(() => {
    const filtered = applyFilters(investments, widget.filters);
    const totalValue = filtered.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
    const groupTotals: Record<string, number> = {};
    for (const i of filtered) {
      groupTotals[i.group] = (groupTotals[i.group] || 0) + i.quantity * i.currentPrice;
    }

    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const pivotData: Record<string, Record<string, number>> = {};

    for (const inv of filtered) {
      const r = getCategoryValue(inv, widget.rowCategory);
      const c = getCategoryValue(inv, widget.columnCategory);
      rowSet.add(r);
      colSet.add(c);
      if (!pivotData[r]) pivotData[r] = {};
      pivotData[r][c] = (pivotData[r][c] || 0) + getMetricValue(inv, widget.metric, totalValue, groupTotals);
    }

    const rows = [...rowSet].sort();
    const cols = [...colSet].sort();

    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (const r of rows) {
      rowTotals[r] = 0;
      for (const c of cols) {
        const val = pivotData[r]?.[c] || 0;
        rowTotals[r] += val;
        colTotals[c] = (colTotals[c] || 0) + val;
        grandTotal += val;
      }
    }

    return { rows, cols, data: pivotData, rowTotals, colTotals, grandTotal };
  }, [investments, widget]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="pivot-table-container">
      <table className="pivot-table">
        <thead>
          <tr>
            <th>{metricLabel(widget.metric)}</th>
            {cols.map((c) => <th key={c}>{c}</th>)}
            <th className="cell-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td className="cell-header">{r}</td>
              {cols.map((c) => (
                <td key={c} className="cell-number">{fmt(data[r]?.[c] || 0)}</td>
              ))}
              <td className="cell-number cell-total">{fmt(rowTotals[r] || 0)}</td>
            </tr>
          ))}
          <tr className="row-total">
            <td className="cell-header">Total</td>
            {cols.map((c) => (
              <td key={c} className="cell-number cell-total">{fmt(colTotals[c] || 0)}</td>
            ))}
            <td className="cell-number cell-total cell-grand">{fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
