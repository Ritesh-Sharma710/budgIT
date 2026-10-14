import { create } from "zustand";
import { currentMonthKey, currentYear, addMonths } from "@/lib/date";

/**
 * Ephemeral UI state (never financial data).
 *
 * Holding the selected month here means every page — dashboard, budgets,
 * transactions and reports — reacts to one selector in the header.
 */
interface UIState {
  selectedMonth: string;
  selectedYear: number;
  sidebarOpen: boolean;
  commandOpen: boolean;
  setMonth: (month: string) => void;
  shiftMonth: (delta: number) => void;
  goToCurrentMonth: () => void;
  setYear: (year: number) => void;
  shiftYear: (delta: number) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedMonth: currentMonthKey(),
  selectedYear: currentYear(),
  sidebarOpen: false,
  commandOpen: false,

  setMonth: (month) => set({ selectedMonth: month, selectedYear: Number(month.slice(0, 4)) }),
  shiftMonth: (delta) =>
    set((state) => {
      const next = addMonths(state.selectedMonth, delta);
      return { selectedMonth: next, selectedYear: Number(next.slice(0, 4)) };
    }),
  goToCurrentMonth: () => set({ selectedMonth: currentMonthKey(), selectedYear: currentYear() }),
  setYear: (year) => set({ selectedYear: year }),
  shiftYear: (delta) => set((state) => ({ selectedYear: state.selectedYear + delta })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCommandOpen: (open) => set({ commandOpen: open }),
}));
