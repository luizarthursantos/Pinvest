import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useStore } from '../store/useStore';
import type { AnalyticsChart, Investment } from '../types';

const COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

function getCategoryValue(inv: Investment, cat: string): string {
  switch (cat) {
    case 'group': return inv.group;
    case 'subgroup': return inv.subgroup;
    case 'custody': return inv.custody;
    case 'type': return inv.type;
    default: return '';
  }
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

function applyFilters(investments: Investment[], filters: Record<string, string[]>) {
  return investments.filter((inv) => {
    for (const [cat, vals] of Object.entries(filters)) {
      if (vals.length > 0 && !vals.includes(getCategoryValue(inv, cat))) return false;
    }
    return true;
  });
}

export default function ChartWidget({ widget }: { widget: AnalyticsChart }) {
  const investments = useStore((s) => s.investments);

  const data = useMemo(() => {
    const filtered = applyFilters(investments, widget.filters);
    const totalValue = filtered.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
    const groupTotals: Record<string, number> = {};
    for (const i of filtered) {
      groupTotals[i.group] = (groupTotals[i.group] || 0) + i.quantity * i.currentPrice;
    }

    const map: Record<string, number> = {};
    for (const inv of filtered) {
      const key = getCategoryValue(inv, widget.category);
      map[key] = (map[key] || 0) + getMetricValue(inv, widget.metric, totalValue, groupTotals);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [investments, widget]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  if (widget.chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${fmt(value)}`}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(val) => fmt(Number(val))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(val) => fmt(Number(val))} />
        <Bar dataKey="value" fill="#4f46e5">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
