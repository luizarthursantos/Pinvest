import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import type { Investment, InvestmentType } from '../types';

const EXPORT_COLUMNS = [
  'name', 'type', 'ticker', 'quantity', 'currentPrice', 'manualPrice',
  'group', 'subgroup', 'custody', 'targetTotalWeight', 'targetGroupWeight',
];

export function exportToXlsx(investments: Investment[]) {
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
    targetTotalWeight: inv.targetTotalWeight,
    targetGroupWeight: inv.targetGroupWeight,
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Investments');
  XLSX.writeFile(wb, 'pinvest_investments.xlsx');
}

export function importFromXlsx(file: File): Promise<Investment[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const investments: Investment[] = rows.map((row) => {
          const type = (String(row.type || 'other').toLowerCase()) as InvestmentType;
          const isStock = type === 'stock';
          const price = Number(row.currentPrice) || Number(row.manualPrice) || 0;
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
            targetTotalWeight: Number(row.targetTotalWeight) || 0,
            targetGroupWeight: Number(row.targetGroupWeight) || 0,
          };
        });

        resolve(investments);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
