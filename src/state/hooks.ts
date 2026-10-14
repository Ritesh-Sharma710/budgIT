import { useLiveQuery } from "dexie-react-hooks";
import {
  categoriesRepo,
  goalContributionsRepo,
  goalsRepo,
  paymentMethodsRepo,
  budgetsRepo,
  categoryBudgetsRepo,
  recurringRepo,
  settingsRepo,
  transactionsRepo,
} from "@/data/repositories";
import { defaultSettings } from "@/data/defaults";
import type {
  AppSettings,
  Category,
  CategoryBudget,
  GoalContribution,
  MonthlyBudget,
  PaymentMethod,
  RecurringRule,
  SavingsGoal,
  Transaction,
} from "@/domain/types";
import { currentMonthKey, currentYear } from "@/lib/date";

/**
 * Dexie live queries wrapped as React hooks.
 *
 * Every hook re-renders automatically when IndexedDB changes, so the dashboard,
 * charts and reports stay in sync with the underlying records without any
 * manual cache invalidation.
 */

/** Stable fallback so consumers never see a `undefined` settings object. */
const FALLBACK_SETTINGS: AppSettings = defaultSettings();

export function useSettings(): AppSettings {
  return useLiveQuery(() => settingsRepo.get(), [], FALLBACK_SETTINGS) ?? FALLBACK_SETTINGS;
}

export function useTransactions(): Transaction[] {
  return useLiveQuery(() => transactionsRepo.all(), [], []) ?? [];
}

export function useCategories(includeArchived = false): Category[] {
  return useLiveQuery(() => (includeArchived ? categoriesRepo.all() : categoriesRepo.active()), [includeArchived], []) ?? [];
}

export function usePaymentMethods(): PaymentMethod[] {
  return useLiveQuery(() => paymentMethodsRepo.all(), [], []) ?? [];
}

export function useMonthlyBudget(month: string): MonthlyBudget | undefined {
  return useLiveQuery(() => budgetsRepo.byMonth(month), [month]);
}

export function useCategoryBudgets(month: string): CategoryBudget[] {
  return useLiveQuery(() => categoryBudgetsRepo.byMonth(month), [month], []) ?? [];
}

export function useGoals(): SavingsGoal[] {
  return useLiveQuery(() => goalsRepo.all(), [], []) ?? [];
}

export function useGoalContributions(): GoalContribution[] {
  return useLiveQuery(() => goalContributionsRepo.all(), [], []) ?? [];
}

export function useRecurring(): RecurringRule[] {
  return useLiveQuery(() => recurringRepo.all(), [], []) ?? [];
}

/** All transactions for a month plus the derived pieces the UI needs most. */
export function useMonth(month: string) {
  const transactions = useTransactions();
  return transactions.filter((t) => t.date.startsWith(`${month}-`));
}

export const DEFAULT_MONTH = currentMonthKey();
export const DEFAULT_YEAR = currentYear();
