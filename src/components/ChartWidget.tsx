import { useMemo, useCallback } from 'react';
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
    case 'name': return inv.name;
    case 'ticker': return inv.ticker || '-';
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
    case 'dailyReturn': return (inv.dailyChange ?? 0) * inv.quantity;
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

const RADIAN = Math.PI / 180;

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

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const fmt = (widget.metric === 'totalValue' || widget.metric === 'quantity' || widget.metric === 'dailyReturn')
    ? (n: number) => Math.round(n).toLocaleString()
    : (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fmtTotal = (n: number) => Math.round(n).toLocaleString();

  const sliceLabels = widget.sliceLabels ?? ['percent'];
  const showLegend = widget.showLegend ?? true;
  const labelPosition = widget.labelPosition ?? 'inside';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPieLabel = useCallback((props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, value } = props;
    if (percent < 0.03) return null;

    const parts: string[] = [];
    if (sliceLabels.includes('name')) parts.push(name);
    if (sliceLabels.includes('value')) parts.push(fmt(value));
    if (sliceLabels.includes('percent')) parts.push(`${(percent * 100).toFixed(1)}%`);
    if (parts.length === 0) return null;

    if (labelPosition === 'outside') {
      const radius = outerRadius + 20;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      const anchor = x > cx ? 'start' : 'end';
      return (
        <text x={x} y={y} fill="var(--text-primary)" textAnchor={anchor} dominantBaseline="central" fontSize={11} fontWeight={600}>
          {parts.join(' ')}
        </text>
      );
    }

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {parts.join(' ')}
      </text>
    );
  }, [sliceLabels, labelPosition]);

  if (widget.chartType === 'pie') {
    return (
      <div>
        <div className="chart-total">Total: {fmtTotal(total)}</div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={labelPosition === 'outside' ? 80 : 100}
              labelLine={labelPosition === 'outside'}
              label={renderPieLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val) => fmt(Number(val))} />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div>
      <div className="chart-total">Total: {fmtTotal(total)}</div>
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
    </div>
  );
}
