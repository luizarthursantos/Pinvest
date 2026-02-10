import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Investment, AnalyticsWidget, Theme, PriceSource } from '../types';

interface AppState {
  investments: Investment[];
  groups: string[];
  subgroups: string[];
  custodies: string[];
  widgets: AnalyticsWidget[];
  theme: Theme;
  priceSource: PriceSource;
  brapiToken: string;
  activeTab: 'positions' | 'analytics' | 'settings';

  setActiveTab: (tab: AppState['activeTab']) => void;
  addInvestment: (inv: Investment) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  updatePrices: (prices: Record<string, number>) => void;
  addGroup: (g: string) => void;
  addSubgroup: (s: string) => void;
  addCustody: (c: string) => void;
  addWidget: (w: AnalyticsWidget) => void;
  removeWidget: (id: string) => void;
  setTheme: (t: Theme) => void;
  setPriceSource: (s: PriceSource) => void;
  setBrapiToken: (t: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      investments: [],
      groups: [],
      subgroups: [],
      custodies: [],
      widgets: [],
      theme: 'light',
      priceSource: 'brapi',
      brapiToken: '',
      activeTab: 'positions',

      setActiveTab: (tab) => set({ activeTab: tab }),

      addInvestment: (inv) =>
        set((s) => ({
          investments: [...s.investments, inv],
          groups: s.groups.includes(inv.group) ? s.groups : [...s.groups, inv.group],
          subgroups: s.subgroups.includes(inv.subgroup) ? s.subgroups : [...s.subgroups, inv.subgroup],
          custodies: s.custodies.includes(inv.custody) ? s.custodies : [...s.custodies, inv.custody],
        })),

      updateInvestment: (id, updates) =>
        set((s) => ({
          investments: s.investments.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      removeInvestment: (id) =>
        set((s) => ({
          investments: s.investments.filter((i) => i.id !== id),
        })),

      updatePrices: (prices) =>
        set((s) => ({
          investments: s.investments.map((i) => {
            if (i.type === 'stock' && i.ticker && prices[i.ticker] !== undefined) {
              return { ...i, currentPrice: prices[i.ticker], lastPriceUpdate: new Date().toISOString() };
            }
            return i;
          }),
        })),

      addGroup: (g) =>
        set((s) => ({
          groups: s.groups.includes(g) ? s.groups : [...s.groups, g],
        })),

      addSubgroup: (s_) =>
        set((s) => ({
          subgroups: s.subgroups.includes(s_) ? s.subgroups : [...s.subgroups, s_],
        })),

      addCustody: (c) =>
        set((s) => ({
          custodies: s.custodies.includes(c) ? s.custodies : [...s.custodies, c],
        })),

      addWidget: (w) =>
        set((s) => ({ widgets: [...s.widgets, w] })),

      removeWidget: (id) =>
        set((s) => ({ widgets: s.widgets.filter((w) => w.id !== id) })),

      setTheme: (t) => set({ theme: t }),

      setPriceSource: (s) => set({ priceSource: s }),

      setBrapiToken: (t) => set({ brapiToken: t }),
    }),
    { name: 'pinvest-storage' }
  )
);
