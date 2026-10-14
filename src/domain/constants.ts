import type {
  CategoryType,
  PaymentMethod,
  TransactionType,
  WidgetId,
  WidgetSize,
} from "./types";
import { SCHEMA_VERSION } from "./types";

/* -------------------------------------------------------------------------- */
/* Transaction type metadata                                                    */
/* -------------------------------------------------------------------------- */

export interface TransactionTypeMeta {
  value: TransactionType;
  label: string;
  shortLabel: string;
  /** Whether the value increases net worth (money kept). */
  direction: "in" | "out" | "neutral";
  /** Whether it should be offered as an "expense-like" category selector. */
  categoryType: CategoryType;
  color: string;
  description: string;
}

export const TRANSACTION_TYPE_META: Record<TransactionType, TransactionTypeMeta> = {
  income: {
    value: "income",
    label: "Income",
    shortLabel: "Income",
    direction: "in",
    categoryType: "income",
    color: "var(--color-chart-1)",
    description: "Salary, freelance, interest and other money received.",
  },
  expense: {
    value: "expense",
    label: "Expense",
    shortLabel: "Expense",
    direction: "out",
    categoryType: "expense",
    color: "var(--color-chart-5)",
    description: "Ordinary consumption spending.",
  },
  savings_contribution: {
    value: "savings_contribution",
    label: "Savings contribution",
    shortLabel: "Savings",
    direction: "neutral",
    categoryType: "savings",
    color: "var(--color-chart-2)",
    description: "Money moved into savings. Not counted as an expense.",
  },
  investment_contribution: {
    value: "investment_contribution",
    label: "Investment contribution",
    shortLabel: "Investment",
    direction: "neutral",
    categoryType: "investment",
    color: "var(--color-chart-4)",
    description: "Money invested. Kept separate from consumption spending.",
  },
  transfer: {
    value: "transfer",
    label: "Transfer",
    shortLabel: "Transfer",
    direction: "neutral",
    categoryType: "expense",
    color: "var(--color-chart-6)",
    description: "Movement between your own accounts. Never a new expense.",
  },
};

export const TRANSACTION_TYPE_ORDER: TransactionType[] = [
  "income",
  "expense",
  "savings_contribution",
  "investment_contribution",
  "transfer",
];

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  income: "Income",
  expense: "Expense",
  savings: "Savings",
  investment: "Investment",
};

/* -------------------------------------------------------------------------- */
/* Default payment methods                                                      */
/* -------------------------------------------------------------------------- */

export const PAYMENT_METHODS: Omit<PaymentMethod, "createdAt" | "updatedAt" | "schemaVersion">[] =
  [
    { id: "pm_cash", name: "Cash", isSystem: true, archivedAt: null },
    { id: "pm_upi", name: "UPI", isSystem: true, archivedAt: null },
    { id: "pm_debit", name: "Debit card", isSystem: true, archivedAt: null },
    { id: "pm_credit", name: "Credit card", isSystem: true, archivedAt: null },
    { id: "pm_bank", name: "Bank transfer", isSystem: true, archivedAt: null },
    { id: "pm_other", name: "Other", isSystem: true, archivedAt: null },
  ];

/* -------------------------------------------------------------------------- */
/* Default categories                                                           */
/* -------------------------------------------------------------------------- */

interface SeedCategory {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  // Expense
  { id: "cat_food", name: "Food & Dining", type: "expense", icon: "UtensilsCrossed", color: "#f97316" },
  { id: "cat_groceries", name: "Groceries", type: "expense", icon: "ShoppingBasket", color: "#84cc16" },
  { id: "cat_transport", name: "Transport", type: "expense", icon: "Car", color: "#0ea5e9" },
  { id: "cat_rent", name: "Rent", type: "expense", icon: "Home", color: "#8b5cf6" },
  { id: "cat_utilities", name: "Utilities", type: "expense", icon: "Plug", color: "#14b8a6" },
  { id: "cat_subscriptions", name: "Subscriptions", type: "expense", icon: "Repeat", color: "#ec4899" },
  { id: "cat_education", name: "Education", type: "expense", icon: "GraduationCap", color: "#6366f1" },
  { id: "cat_entertainment", name: "Entertainment", type: "expense", icon: "Clapperboard", color: "#f43f5e" },
  { id: "cat_healthcare", name: "Healthcare", type: "expense", icon: "HeartPulse", color: "#ef4444" },
  { id: "cat_shopping", name: "Shopping", type: "expense", icon: "ShoppingBag", color: "#d946ef" },
  { id: "cat_travel", name: "Travel", type: "expense", icon: "Plane", color: "#06b6d4" },
  { id: "cat_household", name: "Household", type: "expense", icon: "Lamp", color: "#a3a3a3" },
  { id: "cat_other_expense", name: "Other", type: "expense", icon: "CircleEllipsis", color: "#737373" },

