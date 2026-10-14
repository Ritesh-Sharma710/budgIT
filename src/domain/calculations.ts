/**
 * budgIT — financial calculation engine.
 *
 * Everything in this module is a pure function: no React, no storage, no
 * network. That keeps the numbers testable and lets the same logic drive the
 * dashboard, the reports and the CSV export.
 *
 * Accounting rules
 * ----------------
 * - `income`    → adds to income.
 * - `expense`   → adds to consumption expenses.
 * - `savings_contribution` / `investment_contribution`
 *               → tracked separately and NOT counted as expenses by default,
 *                 so savings are never double-counted.
 * - `transfer`  → never counted as income or expense (moving your own money).
 *
 * Net savings  = income − expenses   (expenses per the rules above).
 * Savings rate = net savings ÷ income × 100, or `null` when income is 0.
 */

import type {
  BudgetLineStatus,
  Category,
  CategoryBudget,
  CategoryTotal,
  GoalContribution,
  GoalProgress,
  MonthlyBudget,
  MonthSummary,
  SavingsGoal,
  Transaction,
  TransactionType,
  YearSummary,
} from "./types";
import { PALETTE } from "./constants";
import {
  addMonths,
  compareMonthKeys,
  currentMonthKey,
  currentYear,
  daysInMonth,
  formatDate,
  monthKeyOf,
  monthStart,
  monthsBetween,
  parseMonthKey,
  toMonthKey,
  todayISO,
} from "@/lib/date";
import { clamp, roundCurrency, savingsRate as computeSavingsRate, sum } from "@/lib/money";

/* -------------------------------------------------------------------------- */
/* Options                                                                      */
/* -------------------------------------------------------------------------- */

export interface CalcOptions {
  /** Count savings/investment contributions as expenses too. Default `false`. */
  countContributionsAsExpenses?: boolean;
}

const DEFAULT_OPTIONS: Required<CalcOptions> = {
  countContributionsAsExpenses: false,
};

/* -------------------------------------------------------------------------- */
/* Filtering helpers                                                            */
/* -------------------------------------------------------------------------- */

export function inMonth(tx: Transaction, month: string): boolean {
  return toMonthKey(tx.date) === month;
}

export function inYear(tx: Transaction, year: number): boolean {
  return tx.date.slice(0, 4) === String(year);
}

export function inDateRange(tx: Transaction, start: string, end: string): boolean {
  return tx.date >= start && tx.date <= end;
}

export function filterByMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((tx) => inMonth(tx, month));
}

export function filterByYear(transactions: Transaction[], year: number): Transaction[] {
  return transactions.filter((tx) => inYear(tx, year));
}

export function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt);
    return b.date.localeCompare(a.date);
  });
}

/* -------------------------------------------------------------------------- */
/* Time-scoped aggregation                                                      */
/* -------------------------------------------------------------------------- */

export function incomeOf(transactions: Transaction[]): number {
  return sum(txsOfType(transactions, "income").map((t) => t.amount));
}

export function expensesOf(transactions: Transaction[], options: CalcOptions = {}): number {
  const { countContributionsAsExpenses } = { ...DEFAULT_OPTIONS, ...options };
  const base = sum(txsOfType(transactions, "expense").map((t) => t.amount));
  if (!countContributionsAsExpenses) return base;
  const contributions = sum(
    transactions
      .filter((t) => t.type === "savings_contribution" || t.type === "investment_contribution")
      .map((t) => t.amount),
  );
  return roundCurrency(base + contributions);
}

export function contributionsOf(transactions: Transaction[], type: "savings" | "investment"): number {
  const target: TransactionType =
    type === "savings" ? "savings_contribution" : "investment_contribution";
  return sum(transactions.filter((t) => t.type === target).map((t) => t.amount));
}

export function transfersOf(transactions: Transaction[]): number {
  return sum(txsOfType(transactions, "transfer").map((t) => t.amount));
}

export function txsOfType(transactions: Transaction[], type: TransactionType): Transaction[] {
  return transactions.filter((t) => t.type === type);
}

/* -------------------------------------------------------------------------- */
/* Summaries                                                                    */
/* -------------------------------------------------------------------------- */

