import { useState } from 'react';
import { useStore } from '../store/useStore';
import AddWidgetForm from './AddWidgetForm';
import EditWidgetForm from './EditWidgetForm';
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
  const [editMode, setEditMode] = useState(false);
  const [editWidgetId, setEditWidgetId] = useState<string | null>(null);

  return (
    <div className="analytics-tab">
      <div className="tab-header">
        <h2>Analytics</h2>
        <div className="tab-actions">
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Add Widget
          </button>
          {widgets.length > 0 && (
            <button
              className={`btn-secondary ${editMode ? 'btn-active' : ''}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="empty-state">
          <p>No widgets yet. Click "Add Widget" to create a chart or pivot table.</p>
        </div>
      ) : (
        <div className="widgets-grid">
          {widgets.map((w) => (
            <div
              key={w.id}
              className={`widget-card${editMode ? ' clickable-card' : ''}`}
              onClick={editMode ? () => setEditWidgetId(w.id) : undefined}
            >
              <div className="widget-header">
                <span className="widget-title">
                  {w.kind === 'chart'
                    ? `${w.chartType === 'pie' ? 'Pie' : 'Bar'} Chart — ${categoryLabel(w.category)} by ${metricLabel(w.metric)}`
                    : `Pivot — ${categoryLabel(w.rowCategory)} x ${categoryLabel(w.columnCategory)} (${metricLabel(w.metric)})`}
                </span>
                {editMode && (
                  <button
                    className="btn-icon btn-danger"
                    title="Remove widget"
                    onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }}
                  >
                    &#10005;
                  </button>
                )}
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
      {editWidgetId && <EditWidgetForm widgetId={editWidgetId} onClose={() => setEditWidgetId(null)} />}
    </div>
  );
}
