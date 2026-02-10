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
  renameGroup: (oldName: string, newName: string) => void;
  removeGroup: (name: string) => void;
  renameSubgroup: (oldName: string, newName: string) => void;
  removeSubgroup: (name: string) => void;
  renameCustody: (oldName: string, newName: string) => void;
  removeCustody: (name: string) => void;
  importInvestments: (investments: Investment[]) => void;
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

      renameGroup: (oldName, newName) =>
        set((s) => ({
          groups: s.groups.map((g) => (g === oldName ? newName : g)),
          investments: s.investments.map((i) =>
            i.group === oldName ? { ...i, group: newName } : i
          ),
        })),

      removeGroup: (name) =>
        set((s) => ({
          groups: s.groups.filter((g) => g !== name),
        })),

      renameSubgroup: (oldName, newName) =>
        set((s) => ({
          subgroups: s.subgroups.map((g) => (g === oldName ? newName : g)),
          investments: s.investments.map((i) =>
            i.subgroup === oldName ? { ...i, subgroup: newName } : i
          ),
        })),

      removeSubgroup: (name) =>
        set((s) => ({
          subgroups: s.subgroups.filter((g) => g !== name),
        })),

      renameCustody: (oldName, newName) =>
        set((s) => ({
          custodies: s.custodies.map((g) => (g === oldName ? newName : g)),
          investments: s.investments.map((i) =>
            i.custody === oldName ? { ...i, custody: newName } : i
          ),
        })),

      removeCustody: (name) =>
        set((s) => ({
          custodies: s.custodies.filter((g) => g !== name),
        })),

      importInvestments: (newInvestments) =>
        set((s) => {
          const allInvestments = [...s.investments, ...newInvestments];
          const allGroups = [...new Set([...s.groups, ...newInvestments.map((i) => i.group).filter(Boolean)])];
          const allSubgroups = [...new Set([...s.subgroups, ...newInvestments.map((i) => i.subgroup).filter(Boolean)])];
          const allCustodies = [...new Set([...s.custodies, ...newInvestments.map((i) => i.custody).filter(Boolean)])];
          return { investments: allInvestments, groups: allGroups, subgroups: allSubgroups, custodies: allCustodies };
        }),
    }),
    { name: 'pinvest-storage' }
  )
);