  // Income
  { id: "cat_salary", name: "Salary", type: "income", icon: "Wallet", color: "#22c55e" },
  { id: "cat_freelance", name: "Freelance", type: "income", icon: "Briefcase", color: "#10b981" },
  { id: "cat_interest", name: "Interest", type: "income", icon: "Percent", color: "#34d399" },
  { id: "cat_other_income", name: "Other income", type: "income", icon: "CirclePlus", color: "#4ade80" },

  // Savings
  { id: "cat_emergency", name: "Emergency fund", type: "savings", icon: "ShieldCheck", color: "#3b82f6" },
  { id: "cat_savings", name: "Savings", type: "savings", icon: "PiggyBank", color: "#2563eb" },
  { id: "cat_goaltarget", name: "Goal savings", type: "savings", icon: "Target", color: "#1d4ed8" },

  // Investment
  { id: "cat_mutual_funds", name: "Mutual funds", type: "investment", icon: "LineChart", color: "#a855f7" },
  { id: "cat_stocks", name: "Stocks", type: "investment", icon: "TrendingUp", color: "#9333ea" },
  { id: "cat_ppf", name: "PPF / EPF", type: "investment", icon: "Landmark", color: "#c084fc" },
  { id: "cat_gold", name: "Gold", type: "investment", icon: "Gem", color: "#eab308" },
];

/* -------------------------------------------------------------------------- */
/* Dashboard widget metadata                                                    */
/* -------------------------------------------------------------------------- */

export interface WidgetMeta {
  id: WidgetId;
  title: string;
  description: string;
  defaultVisible: boolean;
  defaultSize: WidgetSize;
}

export const WIDGET_META: WidgetMeta[] = [
  { id: "overview", title: "Financial overview", description: "Key numbers for the selected month.", defaultVisible: true, defaultSize: "full" },
  { id: "income-vs-expense", title: "Income vs expenses", description: "Monthly comparison bar chart.", defaultVisible: true, defaultSize: "lg" },
  { id: "category-breakdown", title: "Expense distribution", description: "Donut chart by category.", defaultVisible: true, defaultSize: "md" },
  { id: "savings-tracker", title: "Savings tracker", description: "Net savings and rate over time.", defaultVisible: true, defaultSize: "lg" },
  { id: "budget-progress", title: "Budget progress", description: "Spend against category budgets.", defaultVisible: true, defaultSize: "md" },
  { id: "daily-spending", title: "Daily spending", description: "Day-by-day spend for the month.", defaultVisible: true, defaultSize: "lg" },
  { id: "recent-transactions", title: "Recent transactions", description: "Latest activity in the month.", defaultVisible: true, defaultSize: "md" },
  { id: "financial-goals", title: "Financial goals", description: "Progress towards your goals.", defaultVisible: true, defaultSize: "md" },
  { id: "top-categories", title: "Top categories", description: "Highest spending categories.", defaultVisible: true, defaultSize: "md" },
  { id: "income-overview", title: "Income overview", description: "Income for the month.", defaultVisible: false, defaultSize: "sm" },
  { id: "expense-overview", title: "Expense overview", description: "Expenses for the month.", defaultVisible: false, defaultSize: "sm" },
  { id: "annual-savings-trend", title: "Annual savings trend", description: "Savings across the year.", defaultVisible: false, defaultSize: "lg" },
  { id: "savings-rate", title: "Savings rate", description: "Monthly savings percentages.", defaultVisible: false, defaultSize: "md" },
  { id: "upcoming-recurring", title: "Upcoming recurring", description: "Recurring payments due.", defaultVisible: false, defaultSize: "md" },
];

/* -------------------------------------------------------------------------- */
/* Misc                                                                         */
/* -------------------------------------------------------------------------- */

export const DEFAULT_BUDGET_THRESHOLDS = [75, 90, 100];

export const CURRENCIES: { code: string; label: string; symbol: string; locale: string }[] = [
  { code: "INR", label: "Indian Rupee", symbol: "₹", locale: "en-IN" },
  { code: "USD", label: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", label: "Euro", symbol: "€", locale: "de-DE" },
  { code: "GBP", label: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "AED", label: "UAE Dirham", symbol: "AED ", locale: "en-AE" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$", locale: "en-AU" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$", locale: "en-CA" },
];

/** Deterministic colour palette used when a record has no explicit colour. */
export const PALETTE = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#6366f1",
  "#f43f5e",
  "#84cc16",
  "#06b6d4",
  "#d946ef",
];

export const STORAGE_KEYS = {
  preferences: "budgit.preferences",
  theme: "budgit.theme",
  lastBackup: "budgit.lastBackup",
} as const;

export const SCHEMA = SCHEMA_VERSION;
