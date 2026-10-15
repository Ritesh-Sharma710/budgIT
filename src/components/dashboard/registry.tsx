import type { ComponentType } from "react";
import type { WidgetId, WidgetSize } from "@/domain/types";
import type { WidgetProps } from "./widgets/metric-widgets";
import {
  ExpenseOverviewWidget,
  FinancialOverviewWidget,
  IncomeOverviewWidget,
  SavingsTrackerWidget,
} from "./widgets/metric-widgets";
import { RecentTransactionsWidget, TopCategoriesWidget, UpcomingRecurringWidget } from "./widgets/list-widgets";
import {
  AnnualSavingsTrendWidget,
  CategoryBreakdownWidget,
  DailySpendingWidget,
  IncomeVsExpenseWidget,
  SavingsRateWidget,
} from "./widgets/chart-widgets";
import { BudgetProgressWidget } from "./widgets/budget-widget";
import { FinancialGoalsWidget } from "./widgets/goals-widget";

export interface WidgetDefinition {
  id: WidgetId;
  component: ComponentType<WidgetProps>;
  /** Grid span per breakpoint, keyed by widget size. */
  spans: Record<WidgetSize, string>;
}

const SPANS: Record<WidgetSize, string> = {
  sm: "sm:col-span-1 lg:col-span-2",
  md: "sm:col-span-2 lg:col-span-3",
  lg: "sm:col-span-2 lg:col-span-4",
  full: "sm:col-span-2 lg:col-span-6",
};

/**
 * Widget registry.
 *
 * Maps every widget id to its renderer and responsive grid span. Anything not
 * present here is hidden from the dashboard and the customise dialog, so the
 * app never shows an empty placeholder shell.
 */
export const WIDGET_REGISTRY: Partial<Record<WidgetId, WidgetDefinition>> = {
  overview: { id: "overview", component: FinancialOverviewWidget, spans: SPANS },
  "income-vs-expense": { id: "income-vs-expense", component: IncomeVsExpenseWidget, spans: SPANS },
  "category-breakdown": { id: "category-breakdown", component: CategoryBreakdownWidget, spans: SPANS },
  "savings-tracker": { id: "savings-tracker", component: SavingsTrackerWidget, spans: SPANS },
  "budget-progress": { id: "budget-progress", component: BudgetProgressWidget, spans: SPANS },
  "daily-spending": { id: "daily-spending", component: DailySpendingWidget, spans: SPANS },
  "recent-transactions": { id: "recent-transactions", component: RecentTransactionsWidget, spans: SPANS },
  "financial-goals": { id: "financial-goals", component: FinancialGoalsWidget, spans: SPANS },
  "top-categories": { id: "top-categories", component: TopCategoriesWidget, spans: SPANS },
  "income-overview": { id: "income-overview", component: IncomeOverviewWidget, spans: SPANS },
  "expense-overview": { id: "expense-overview", component: ExpenseOverviewWidget, spans: SPANS },
  "annual-savings-trend": { id: "annual-savings-trend", component: AnnualSavingsTrendWidget, spans: SPANS },
  "savings-rate": { id: "savings-rate", component: SavingsRateWidget, spans: SPANS },
  "upcoming-recurring": { id: "upcoming-recurring", component: UpcomingRecurringWidget, spans: SPANS },
};

export function registeredWidgetIds(): WidgetId[] {
  return Object.keys(WIDGET_REGISTRY) as WidgetId[];
}

export { SPANS as WIDGET_SPANS };
