import type { ComponentType } from "react";
import type { WidgetId, WidgetSize } from "@/domain/types";
import type { WidgetProps } from "./widgets/metric-widgets";
import {
  ExpenseOverviewWidget,
  FinancialOverviewWidget,
  IncomeOverviewWidget,
  SavingsTrackerWidget,
} from "./widgets/metric-widgets";
import { RecentTransactionsWidget, SavingsInsightsWidget, TopCategoriesWidget, UpcomingRecurringWidget } from "./widgets/list-widgets";
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
 * Chart-driven widgets (income vs expenses, category donut, savings trend,
 * daily spend, annual trend, savings rate) are registered in Phase 4. Anything
 * not present here is hidden from the dashboard and the customise dialog, so
 * the app never shows an empty placeholder shell.
 */
export const WIDGET_REGISTRY: Partial<Record<WidgetId, WidgetDefinition>> = {
  overview: { id: "overview", component: FinancialOverviewWidget, spans: SPANS },
  "income-overview": { id: "income-overview", component: IncomeOverviewWidget, spans: SPANS },
  "expense-overview": { id: "expense-overview", component: ExpenseOverviewWidget, spans: SPANS },
  "savings-tracker": { id: "savings-tracker", component: SavingsTrackerWidget, spans: SPANS },
  "budget-progress": { id: "budget-progress", component: BudgetProgressWidget, spans: SPANS },
  "recent-transactions": { id: "recent-transactions", component: RecentTransactionsWidget, spans: SPANS },
  "financial-goals": { id: "financial-goals", component: FinancialGoalsWidget, spans: SPANS },
  "top-categories": { id: "top-categories", component: TopCategoriesWidget, spans: SPANS },
  "upcoming-recurring": { id: "upcoming-recurring", component: UpcomingRecurringWidget, spans: SPANS },
  "annual-savings-trend": { id: "annual-savings-trend", component: SavingsInsightsWidget, spans: SPANS },
};

export function registeredWidgetIds(): WidgetId[] {
  return Object.keys(WIDGET_REGISTRY) as WidgetId[];
}

export { SPANS as WIDGET_SPANS };
