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
    case 'dailyReturn': return 'Daily Return';
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
  const moveWidget = useStore((s) => s.moveWidget);
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editWidgetId, setEditWidgetId] = useState<string | null>(null);

  return (
    <div className="analytics-tab">
      <div className="tab-header">
        <h2>Analytics</h2>
        <div className="tab-actions">
          <button
            className={`btn-secondary btn-sq ${editMode ? 'btn-active' : ''}`}
            title={editMode ? 'Done' : 'Edit'}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            }
          </button>
          {editMode && (
            <button className="btn-primary btn-sq" title="Add Widget" onClick={() => setShowAdd(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
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
          {widgets.map((w, wi) => (
            <div
              key={w.id}
              className={`widget-card${editMode ? ' clickable-card' : ''}`}
              onClick={editMode ? () => setEditWidgetId(w.id) : undefined}
            >
              <div className="widget-header">
                <span className="widget-title">
                  {w.kind === 'chart'
                    ? `${w.chartType === 'pie' ? 'Pie' : 'Bar'} Chart — ${categoryLabel(w.category)} by ${metricLabel(w.metric)}`
                    : `Pivot — ${w.rowCategories.map(categoryLabel).join(' / ')} x ${w.columnCategories.map(categoryLabel).join(' / ')} (${metricLabel(w.metric)})`}
                </span>
                {editMode && (
                  <div className="widget-actions">
                    <button className="btn-icon" title="Move up" disabled={wi === 0}
                      onClick={(e) => { e.stopPropagation(); moveWidget(w.id, -1); }}>&#9650;</button>
                    <button className="btn-icon" title="Move down" disabled={wi === widgets.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveWidget(w.id, 1); }}>&#9660;</button>
                    <button className="btn-icon btn-danger" title="Remove widget"
                      onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }}>&#10005;</button>
                  </div>
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
