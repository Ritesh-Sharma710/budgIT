import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { categoryTotals, filterByMonth, summarizeMonth } from "@/domain/calculations";
import { useCategories, useSettings, useTransactions } from "@/state/hooks";
import { useFormat } from "@/state/format";
import { useUIStore } from "@/state/ui";
import { daysInMonth, formatDate, monthLabel, parseMonthKey } from "@/lib/date";

export function MonthlyReportPage() {
  const fmt = useFormat();
  const settings = useSettings();
  const month = useUIStore((s) => s.selectedMonth);
  const allTransactions = useTransactions();
  const categories = useCategories();

  const monthTxs = useMemo(() => filterByMonth(allTransactions, month), [allTransactions, month]);

  const summary = useMemo(() => {
    return summarizeMonth(allTransactions, month, {
      countContributionsAsExpenses: settings.countContributionsAsExpenses,
    });
  }, [allTransactions, month, settings.countContributionsAsExpenses]);

  const expenseCategories = useMemo(() => {
    return categoryTotals(monthTxs, categories, { type: "expense" });
  }, [monthTxs, categories]);

  const incomeCategories = useMemo(() => {
    return categoryTotals(monthTxs, categories, { type: "income" });
  }, [monthTxs, categories]);

  // Daily Spending distribution across the month
  const dailyData = useMemo(() => {
    const { year, month: mNum } = parseMonthKey(month);
    const totalDays = daysInMonth(year, mNum);
    const dayTotals = new Array(totalDays).fill(0);

    for (const tx of monthTxs) {
      if (tx.type === "expense") {
        const day = parseInt(tx.date.slice(8, 10), 10);
        if (day >= 1 && day <= totalDays) {
          dayTotals[day - 1] += tx.amount;
        }
      }
    }

    return dayTotals.map((amount, idx) => ({
      day: `${idx + 1}`,
      expense: amount,
    }));
  }, [month, monthTxs]);

  // Top 5 largest expenses
  const topExpenses = useMemo(() => {
    return monthTxs
      .filter((t) => t.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthTxs]);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const hasData = monthTxs.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Financial Report"
        description={`Comprehensive income, spending, and savings analysis for ${monthLabel(month)}.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports/annual">View Annual Report</Link>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Income"
          value={fmt.money(summary.income)}
          subtitle={`${monthTxs.filter((t) => t.type === "income").length} income entries`}
          tone="positive"
          icon={ArrowUpRight}
        />
        <StatCard
          title="Total Expenses"
          value={fmt.money(summary.expenses)}
          subtitle={`${monthTxs.filter((t) => t.type === "expense").length} expense records`}
          tone="negative"
          icon={ArrowDownRight}
        />
        <StatCard
          title="Net Savings"
          value={fmt.money(summary.netSavings)}
          subtitle={summary.netSavings >= 0 ? "Surplus saved" : "Deficit this month"}
          tone={summary.netSavings >= 0 ? "positive" : "destructive"}
          icon={Wallet}
        />
        <StatCard
          title="Savings Rate"
          value={fmt.percent(summary.savingsRate)}
          subtitle={
            summary.income > 0 ? "Of total monthly income" : "No income recorded"
          }
          tone="accent"
          icon={summary.savingsRate >= 20 ? TrendingUp : TrendingDown}
        />
      </div>

      {!hasData ? (
        <EmptyState
          title="No transactions for this month"
          description={`There are no financial records for ${monthLabel(month)}. Add transactions or switch to another month to view detailed reports.`}
          action={
            <Button size="sm" asChild>
              <Link to="/transactions">Add a Transaction</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Category Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Where your money went in {monthLabel(month)}</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseCategories.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No expense transactions recorded this month.
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <div className="h-64 w-full sm:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseCategories}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                          >
                            {expenseCategories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [fmt.money(Number(value) || 0), "Spent"]}
                            contentStyle={{
                              backgroundColor: "var(--color-card)",
                              borderColor: "var(--color-border)",
                              borderRadius: "8px",
                              color: "var(--color-foreground)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full space-y-2 sm:w-1/2">
                      <div className="max-h-60 overflow-y-auto divide-y divide-border pr-2">
                        {expenseCategories.map((cat) => (
                          <div key={cat.categoryId} className="flex items-center justify-between py-1.5 text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="truncate font-medium">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 tabular-nums">
                              <span className="text-muted-foreground">{fmt.percent(cat.share)}</span>
                              <span className="font-semibold">{fmt.money(cat.total)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Expense Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Spending Trend</CardTitle>
                <CardDescription>Day-by-day expense pattern across the month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} tickFormatter={(value: number) => fmt.moneyCompact(value)} />
                      <Tooltip
                        formatter={(value: any) => [fmt.money(Number(value) || 0), "Spent"]}
                        labelFormatter={(label) => `Day ${label}`}
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          borderColor: "var(--color-border)",
                          borderRadius: "8px",
                          color: "var(--color-foreground)",
                        }}
                      />
                      <Bar dataKey="expense" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Income Breakdown & Top Expenses */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Top Expenses This Month</CardTitle>
                <CardDescription>Your largest single spending transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {topExpenses.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No expense records found.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {topExpenses.map((tx) => {
                      const category = catById.get(tx.categoryId);
                      return (
                        <div key={tx.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-sm font-medium">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {category?.name ?? "General"} • {formatDate(tx.date)}
                            </p>
                          </div>
                          <span className="font-semibold tabular-nums text-foreground">
                            {fmt.money(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Streams */}
            <Card>
              <CardHeader>
                <CardTitle>Income Breakdown</CardTitle>
                <CardDescription>Sources of earnings received in {monthLabel(month)}</CardDescription>
              </CardHeader>
              <CardContent>
                {incomeCategories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No income entries recorded this month.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {incomeCategories.map((cat) => (
                      <div key={cat.categoryId} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div>
                            <p className="text-sm font-medium">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {cat.transactionCount} deposit{cat.transactionCount > 1 ? "s" : ""} (
                              {fmt.percent(cat.share)})
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold tabular-nums text-success">
                          +{fmt.money(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
