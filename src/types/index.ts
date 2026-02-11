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
  targetTotalWeight?: number;
  targetTypeWeight?: number;
  lastPriceUpdate?: string;
  dailyChange?: number;
  dailyChangePercent?: number;
}

export type PriceSource = 'brapi' | 'yahoo';

export type SliceLabelOption = 'name' | 'value' | 'percent';

export type LabelPosition = 'inside' | 'outside';

export interface AnalyticsChart {
  id: string;
  kind: 'chart';
  chartType: 'pie' | 'bar';
  category: string;
  metric: string;
  filters: Record<string, string[]>;
  sliceLabels?: SliceLabelOption[];
  showLegend?: boolean;
  labelPosition?: LabelPosition;
}

export interface AnalyticsTable {
  id: string;
  kind: 'table';
  rowCategories: string[];
  columnCategories: string[];
  metric: string;
  filters: Record<string, string[]>;
}

export type AnalyticsWidget = AnalyticsChart | AnalyticsTable;

export type Theme = 'light' | 'dark';
