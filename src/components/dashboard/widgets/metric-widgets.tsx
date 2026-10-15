import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarCheck,
  PiggyBank,
  Percent,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { StatCard } from "../stat-card";
import { WidgetCard } from "../widget-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TRANSACTION_TYPE_META } from "@/domain/constants";
import { categoryTotals } from "@/domain/calculations";
import { useFormat } from "@/state/format";
import type { DashboardData } from "@/state/dashboard-data";
import { monthLabel } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface WidgetProps {
  data: DashboardData;
}

export function FinancialOverviewWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { summary, comparison, budgetEvaluation, yearSeries, month, year } = data;

  const savingsRateValue = summary.income > 0 ? summary.savingsRate : null;

  const yearToDate = yearSeries.filter((m) => m.month <= month);
  const ytdSavings = yearToDate.reduce((acc, m) => acc + m.netSavings, 0);
  const ytdIncome = yearToDate.reduce((acc, m) => acc + m.income, 0);
  const ytdExpenses = yearToDate.reduce((acc, m) => acc + m.expenses, 0);

  const budgetTone =
    budgetEvaluation.overallUtilization === null
      ? "default"
      : budgetEvaluation.overallUtilization >= 100
        ? "negative"
        : budgetEvaluation.overallUtilization >= 90
          ? "warning"
          : "positive";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Income"
        value={fmt.money(summary.income)}
        icon={ArrowUpCircle}
        tone="positive"
        change={comparison.incomeChange}
        changeLabel="vs last month"
      />
      <StatCard
        title="Expenses"
        value={fmt.money(summary.expenses)}
        icon={ArrowDownCircle}
        tone="negative"
        invertChange
        change={comparison.expenseChange}
        changeLabel="vs last month"
      />
      <StatCard
        title="Net savings"
        value={fmt.money(summary.netSavings)}
        icon={PiggyBank}
        tone={summary.netSavings >= 0 ? "positive" : "negative"}
        change={comparison.previous.netSavings !== 0 ? comparison.netSavingsChange : null}
        changeLabel="vs last month"
      />
      <StatCard
        title="Savings rate"
        value={savingsRateValue === null ? "—" : fmt.percent(savingsRateValue)}
        icon={Percent}
        subtitle={savingsRateValue === null ? "No income recorded" : "of this month's income"}
      />
      <StatCard
        title="Remaining budget"
        value={
          budgetEvaluation.overallRemaining === null ? "Not set" : fmt.money(budgetEvaluation.overallRemaining)
        }
        icon={Wallet}
        tone={budgetTone}
        subtitle={
          budgetEvaluation.overallUtilization === null
            ? "Set a budget to track this"
            : `${fmt.percent(budgetEvaluation.overallUtilization, 0)} used`
        }
      />
      <StatCard
        title={`${year} savings`}
        value={fmt.money(ytdSavings)}
        icon={TrendingUp}
        tone={ytdSavings >= 0 ? "positive" : "negative"}
        subtitle={`${monthLabel(month, { short: true })} to date`}
      />
      <StatCard
        title={`${year} income / expenses`}
        value={`${fmt.moneyCompact(ytdIncome)} / ${fmt.moneyCompact(ytdExpenses)}`}
        icon={Scale}
        subtitle="Year to date"
      />
      <StatCard
        title="Month-on-month"
        value={fmt.signed(comparison.netSavingsChange)}
        icon={CalendarCheck}
        tone={comparison.netSavingsChange >= 0 ? "positive" : "negative"}
        subtitle={`Net savings vs ${monthLabel(month, { short: true })}`}
      />
    </div>
  );
}

export function IncomeOverviewWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { summary, monthTransactions, categories, month } = data;
  const breakdown = categoryTotals(monthTransactions, categories, { type: "income" });

  return (
    <WidgetCard title="Income overview" description={monthLabel(month)}>
      <p className="text-2xl font-semibold tabular-nums text-success">{fmt.money(summary.income)}</p>
      <div className="mt-3 space-y-2">
        {breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No income recorded this month.</p>
        ) : (
          breakdown.slice(0, 4).map((row) => (
            <div key={row.categoryId} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="truncate">{row.name}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">{fmt.money(row.total)}</span>
            </div>
          ))
        )}
      </div>
    </WidgetCard>
  );
}

export function ExpenseOverviewWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { summary, categoryBreakdown, month } = data;

  return (
    <WidgetCard title="Expense overview" description={monthLabel(month)}>
      <p className="text-2xl font-semibold tabular-nums text-destructive">{fmt.money(summary.expenses)}</p>
      <div className="mt-3 space-y-2">
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses recorded this month.</p>
        ) : (
          categoryBreakdown.slice(0, 4).map((row) => (
            <div key={row.categoryId} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span>
                <span className="tabular-nums text-muted-foreground">{fmt.money(row.total)}</span>
              </div>
              <Progress value={row.share} className="h-1.5" indicatorClassName="bg-chart-5" />
            </div>
          ))
        )}
      </div>
    </WidgetCard>
  );
}

export function SavingsTrackerWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { summary, trailing, month } = data;

  const best = [...trailing].sort((a, b) => b.netSavings - a.netSavings)[0];
  const savedThisMonth = summary.savingsContributions + summary.investmentContributions;

  return (
    <WidgetCard title="Savings tracker" description={`Rolling 12 months to ${monthLabel(month, { short: true })}`}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Net savings</p>
          <p className={cn("mt-1 text-xl font-semibold tabular-nums", summary.netSavings >= 0 ? "text-success" : "text-destructive")}>
            {fmt.money(summary.netSavings)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Moved to savings &amp; investments</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{fmt.money(savedThisMonth)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>12-month total</span>
          <span className="tabular-nums">{fmt.money(trailing.reduce((a, m) => a + m.netSavings, 0))}</span>
        </div>
        {best ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Best month</span>
            <span className="tabular-nums">
              {monthLabel(best.month, { short: true })} · {fmt.money(best.netSavings)}
            </span>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="outline" className="gap-1">
            {TRANSACTION_TYPE_META.savings_contribution.shortLabel}
            <span className="tabular-nums">{fmt.money(summary.savingsContributions)}</span>
          </Badge>
          <Badge variant="outline" className="gap-1">
            {TRANSACTION_TYPE_META.investment_contribution.shortLabel}
            <span className="tabular-nums">{fmt.money(summary.investmentContributions)}</span>
          </Badge>
          <Badge variant="outline" className="gap-1">
            Transfers
            <span className="tabular-nums">{fmt.money(summary.transfers)}</span>
          </Badge>
        </div>
      </div>
    </WidgetCard>
  );
}
