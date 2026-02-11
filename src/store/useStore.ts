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
  positionColumns: string[];

  setActiveTab: (tab: AppState['activeTab']) => void;
  addInvestment: (inv: Investment) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  updatePrices: (prices: Record<string, { price: number; change?: number; changePercent?: number }>) => void;
  addGroup: (g: string) => void;
  addSubgroup: (s: string) => void;
  addCustody: (c: string) => void;
  addWidget: (w: AnalyticsWidget) => void;
  updateWidget: (id: string, updates: Partial<AnalyticsWidget>) => void;
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
  importWidgets: (widgets: AnalyticsWidget[]) => void;
  importSettings: (settings: {
    theme?: Theme;
    priceSource?: PriceSource;
    brapiToken?: string;
    positionColumns?: string[];
    groups?: string[];
    subgroups?: string[];
    custodies?: string[];
  }) => void;
  clearAllData: () => void;
  setPositionColumns: (cols: string[]) => void;
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
      positionColumns: ['name', 'type', 'ticker', 'price', 'qty', 'totalValue', 'pctTotal', 'targetTotal', 'deltaTotal', 'group', 'pctType', 'targetType', 'deltaType', 'subgroup', 'custody'],

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
              const pd = prices[i.ticker];
              return {
                ...i,
                currentPrice: pd.price,
                dailyChange: pd.change,
                dailyChangePercent: pd.changePercent,
                lastPriceUpdate: new Date().toISOString(),
              };
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

      updateWidget: (id, updates) =>
        set((s) => ({
          widgets: s.widgets.map((w) => (w.id === id ? { ...w, ...updates } as AnalyticsWidget : w)),
        })),

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

      importWidgets: (newWidgets) =>
        set((s) => ({ widgets: [...s.widgets, ...newWidgets] })),

      importSettings: (settings) =>
        set((s) => {
          const updates: Partial<AppState> = {};
          if (settings.theme) updates.theme = settings.theme;
          if (settings.priceSource) updates.priceSource = settings.priceSource;
          if (settings.brapiToken != null) updates.brapiToken = settings.brapiToken;
          if (settings.positionColumns) updates.positionColumns = settings.positionColumns;
          if (settings.groups) updates.groups = [...new Set([...s.groups, ...settings.groups])];
          if (settings.subgroups) updates.subgroups = [...new Set([...s.subgroups, ...settings.subgroups])];
          if (settings.custodies) updates.custodies = [...new Set([...s.custodies, ...settings.custodies])];
          return updates;
        }),

      clearAllData: () =>
        set({ investments: [], groups: [], subgroups: [], custodies: [], widgets: [] }),

      setPositionColumns: (cols) => set({ positionColumns: cols }),
    }),
    {
      name: 'pinvest-storage',
      version: 1,
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        // Migrate old widget format: rowCategory (string) -> rowCategories (string[])
        if (Array.isArray(state.widgets)) {
          state.widgets = (state.widgets as Record<string, unknown>[]).map((w) => {
            if (w.kind === 'table') {
              const any = w as Record<string, unknown>;
              if (!Array.isArray(any.rowCategories) && typeof any.rowCategory === 'string') {
                any.rowCategories = [any.rowCategory];
                delete any.rowCategory;
              }
              if (!Array.isArray(any.columnCategories) && typeof any.columnCategory === 'string') {
                any.columnCategories = [any.columnCategory];
                delete any.columnCategory;
              }
              // Ensure arrays exist even if both old and new are missing
              if (!Array.isArray(any.rowCategories)) any.rowCategories = ['group'];
              if (!Array.isArray(any.columnCategories)) any.columnCategories = ['custody'];
            }
            // Migrate old targetGroupWeight -> targetTypeWeight in investments
            return w;
          });
        }
        if (Array.isArray(state.investments)) {
          state.investments = (state.investments as Record<string, unknown>[]).map((inv) => {
            if (inv.targetGroupWeight != null && inv.targetTypeWeight == null) {
              inv.targetTypeWeight = inv.targetGroupWeight;
              delete inv.targetGroupWeight;
            }
            return inv;
          });
        }
        return state as unknown as AppState;
      },
    }
  )
);
