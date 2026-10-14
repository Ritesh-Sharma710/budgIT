import { useMemo } from "react";
import {
  annualInsights,
  categoryTotals,
  compareCategorySpending,
  compareMonths,
  dailySpending,
  evaluateBudget,
  filterByMonth,
  goalProgress,
  largestTransactions,
  sortByDateDesc,
  summarizeMonth,
  summarizeYear,
  trailingMonths,
  upcomingRecurring,
  yearsWithData,
  monthsWithData,
} from "@/domain/calculations";
import type { CategoryTotal, GoalProgress, MonthSummary, Transaction } from "@/domain/types";
import { monthSummariesForRange } from "@/domain/calculations";
import { previousMonth } from "@/lib/date";
import {
  useCategories,
  useCategoryBudgets,
  useGoalContributions,
  useGoals,
  useMonthlyBudget,
  useRecurring,
  useSettings,
  useTransactions,
} from "./hooks";
import { useUIStore } from "./ui";

/**
 * Single source of truth for everything the dashboard, reports and charts need
 * for the currently selected month/year. All heavy aggregation happens here,
 * once, instead of inside each widget.
 */
export function useDashboardData() {
  const month = useUIStore((s) => s.selectedMonth);
  const year = useUIStore((s) => s.selectedYear);

  const transactions = useTransactions();
  const categories = useCategories();
  const settings = useSettings();
  const budget = useMonthlyBudget(month);
  const categoryBudgets = useCategoryBudgets(month);
  const goals = useGoals();
  const contributions = useGoalContributions();
  const recurring = useRecurring();

  const options = useMemo(
    () => ({ countContributionsAsExpenses: settings.countContributionsAsExpenses }),
    [settings.countContributionsAsExpenses],
  );

  const summary = useMemo(() => summarizeMonth(transactions, month, options), [transactions, month, options]);

  const previousSummary = useMemo(
    () => summarizeMonth(transactions, previousMonth(month), options),
    [transactions, month, options],
  );

  const comparison = useMemo(() => compareMonths(transactions, month, options), [transactions, month, options]);

  const monthTransactions = useMemo(() => filterByMonth(transactions, month), [transactions, month]);

  const categoryBreakdown: CategoryTotal[] = useMemo(
    () => categoryTotals(monthTransactions, categories, { type: "expense" }),
    [monthTransactions, categories],
  );

  const incomeBreakdown: CategoryTotal[] = useMemo(
    () => categoryTotals(monthTransactions, categories, { type: "income" }),
    [monthTransactions, categories],
  );

  const categoryComparison = useMemo(
    () => compareCategorySpending(transactions, categories, month, previousMonth(month)),
    [transactions, categories, month],
  );

  const budgetEvaluation = useMemo(
    () => evaluateBudget(transactions, categories, categoryBudgets, budget ?? null, month, settings.budgetThresholds),
    [transactions, categories, categoryBudgets, budget, month, settings.budgetThresholds],
  );

  const daily = useMemo(() => dailySpending(transactions, month, options), [transactions, month, options]);

  const trailing = useMemo(() => trailingMonths(transactions, month, 12, options), [transactions, month, options]);

  const yearSummary = useMemo(() => summarizeYear(transactions, year, options), [transactions, year, options]);

  const insights = useMemo(
    () => annualInsights(transactions, categories, year, options),
    [transactions, categories, year, options],
  );

  const yearSeries: MonthSummary[] = useMemo(
    () => monthSummariesForRange(transactions, `${year}-01`, `${year}-12`, options),
    [transactions, year, options],
  );

  const goalProgressList: GoalProgress[] = useMemo(
    () =>
      goals
        .filter((g) => g.status !== "archived")
        .map((goal) => goalProgress(goal, contributions))
        .sort((a, b) => b.progress - a.progress),
    [goals, contributions],
  );

  const recentTransactions: Transaction[] = useMemo(
    () => sortByDateDesc(monthTransactions).slice(0, 6),
    [monthTransactions],
  );

  const topTransactions = useMemo(() => largestTransactions(monthTransactions, 5), [monthTransactions]);

  const recurringUpcoming = useMemo(() => upcomingRecurring(recurring).slice(0, 5), [recurring]);

  const years = useMemo(() => yearsWithData(transactions), [transactions]);
  const months = useMemo(() => monthsWithData(transactions), [transactions]);

  return {
    month,
    year,
    settings,
    transactions,
    categories,
    summary,
    previousSummary,
    comparison,
    monthTransactions,
    categoryBreakdown,
    incomeBreakdown,
    categoryComparison,
    budgetEvaluation,
    daily,
    trailing,
    yearSummary,
    insights,
    yearSeries,
    goalProgressList,
    recentTransactions,
    topTransactions,
    recurringUpcoming,
    years,
    months,
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