export function summarize(transactions: Transaction[], options: CalcOptions = {}): Omit<MonthSummary, "month"> {
  const income = incomeOf(transactions);
  const expenses = expensesOf(transactions, options);
  const netSavings = roundCurrency(income - expenses);
  const rate = computeSavingsRate(netSavings, income);
  return {
    income,
    expenses,
    savingsContributions: contributionsOf(transactions, "savings"),
    investmentContributions: contributionsOf(transactions, "investment"),
    transfers: transfersOf(transactions),
    netSavings,
    savingsRate: rate ?? 0,
    transactionCount: transactions.length,
  };
}

export function summarizeMonth(
  transactions: Transaction[],
  month: string,
  options: CalcOptions = {},
): MonthSummary {
  return { month, ...summarize(filterByMonth(transactions, month), options) };
}

export function summarizeYear(
  transactions: Transaction[],
  year: number,
  options: CalcOptions = {},
): YearSummary {
  const months = monthSummariesForRange(transactions, `${year}-01`, `${year}-12`, options);
  const income = sum(months.map((m) => m.income));
  const expenses = sum(months.map((m) => m.expenses));
  const netSavings = roundCurrency(income - expenses);
  const activeMonths = months.filter((m) => m.transactionCount > 0).length;
  return {
    year,
    income,
    expenses,
    netSavings,
    savingsRate: computeSavingsRate(netSavings, income) ?? 0,
    months,
    activeMonths,
  };
}

/** Contiguous month summaries between two month keys (inclusive). */
export function monthSummariesForRange(
  transactions: Transaction[],
  startMonth: string,
  endMonth: string,
  options: CalcOptions = {},
): MonthSummary[] {
  if (compareMonthKeys(startMonth, endMonth) > 0) return [];
  const byMonth = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = toMonthKey(tx.date);
    if (key < startMonth || key > endMonth) continue;
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(tx);
    else byMonth.set(key, [tx]);
  }

  const out: MonthSummary[] = [];
  let cursor = startMonth;
  let guard = 0;
  while (cursor <= endMonth && guard < 1200) {
    out.push({ month: cursor, ...summarize(byMonth.get(cursor) ?? [], options) });
    cursor = addMonths(cursor, 1);
    guard += 1;
  }
  return out;
}

/** Last `count` months ending at `endMonth` (inclusive), oldest first. */
export function trailingMonths(
  transactions: Transaction[],
  endMonth: string,
  count = 6,
  options: CalcOptions = {},
): MonthSummary[] {
  return monthSummariesForRange(transactions, addMonths(endMonth, -(count - 1)), endMonth, options);
}

/* -------------------------------------------------------------------------- */
/* Category analysis                                                            */
/* -------------------------------------------------------------------------- */

export function categoryColor(category: Category | undefined, index = 0): string {
  if (category?.color) return category.color;
  return PALETTE[index % PALETTE.length];
}

