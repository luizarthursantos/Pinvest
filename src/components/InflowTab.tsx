import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store/useStore';
import type { Investment } from '../types';

const COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

interface Allocation {
  investment: Investment;
  currentValue: number;
  currentTypePct: number;
  targetTypePct: number;
  deficit: number;
  allocated: number;
  lots: number;
  lotValue: number;
  newValue: number;
  newTypePct: number;
}

export default function InflowTab() {
  const investments = useStore((s) => s.investments);
  const [inflowStr, setInflowStr] = useState('');
  const inflow = parseFloat(inflowStr) || 0;

  const result = useMemo(() => {
    if (inflow <= 0) return null;

    // Only consider active investments (quantity > 0) with target type weights
    const active = investments.filter((inv) => inv.quantity > 0 && inv.targetTypeWeight != null);
    if (active.length === 0) return null;

    // Group by type
    const typeMap: Record<string, Investment[]> = {};
    for (const inv of active) {
      (typeMap[inv.type] ??= []).push(inv);
    }

    // Current type totals (from all investments with qty > 0)
    const allActive = investments.filter((inv) => inv.quantity > 0);
    const currentTotal = allActive.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
    const newTotal = currentTotal + inflow;

    // For each type, compute target value and deficit
    const typeTotals: Record<string, number> = {};
    for (const inv of allActive) {
      typeTotals[inv.type] = (typeTotals[inv.type] || 0) + inv.quantity * inv.currentPrice;
    }

    // Compute per-asset allocation
    // Step 1: Compute each asset's deficit relative to its target within the new total
    const allocations: Allocation[] = [];
    for (const inv of active) {
      const currentValue = inv.quantity * inv.currentPrice;
      const typeTotal = typeTotals[inv.type] || 0;
      const currentTypePct = typeTotal > 0 ? (currentValue / typeTotal) * 100 : 0;
      const targetTypePct = inv.targetTypeWeight!;

      // Target value within type after inflow
      // First figure out the type's share of the new total based on sum of target weights
      const typeTargetSum = (typeMap[inv.type] || []).reduce((s, i) => s + (i.targetTypeWeight ?? 0), 0);
      const assetTargetShareInType = typeTargetSum > 0 ? targetTypePct / typeTargetSum : 0;

      // The new type total = current type total + whatever goes to this type
      // We need to iterate: for now, compute deficit as proportional to target weight
      const targetValue = assetTargetShareInType * (typeTotal + inflow * (typeTotal / currentTotal || 1 / Object.keys(typeMap).length));
      const deficit = Math.max(0, targetValue - currentValue);

      allocations.push({
        investment: inv,
        currentValue,
        currentTypePct,
        targetTypePct,
        deficit,
        allocated: 0,
        lots: 0,
        lotValue: 0,
        newValue: currentValue,
        newTypePct: 0,
      });
    }

    // Step 2: Allocate inflow in lots of 100 shares, prioritizing largest deficits
    let remaining = inflow;

    // Sort by deficit descending for initial allocation
    const sorted = [...allocations].sort((a, b) => b.deficit - a.deficit);

    // Greedy allocation: repeatedly give a lot of 100 to the asset most underweight
    let changed = true;
    while (remaining > 0 && changed) {
      changed = false;
      for (const alloc of sorted) {
        const price = alloc.investment.currentPrice;
        if (price <= 0) continue;
        const lotCost = 100 * price;
        if (lotCost <= remaining && alloc.deficit > 0) {
          alloc.allocated += lotCost;
          alloc.lots += 1;
          alloc.lotValue = lotCost;
          alloc.newValue = alloc.currentValue + alloc.allocated;
          alloc.deficit = Math.max(0, alloc.deficit - lotCost);
          remaining -= lotCost;
          changed = true;
        }
      }
    }

    // Step 3: If there's remaining capital and some assets can take more lots, try again without deficit constraint
    if (remaining > 0) {
      // Try giving to asset that brings portfolio closest to target
      changed = true;
      while (remaining > 0 && changed) {
        changed = false;
        let bestIdx = -1;
        let bestGap = -Infinity;

        for (let i = 0; i < sorted.length; i++) {
          const alloc = sorted[i];
          const price = alloc.investment.currentPrice;
          if (price <= 0) continue;
          const lotCost = 100 * price;
          if (lotCost > remaining) continue;

          // How underweight is this asset relative to target?
          const typeTotal = (typeTotals[alloc.investment.type] || 0) +
            sorted.filter((a) => a.investment.type === alloc.investment.type)
              .reduce((s, a) => s + a.allocated, 0);
          const newPct = typeTotal > 0 ? ((alloc.newValue) / typeTotal) * 100 : 0;
          const gap = alloc.targetTypePct - newPct;
          if (gap > bestGap) {
            bestGap = gap;
            bestIdx = i;
          }
        }

        if (bestIdx >= 0) {
          const alloc = sorted[bestIdx];
          const lotCost = 100 * alloc.investment.currentPrice;
          alloc.allocated += lotCost;
          alloc.lots += 1;
          alloc.lotValue = lotCost;
          alloc.newValue = alloc.currentValue + alloc.allocated;
          remaining -= lotCost;
          changed = true;
        }
      }
    }

    // Compute new type percentages
    const newTypeTotals: Record<string, number> = { ...typeTotals };
    for (const alloc of allocations) {
      newTypeTotals[alloc.investment.type] = (newTypeTotals[alloc.investment.type] || 0) + alloc.allocated;
    }
    // Fix: newTypeTotals already includes current, we double-counted. Recompute:
    const finalTypeTotals: Record<string, number> = {};
    for (const alloc of allocations) {
      finalTypeTotals[alloc.investment.type] = (finalTypeTotals[alloc.investment.type] || 0) + alloc.newValue;
    }
    for (const alloc of allocations) {
      const ft = finalTypeTotals[alloc.investment.type] || 1;
      alloc.newTypePct = (alloc.newValue / ft) * 100;
    }

    const totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
    const withAllocation = allocations.filter((a) => a.allocated > 0);

    // Pie chart data
    const pieData = withAllocation.map((a) => ({
      name: a.investment.name,
      value: Math.round(a.allocated),
    }));

    return { allocations, withAllocation, pieData, totalAllocated, remaining, newTotal };
  }, [investments, inflow]);

  const fmt = (n: number) => Math.round(n).toLocaleString();

  return (
    <div className="inflow-tab">
      <h2>Inflow Simulation</h2>

      <div className="inflow-input-row">
        <label>Inflow Value</label>
        <input
          type="number"
          className="inflow-input"
          placeholder="Enter amount..."
          value={inflowStr}
          onChange={(e) => setInflowStr(e.target.value)}
          min={0}
          step={100}
        />
      </div>

      {result && result.withAllocation.length > 0 && (
        <>
          <div className="inflow-summary">
            <span>Allocated: <strong>{fmt(result.totalAllocated)}</strong></span>
            {result.remaining > 0 && (
              <span>Remaining: <strong>{fmt(result.remaining)}</strong></span>
            )}
          </div>

          <div className="inflow-chart">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={result.pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) =>
                    percent > 0.03 ? `${name} ${(percent * 100).toFixed(1)}%` : ''
                  }
                  labelLine
                >
                  {result.pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => fmt(Number(val))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="inflow-table-container">
            <table className="inflow-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="cell-number">Price</th>
                  <th className="cell-number">Lots</th>
                  <th className="cell-number">Qty</th>
                  <th className="cell-number">Value</th>
                  <th className="cell-number">Current %</th>
                  <th className="cell-number">Target %</th>
                  <th className="cell-number">New %</th>
                </tr>
              </thead>
              <tbody>
                {result.allocations
                  .filter((a) => a.allocated > 0)
                  .sort((a, b) => b.allocated - a.allocated)
                  .map((a) => (
                    <tr key={a.investment.id}>
                      <td>{a.investment.name}</td>
                      <td className="cell-number">{a.investment.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="cell-number">{a.lots}</td>
                      <td className="cell-number">{(a.lots * 100).toLocaleString()}</td>
                      <td className="cell-number">{fmt(a.allocated)}</td>
                      <td className="cell-number">{a.currentTypePct.toFixed(1)}%</td>
                      <td className="cell-number">{a.targetTypePct.toFixed(1)}%</td>
                      <td className="cell-number">{a.newTypePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                <tr className="row-total">
                  <td>Total</td>
                  <td className="cell-number"></td>
                  <td className="cell-number">{result.withAllocation.reduce((s, a) => s + a.lots, 0)}</td>
                  <td className="cell-number">{(result.withAllocation.reduce((s, a) => s + a.lots, 0) * 100).toLocaleString()}</td>
                  <td className="cell-number">{fmt(result.totalAllocated)}</td>
                  <td className="cell-number"></td>
                  <td className="cell-number"></td>
                  <td className="cell-number"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {inflow > 0 && result && result.withAllocation.length === 0 && (
        <p className="text-muted">No assets with target type weights found. Set target weights in position edit.</p>
      )}
    </div>
  );
}
