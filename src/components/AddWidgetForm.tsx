import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useStore } from '../store/useStore';
import type { AnalyticsWidget } from '../types';

const CATEGORIES = ['group', 'subgroup', 'custody', 'type'];
const METRICS = ['totalValue', 'quantity', 'currentPrice', 'pctTotal', 'pctGroup'];

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

function categoryLabel(c: string) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export default function AddWidgetForm({ onClose }: { onClose: () => void }) {
  const { groups, subgroups, custodies, addWidget } = useStore();
  const [kind, setKind] = useState<'chart' | 'table'>('chart');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [category, setCategory] = useState('group');
  const [metric, setMetric] = useState('totalValue');
  const [rowCategory, setRowCategory] = useState('group');
  const [columnCategory, setColumnCategory] = useState('custody');
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const filterOptions: Record<string, string[]> = {
    group: groups,
    subgroup: subgroups,
    custody: custodies,
    type: ['stock', 'other'],
  };

  const toggleFilter = (cat: string, val: string) => {
    setFilters((prev) => {
      const arr = prev[cat] ?? [];
      const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
      if (next.length === 0) {
        const copy = { ...prev };
        delete copy[cat];
        return copy;
      }
      return { ...prev, [cat]: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let widget: AnalyticsWidget;
    if (kind === 'chart') {
      widget = { id: uuid(), kind: 'chart', chartType, category, metric, filters };
    } else {
      widget = { id: uuid(), kind: 'table', rowCategory, columnCategory, metric, filters };
    }
    addWidget(widget);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Add Widget</h2>

        <label>Widget Type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value as 'chart' | 'table')}>
          <option value="chart">Chart</option>
          <option value="table">Pivot Table</option>
        </select>

        {kind === 'chart' && (
          <>
            <label>Chart Type</label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value as 'pie' | 'bar')}>
              <option value="pie">Pie</option>
              <option value="bar">Bar</option>
            </select>

            <label>Category (Legend)</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
          </>
        )}

        {kind === 'table' && (
          <>
            <label>Row Category</label>
            <select value={rowCategory} onChange={(e) => setRowCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>

            <label>Column Category</label>
            <select value={columnCategory} onChange={(e) => setColumnCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
          </>
        )}

        <label>Metric</label>
        <select value={metric} onChange={(e) => setMetric(e.target.value)}>
          {METRICS.map((m) => (
            <option key={m} value={m}>{metricLabel(m)}</option>
          ))}
        </select>

        <fieldset className="filter-fieldset">
          <legend>Filters (optional)</legend>
          {CATEGORIES.map((cat) => (
            <div key={cat} className="filter-group">
              <strong>{categoryLabel(cat)}</strong>
              <div className="filter-chips">
                {filterOptions[cat].map((val) => (
                  <label key={val} className="chip">
                    <input
                      type="checkbox"
                      checked={filters[cat]?.includes(val) ?? false}
                      onChange={() => toggleFilter(cat, val)}
                    />
                    {val}
                  </label>
                ))}
                {filterOptions[cat].length === 0 && (
                  <span className="text-muted">No options</span>
                )}
              </div>
            </div>
          ))}
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Add</button>
        </div>
      </form>
    </div>
  );
}