/** Totals per category for a set of transactions, largest first. */
export function categoryTotals(
  transactions: Transaction[],
  categories: Category[],
  filter: { type?: TransactionType | TransactionType[] } = {},
): CategoryTotal[] {
  const types = filter.type
    ? Array.isArray(filter.type)
      ? filter.type
      : [filter.type]
    : undefined;

  const dir = new Map(categories.map((c) => [c.id, c]));
  const buckets = new Map<string, { total: number; count: number }>();

  for (const tx of transactions) {
    if (types && !types.includes(tx.type)) continue;
    if (tx.type === "transfer") continue;
    const bucket = buckets.get(tx.categoryId) ?? { total: 0, count: 0 };
    bucket.total += tx.amount;
    bucket.count += 1;
    buckets.set(tx.categoryId, bucket);
  }

  const grandTotal = sum([...buckets.values()].map((b) => b.total));

  return [...buckets.entries()]
    .map(([categoryId, { total, count }], i) => {
      const category = dir.get(categoryId);
      return {
        categoryId,
        name: category?.name ?? "Uncategorised",
        color: categoryColor(category, i),
        total: roundCurrency(total),
        share: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        transactionCount: count,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/* -------------------------------------------------------------------------- */
/* Budgets                                                                      */
/* -------------------------------------------------------------------------- */

export interface BudgetEvaluation {
  month: string;
  budget: MonthlyBudget | null;
  lines: BudgetLineStatus[];
  totalBudgeted: number;
  totalSpent: number;
  overallRemaining: number | null;
  overallUtilization: number | null;
  savingsTarget: number | null;
  savingsProgress: number | null;
}

function lineStatus(utilization: number, thresholds: number[]): BudgetLineStatus["status"] {
  const [warn = 75, crit = 90] = thresholds;
  if (utilization >= 100) return "exceeded";
  if (utilization >= crit) return "critical";
  if (utilization >= warn) return "warning";
  return "ok";
}

/**
 * Evaluate a month against its budget. Categories without a configured budget
 * are never treated as a zero budget — they appear as `none` so the UI can say
 * "no budget set" instead of "100% over".
 */
export function evaluateBudget(
  transactions: Transaction[],
  categories: Category[],
  budgetsForMonth: CategoryBudget[],
  budget: MonthlyBudget | null,
  month: string = currentMonthKey(),
  thresholds: number[] = [75, 90, 100],
): BudgetEvaluation {
  const monthTx = filterByMonth(transactions, month);

  const spentByCategory = new Map<string, number>();
  for (const tx of monthTx) {
    if (tx.type !== "expense") continue;
    spentByCategory.set(tx.categoryId, (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }

  const budgetByCategory = new Map(budgetsForMonth.map((b) => [b.categoryId, b.amount]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  const ids = new Set<string>([...budgetByCategory.keys(), ...spentByCategory.keys()]);

  const lines: BudgetLineStatus[] = [...ids].map((categoryId, i) => {
    const budgeted = budgetByCategory.get(categoryId) ?? 0;
    const spent = roundCurrency(spentByCategory.get(categoryId) ?? 0);
    const category = catById.get(categoryId);
    const utilization = budgeted > 0 ? (spent / budgeted) * 100 : spent > 0 ? Infinity : 0;
    return {
      categoryId,
      categoryName: category?.name ?? "Uncategorised",
      color: categoryColor(category, i),
      budgeted,
      spent,
      remaining: roundCurrency(budgeted - spent),
      utilization,
      status: budgeted <= 0 ? "none" : lineStatus(utilization, thresholds),
    };
  });

  lines.sort((a, b) => {
    if (a.status === "none" && b.status !== "none") return 1;
    if (b.status === "none" && a.status !== "none") return -1;
    return b.spent - a.spent;
  });

  const totalBudgeted = sum(lines.filter((l) => l.budgeted > 0).map((l) => l.budgeted));
  const totalSpent = sum(monthTx.filter((t) => t.type === "expense").map((t) => t.amount));
  const effectiveLimit = budget?.overallLimit ?? (totalBudgeted > 0 ? totalBudgeted : null);

  const savingsTarget = budget?.savingsTarget ?? null;
  const savingsContrib = contributionsOf(monthTx, "savings");

  return {
    month,
    budget,
    lines,
    totalBudgeted,
    totalSpent,
    overallRemaining: effectiveLimit === null ? null : roundCurrency(effectiveLimit - totalSpent),
    overallUtilization: effectiveLimit ? (totalSpent / effectiveLimit) * 100 : null,
    savingsTarget,
    savingsProgress: savingsTarget ? (savingsContrib / savingsTarget) * 100 : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Savings goals                                                                */
/* -------------------------------------------------------------------------- */

export function goalSaved(goal: SavingsGoal, contributions: GoalContribution[]): number {
  return roundCurrency(
    goal.initialAmount + sum(contributions.filter((c) => c.goalId === goal.id).map((c) => c.amount)),
  );
}

export function goalProgress(
  goal: SavingsGoal,
  contributions: GoalContribution[],
  asOf: string = todayISO(),
): GoalProgress {
  const saved = goalSaved(goal, contributions);
  const target = Math.max(goal.targetAmount, 0);
  const remaining = roundCurrency(Math.max(target - saved, 0));
  const progress = target > 0 ? clamp((saved / target) * 100, 0, 100) : 0;

  const currentMonth = toMonthKey(asOf);
  let monthsRemaining: number | null = null;
  let requiredMonthly: number | null = null;
  let status: GoalProgress["status"] = "no-target-date";

  if (goal.targetDate) {
    monthsRemaining = Math.max(monthsBetween(currentMonth, toMonthKey(goal.targetDate)), 0);
    requiredMonthly = monthsRemaining > 0 ? roundCurrency(remaining / monthsRemaining) : remaining;

    if (saved >= target && target > 0) {
      status = "completed";
    } else if (compareMonthKeys(toMonthKey(goal.targetDate), currentMonth) < 0) {
      status = "overdue";
    } else {
      // Linear expected progress from the goal's start to its target date.
      const totalMonths = Math.max(monthsBetween(toMonthKey(goal.createdAt), toMonthKey(goal.targetDate)), 1);
      const elapsed = clamp(monthsBetween(toMonthKey(goal.createdAt), currentMonth), 0, totalMonths);
      const expected = (elapsed / totalMonths) * 100;
      status = progress + 5 >= expected ? "on-track" : "behind";
    }
  } else if (saved >= target && target > 0) {
    status = "completed";
  }

  if (goal.status === "completed" && target > 0 && saved >= target) status = "completed";

  return { goal, saved, remaining, progress, monthsRemaining, requiredMonthly, status };
}

/* -------------------------------------------------------------------------- */
/* Daily / trend series                                                         */
/* -------------------------------------------------------------------------- */

export interface DailyPoint {
  date: string;
  day: number;
  amount: number;
  cumulative: number;
}

export function dailySpending(
  transactions: Transaction[],
  month: string,
  options: CalcOptions = {},
): DailyPoint[] {
  const monthTx = filterByMonth(transactions, month);
  const { year, month: m } = parseMonthKey(month);
  const total = daysInMonth(year, m);
  const buckets = new Array<number>(total + 1).fill(0);

  for (const tx of monthTx) {
    const counts = tx.type === "expense" || (options.countContributionsAsExpenses && tx.type !== "income" && tx.type !== "transfer");
    if (!counts) continue;
    const day = Number(tx.date.slice(8, 10));
    buckets[day] += tx.amount;
  }

  let cumulative = 0;
  const out: DailyPoint[] = [];
  for (let day = 1; day <= total; day += 1) {
    const amount = roundCurrency(buckets[day]);
    cumulative = roundCurrency(cumulative + amount);
    out.push({ date: `${month}-${day < 10 ? "0" : ""}${day}`, day, amount, cumulative });
  }
  return out;
}

/** Compare a metric per category across two months (for the comparison chart). */
export interface CategoryComparison {
  categoryId: string;
  name: string;
  color: string;
  current: number;
  previous: number;
  change: number;
}

export function compareCategorySpending(
  transactions: Transaction[],
  categories: Category[],
  currentMonth: string,
  previousMonthKey: string,
): CategoryComparison[] {
  const current = categoryTotals(filterByMonth(transactions, currentMonth), categories, { type: "expense" });
  const previous = categoryTotals(filterByMonth(transactions, previousMonthKey), categories, { type: "expense" });
  const prevMap = new Map(previous.map((c) => [c.categoryId, c.total]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  const ids = new Set([...current.map((c) => c.categoryId), ...prevMap.keys()]);

  return [...ids]
    .map((categoryId, i) => {
      const category = catById.get(categoryId);
      const cur = current.find((c) => c.categoryId === categoryId)?.total ?? 0;
      const prev = prevMap.get(categoryId) ?? 0;
      return {
        categoryId,
        name: category?.name ?? "Uncategorised",
        color: categoryColor(category, i),
        current: cur,
        previous: prev,
        change: roundCurrency(cur - prev),
      };
    })
    .sort((a, b) => Math.max(b.current, b.previous) - Math.max(a.current, a.previous));
}

/* -------------------------------------------------------------------------- */
/* Reporting helpers                                                            */
/* -------------------------------------------------------------------------- */

export interface MonthComparison {
  current: MonthSummary;
  previous: MonthSummary;
  incomeChange: number | null;
  expenseChange: number | null;
  netSavingsChange: number;
  savingsRateChange: number | null;
}

export function compareMonths(
  transactions: Transaction[],
  month: string,
  options: CalcOptions = {},
): MonthComparison {
  const previousKey = addMonths(month, -1);
  const current = summarizeMonth(transactions, month, options);
  const previous = summarizeMonth(transactions, previousKey, options);
  return {
    current,
    previous,
    incomeChange: previous.income === 0 ? null : ((current.income - previous.income) / previous.income) * 100,
    expenseChange: previous.expenses === 0 ? null : ((current.expenses - previous.expenses) / previous.expenses) * 100,
    netSavingsChange: roundCurrency(current.netSavings - previous.netSavings),
    savingsRateChange:
      previous.income > 0 && current.income > 0 ? current.savingsRate - previous.savingsRate : null,
  };
}

export interface AnnualInsights {
  summary: YearSummary;
  highestMonth: MonthSummary | null;
  lowestMonth: MonthSummary | null;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlySavings: number;
  topCategories: CategoryTotal[];
  previousYear: YearSummary | null;
}

function extremes(months: MonthSummary[]): { highest: MonthSummary | null; lowest: MonthSummary | null } {
  const active = months.filter((m) => m.transactionCount > 0);
  if (active.length === 0) return { highest: null, lowest: null };
  return {
    highest: active.reduce((a, b) => (b.expenses > a.expenses ? b : a)),
    lowest: active.reduce((a, b) => (b.expenses < a.expenses ? b : a)),
  };
}

export function annualInsights(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  options: CalcOptions = {},
): AnnualInsights {
  const summary = summarizeYear(transactions, year, options);
  const activeMonths = summary.months.filter((m) => m.transactionCount > 0);
  const divisor = Math.max(activeMonths.length, 1);
  const { highest, lowest } = extremes(summary.months);

  const yearTx = filterByYear(transactions, year);
  const prevYearTx = filterByYear(transactions, year - 1);

  return {
    summary,
    highestMonth: highest,
    lowestMonth: lowest,
    averageMonthlyIncome: roundCurrency(summary.income / divisor),
    averageMonthlyExpenses: roundCurrency(summary.expenses / divisor),
    averageMonthlySavings: roundCurrency(summary.netSavings / divisor),
    topCategories: categoryTotals(yearTx, categories, { type: "expense" }).slice(0, 8),
    previousYear: prevYearTx.length > 0 ? summarizeYear(transactions, year - 1, options) : null,
  };
}

export function largestTransactions(transactions: Transaction[], limit = 5): Transaction[] {
  return [...transactions]
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/** Years that have at least one transaction, newest first (always includes now). */
export function yearsWithData(transactions: Transaction[]): number[] {
  const years = new Set<number>(transactions.map((t) => Number(t.date.slice(0, 4))));
  years.add(currentYear());
  return [...years].sort((a, b) => b - a);
}

export function monthsWithData(transactions: Transaction[]): string[] {
  const months = new Set(transactions.map((t) => toMonthKey(t.date)));
  months.add(currentMonthKey());
  return [...months].sort((a, b) => (a < b ? 1 : -1));
}

/* -------------------------------------------------------------------------- */
/* Recurring helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Next due date (>= today) for a monthly rule anchored on a day of month. */
export function nextDueDate(anchor: number, from: string = todayISO()): string {
  const safeAnchor = clamp(anchor, 1, 28);
  const fromMonth = toMonthKey(from);
  const candidate = `${fromMonth}-${String(safeAnchor).padStart(2, "0")}`;
  if (candidate >= from) return candidate;
  const next = addMonths(fromMonth, 1);
  return `${next}-${String(safeAnchor).padStart(2, "0")}`;
}

export function upcomingRecurring<T extends { anchor: number; active: boolean; frequency: string; startDate: string }>(
  rules: T[],
  from: string = todayISO(),
): { rule: T; due: string }[] {
  return rules
    .filter((r) => r.active)
    .map((r) => ({ rule: r, due: nextDueDate(r.anchor, from) }))
    .sort((a, b) => a.due.localeCompare(b.due));
}

/* -------------------------------------------------------------------------- */
/* Small formatting helpers reused by charts                                    */
/* -------------------------------------------------------------------------- */

export function monthAxisLabel(month: string): string {
  const { year, month: m } = parseMonthKey(month);
  return new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(year, m - 1, 1));
}

export function monthRangeLabel(month: string): string {
  return `${formatDate(monthStart(month), "en-IN", { day: "numeric", month: "short" })} – ${formatDate(
    `${month}-${String(daysInMonth(parseMonthKey(month).year, parseMonthKey(month).month)).padStart(2, "0")}`,
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" },
  )}`;
}

export function monthKeyFor(year: number, month: number): string {
  return monthKeyOf(year, month);
}
