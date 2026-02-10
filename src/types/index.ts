export type InvestmentType = 'stock' | 'other';

export interface Investment {
  id: string;
  name: string;
  ticker?: string;
  type: InvestmentType;
  quantity: number;
  manualPrice?: number;
  currentPrice: number;
  group: string;
  subgroup: string;
  custody: string;
  targetTotalWeight: number;
  targetGroupWeight: number;
  lastPriceUpdate?: string;
}

export type PriceSource = 'brapi' | 'yahoo';

export interface AnalyticsChart {
  id: string;
  kind: 'chart';
  chartType: 'pie' | 'bar';
  category: string;
  metric: string;
  filters: Record<string, string[]>;
}

export interface AnalyticsTable {
  id: string;
  kind: 'table';
  rowCategory: string;
  columnCategory: string;
  metric: string;
  filters: Record<string, string[]>;
}

export type AnalyticsWidget = AnalyticsChart | AnalyticsTable;

export type Theme = 'light' | 'dark';
