/**
 * budgIT — typed domain model.
 *
 * These types are the single source of truth for the whole application. They are
 * deliberately storage-agnostic so that they can be persisted in IndexedDB
 * (local-first mode) or in Google Sheets (user-owned cloud mode) without
 * translation.
 *
 * Conventions
 * -----------
 * - `ISODate`      → `YYYY-MM-DD` (no time, no timezone, no implicit UTC shifting).
 * - `ISODateTime`  → full ISO-8601 UTC timestamp (audit fields only).
 * - `MonthKey`     → `YYYY-MM`.
 * - Money amounts  → numbers in major currency units (e.g. rupees), always
 *                    positive for transactions. Direction comes from `type`.
 */

export const SCHEMA_VERSION = 1;

export type ISODate = string;
export type ISODateTime = string;
export type MonthKey = string;
export type YearKey = number;

/* -------------------------------------------------------------------------- */
/* Enumerations (const arrays + unions — kept serializable and tree-shakeable)  */
/* -------------------------------------------------------------------------- */

export const TRANSACTION_TYPES = [
  "income",
  "expense",
  "savings_contribution",
  "investment_contribution",
  "transfer",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CATEGORY_TYPES = [
  "income",
  "expense",
  "savings",
  "investment",
] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const GOAL_STATUSES = ["active", "completed", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const STORAGE_MODES = ["local", "google-sheets"] as const;
export type StorageMode = (typeof STORAGE_MODES)[number];

export const SYNC_STATUSES = [
  "idle",
  "syncing",
  "synced",
  "error",
  "offline",
] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/* Core records                                                                */
/* -------------------------------------------------------------------------- */

export interface Transaction {
  id: string;
  /** Calendar date the transaction belongs to. Never shifted by timezone. */
  date: ISODate;
  description: string;
  /** Always positive. Use `type` to determine direction. */
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategoryId?: string | null;
  paymentMethodId: string;
  tags: string[];
  notes?: string | null;
  /** Present when the transaction was generated from a recurring template. */
  recurringId?: string | null;
  /** Import provenance, e.g. `csv` or `manual`. */
  source?: string | null;
  /** Deterministic signature used for duplicate detection on import. */
  dedupeHash?: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  /** Optional parent for subcategories. */
  parentId?: string | null;
  /** Lucide icon name (resolved defensively at render time). */
  icon?: string | null;
  /** Hex or CSS colour token. Falls back to a deterministic palette colour. */
  color?: string | null;
  isSystem: boolean;
  /** Archived categories are hidden from pickers but preserved in history. */
  archivedAt?: ISODateTime | null;
  order: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  isSystem: boolean;
  archivedAt?: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

export interface MonthlyBudget {
  id: string;
  month: MonthKey;
  /** Total spending limit across all categories, if configured. */
  overallLimit: number | null;
  /** Target amount to save this month, if configured. */
  savingsTarget: number | null;
  notes?: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

export interface CategoryBudget {
  id: string;
  month: MonthKey;
  categoryId: string;
  amount: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  /** Opening balance already saved before tracking began. */
  initialAmount: number;
  targetDate?: ISODate | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  status: GoalStatus;
  /** Optional wallet/category this goal draws from (informational only). */
  linkedCategoryId?: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  date: ISODate;
  /** Positive = money added, negative = money withdrawn. */
  amount: number;
  notes?: string | null;
  transactionId?: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

export interface RecurringRule {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  paymentMethodId: string;
  frequency: "weekly" | "monthly" | "yearly";
  /** Day-of-month (1-28) for monthly rules, or weekday for weekly rules. */
  anchor: number;
  startDate: ISODate;
  endDate?: ISODate | null;
  lastRunMonth?: MonthKey | null;
  active: boolean;
  notes?: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

/* -------------------------------------------------------------------------- */
/* Dashboard personalisation                                                    */
/* -------------------------------------------------------------------------- */

export const WIDGET_IDS = [
  "overview",
  "income-overview",
  "expense-overview",
  "savings-tracker",
  "budget-progress",
  "category-breakdown",
  "income-vs-expense",
  "annual-savings-trend",
  "recent-transactions",
  "upcoming-recurring",
  "financial-goals",
  "top-categories",
  "daily-spending",
  "savings-rate",
] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export type WidgetSize = "sm" | "md" | "lg" | "full";

export interface DashboardWidgetPref {
  id: WidgetId;
  visible: boolean;
  order: number;
  size: WidgetSize;
}

/* -------------------------------------------------------------------------- */
/* Settings (singleton)                                                         */
/* -------------------------------------------------------------------------- */

export interface AppSettings {
  id: "app";
  currency: string;
  locale: string;
  theme: Theme;
  storageMode: StorageMode;
  /** Budget utilisation percentages that trigger a visual warning. */
  budgetThresholds: number[];
  /** When true, savings/investment contributions also count in the expense totals. */
  countContributionsAsExpenses: boolean;
  /** When true, transfers between own accounts are excluded everywhere. */
  hideTransfersFromReports: boolean;
  /** Optional weekly start day, 0 = Sunday. */
  weekStartsOn: number;
  onboardingCompleted: boolean;
  approximateMonthlyIncome: number | null;
  dashboard: DashboardWidgetPref[];
  /** Schema of the last successful cloud sync, for conflict handling later. */
  lastSyncedAt?: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  schemaVersion: number;
}

/* -------------------------------------------------------------------------- */
/* Derived / view models                                                        */
/* -------------------------------------------------------------------------- */

export interface CategoryTotal {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  share: number;
  transactionCount: number;
}

export interface BudgetLineStatus {
  categoryId: string;
  categoryName: string;
  color: string;
  budgeted: number;
  spent: number;
  remaining: number;
  utilization: number;
  status: "none" | "ok" | "warning" | "critical" | "exceeded";
}

export interface GoalProgress {
  goal: SavingsGoal;
  saved: number;
  remaining: number;
  progress: number;
  monthsRemaining: number | null;
  requiredMonthly: number | null;
  status: "on-track" | "behind" | "completed" | "overdue" | "no-target-date";
}

export interface MonthSummary {
  month: MonthKey;
  income: number;
  expenses: number;
  savingsContributions: number;
  investmentContributions: number;
  transfers: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
}

export interface YearSummary {
  year: YearKey;
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
  months: MonthSummary[];
  activeMonths: number;
}
