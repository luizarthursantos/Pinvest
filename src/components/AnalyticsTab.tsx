import { useState } from 'react';
import { useStore } from '../store/useStore';
import AddWidgetForm from './AddWidgetForm';
import ChartWidget from './ChartWidget';
import PivotTableWidget from './PivotTableWidget';

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

export default function AnalyticsTab() {
  const widgets = useStore((s) => s.widgets);
  const removeWidget = useStore((s) => s.removeWidget);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="analytics-tab">
      <div className="tab-header">
        <h2>Analytics</h2>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          + Add Widget
        </button>
      </div>

      {widgets.length === 0 ? (
        <div className="empty-state">
          <p>No widgets yet. Click "Add Widget" to create a chart or pivot table.</p>
        </div>
      ) : (
        <div className="widgets-grid">
          {widgets.map((w) => (
            <div key={w.id} className="widget-card">
              <div className="widget-header">
                <span className="widget-title">
                  {w.kind === 'chart'
                    ? `${w.chartType === 'pie' ? 'Pie' : 'Bar'} Chart — ${categoryLabel(w.category)} by ${metricLabel(w.metric)}`
                    : `Pivot — ${categoryLabel(w.rowCategory)} x ${categoryLabel(w.columnCategory)} (${metricLabel(w.metric)})`}
                </span>
                <button
                  className="btn-icon btn-danger"
                  title="Remove widget"
                  onClick={() => removeWidget(w.id)}
                >
                  &#10005;
                </button>
              </div>
              <div className="widget-body">
                {w.kind === 'chart' ? (
                  <ChartWidget widget={w} />
                ) : (
                  <PivotTableWidget widget={w} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddWidgetForm onClose={() => setShowAdd(false)} />}
    </div>
  );
}
