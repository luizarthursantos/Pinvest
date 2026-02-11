import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import type { Investment, InvestmentType, AnalyticsWidget } from '../types';

const EXPORT_COLUMNS = [
  'name', 'type', 'ticker', 'quantity', 'currentPrice', 'manualPrice',
  'group', 'subgroup', 'custody', 'targetTotalWeight', 'targetTypeWeight',
];

export function exportToXlsx(investments: Investment[], widgets: AnalyticsWidget[]) {
  const rows = investments.map((inv) => ({
    name: inv.name,
    type: inv.type,
    ticker: inv.ticker ?? '',
    quantity: inv.quantity,
    currentPrice: inv.currentPrice,
    manualPrice: inv.manualPrice ?? '',
    group: inv.group,
    subgroup: inv.subgroup,
    custody: inv.custody,
    targetTotalWeight: inv.targetTotalWeight ?? '',
    targetTypeWeight: inv.targetTypeWeight ?? '',
  }));

  const wb = XLSX.utils.book_new();

  const wsInv = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS });
  XLSX.utils.book_append_sheet(wb, wsInv, 'Investments');

  if (widgets.length > 0) {
    const widgetRows = widgets.map((w) => ({
      id: w.id,
      kind: w.kind,
      chartType: w.kind === 'chart' ? w.chartType : '',
      category: w.kind === 'chart' ? w.category : '',
      rowCategories: w.kind === 'table' ? w.rowCategories.join(',') : '',
      columnCategories: w.kind === 'table' ? w.columnCategories.join(',') : '',
      metric: w.metric,
      filters: JSON.stringify(w.filters),
      sliceLabels: w.kind === 'chart' ? (w.sliceLabels ?? []).join(',') : '',
      showLegend: w.kind === 'chart' ? String(w.showLegend ?? true) : '',
      labelPosition: w.kind === 'chart' ? (w.labelPosition ?? 'inside') : '',
    }));
    const wsWidgets = XLSX.utils.json_to_sheet(widgetRows);
    XLSX.utils.book_append_sheet(wb, wsWidgets, 'Widgets');
  }

  XLSX.writeFile(wb, 'pinvest_investments.xlsx');
}

export interface ImportResult {
  investments: Investment[];
  widgets: AnalyticsWidget[];
}

export function importFromXlsx(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        // Parse investments from first sheet
        const wsInv = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsInv);

        const investments: Investment[] = rows.map((row) => {
          const type = (String(row.type || 'other').toLowerCase()) as InvestmentType;
          const isStock = type === 'stock';
          const price = Number(row.currentPrice) || Number(row.manualPrice) || 0;
          const ttw = row.targetTotalWeight;
          const ttyw = row.targetTypeWeight ?? row.targetGroupWeight;
          return {
            id: uuid(),
            name: String(row.name || ''),
            type: isStock ? 'stock' : 'other',
            ticker: isStock ? String(row.ticker || '').toUpperCase() || undefined : undefined,
            quantity: Number(row.quantity) || 0,
            currentPrice: price,
            manualPrice: !isStock ? price : undefined,
            group: String(row.group || ''),
            subgroup: String(row.subgroup || ''),
            custody: String(row.custody || ''),
            targetTotalWeight: ttw !== '' && ttw != null ? Number(ttw) : undefined,
            targetTypeWeight: ttyw !== '' && ttyw != null ? Number(ttyw) : undefined,
          };
        });

        // Parse widgets from second sheet if it exists
        const widgets: AnalyticsWidget[] = [];
        if (wb.SheetNames.length > 1 && wb.Sheets[wb.SheetNames[1]]) {
          const wsWidgets = wb.Sheets[wb.SheetNames[1]];
          const wRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsWidgets);
          for (const wr of wRows) {
            const kind = String(wr.kind || '');
            const filters = wr.filters ? JSON.parse(String(wr.filters)) : {};
            if (kind === 'chart') {
              const sl = String(wr.sliceLabels || '');
              widgets.push({
                id: uuid(),
                kind: 'chart',
                chartType: (String(wr.chartType) as 'pie' | 'bar') || 'pie',
                category: String(wr.category || 'group'),
                metric: String(wr.metric || 'totalValue'),
                filters,
                sliceLabels: sl ? sl.split(',').filter(Boolean) as ('name' | 'value' | 'percent')[] : ['percent'],
                showLegend: String(wr.showLegend) !== 'false',
                labelPosition: (String(wr.labelPosition || 'inside') as 'inside' | 'outside'),
              });
            } else if (kind === 'table') {
              const rc = String(wr.rowCategories || wr.rowCategory || 'group');
              const cc = String(wr.columnCategories || wr.columnCategory || 'custody');
              widgets.push({
                id: uuid(),
                kind: 'table',
                rowCategories: rc.split(',').filter(Boolean),
                columnCategories: cc.split(',').filter(Boolean),
                metric: String(wr.metric || 'totalValue'),
                filters,
              });
            }
          }
        }

        resolve({ investments, widgets });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
