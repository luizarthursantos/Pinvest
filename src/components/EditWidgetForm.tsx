import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { AnalyticsWidget, SliceLabelOption, LabelPosition } from '../types';

const CATEGORIES = ['group', 'subgroup', 'custody', 'type', 'name', 'ticker'];
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
  switch (c) {
    case 'name': return 'Name';
    case 'ticker': return 'Ticker';
    default: return c.charAt(0).toUpperCase() + c.slice(1);
  }
}

interface Props {
  widgetId: string;
  onClose: () => void;
}

export default function EditWidgetForm({ widgetId, onClose }: Props) {
  const widget = useStore((s) => s.widgets.find((w) => w.id === widgetId));
  const { groups, subgroups, custodies, investments, updateWidget } = useStore();

  const [kind] = useState<'chart' | 'table'>(widget?.kind ?? 'chart');
  const [chartType, setChartType] = useState<'pie' | 'bar'>(
    widget?.kind === 'chart' ? widget.chartType : 'pie'
  );
  const [category, setCategory] = useState(
    widget?.kind === 'chart' ? widget.category : 'group'
  );
  const [metric, setMetric] = useState(widget?.metric ?? 'totalValue');
  const [rowCategory, setRowCategory] = useState(
    widget?.kind === 'table' ? widget.rowCategory : 'group'
  );
  const [columnCategory, setColumnCategory] = useState(
    widget?.kind === 'table' ? widget.columnCategory : 'custody'
  );
  const [filters, setFilters] = useState<Record<string, string[]>>(
    widget?.filters ?? {}
  );
  const [sliceLabels, setSliceLabels] = useState<SliceLabelOption[]>(
    widget?.kind === 'chart' ? (widget.sliceLabels ?? ['percent']) : ['percent']
  );
  const [showLegend, setShowLegend] = useState(
    widget?.kind === 'chart' ? (widget.showLegend ?? true) : true
  );
  const [labelPosition, setLabelPosition] = useState<LabelPosition>(
    widget?.kind === 'chart' ? (widget.labelPosition ?? 'inside') : 'inside'
  );

  const filterOptions: Record<string, string[]> = useMemo(() => ({
    group: groups,
    subgroup: subgroups,
    custody: custodies,
    type: ['stock', 'other'],
    name: [...new Set(investments.map((i) => i.name))],
    ticker: [...new Set(investments.filter((i) => i.ticker).map((i) => i.ticker!))],
  }), [groups, subgroups, custodies, investments]);

  const FILTER_CATEGORIES = ['group', 'subgroup', 'custody', 'type'];

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

  if (!widget) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let updates: Partial<AnalyticsWidget>;
    if (kind === 'chart') {
      updates = { kind: 'chart', chartType, category, metric, filters, sliceLabels, showLegend, labelPosition };
    } else {
      updates = { kind: 'table', rowCategory, columnCategory, metric, filters };
    }
    updateWidget(widgetId, updates);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Edit Widget</h2>

        <label>Widget Type</label>
        <select value={kind} disabled>
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

            {chartType === 'pie' && (
              <>
                <label>Slice Caption</label>
                <div className="filter-chips">
                  {([['name', 'Name'], ['value', 'Value'], ['percent', 'Percentage']] as const).map(([key, lbl]) => (
                    <label key={key} className="chip">
                      <input
                        type="checkbox"
                        checked={sliceLabels.includes(key)}
                        onChange={() => {
                          setSliceLabels((prev) =>
                            prev.includes(key) ? prev.filter((l) => l !== key) : [...prev, key]
                          );
                        }}
                      />
                      {lbl}
                    </label>
                  ))}
                </div>

                <label>Label Position</label>
                <select value={labelPosition} onChange={(e) => setLabelPosition(e.target.value as LabelPosition)}>
                  <option value="inside">Inside</option>
                  <option value="outside">Outside</option>
                </select>
              </>
            )}

            <label className="chip" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
              />
              Show Legend
            </label>
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
          {FILTER_CATEGORIES.map((cat) => (
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
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
