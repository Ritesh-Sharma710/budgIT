import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { summarizeYear } from "@/domain/calculations";
import { useSettings, useTransactions } from "@/state/hooks";
import { useFormat } from "@/state/format";
import { useUIStore } from "@/state/ui";
import { currentYear, monthShortName } from "@/lib/date";

export function AnnualReportPage() {
  const fmt = useFormat();
  const settings = useSettings();
  const allTransactions = useTransactions();
  const uiYear = useUIStore((s) => s.selectedYear);

  const [year, setYear] = useState(uiYear || currentYear());

  const summary = useMemo(() => {
    return summarizeYear(allTransactions, year, {
      countContributionsAsExpenses: settings.countContributionsAsExpenses,
    });
  }, [allTransactions, year, settings.countContributionsAsExpenses]);

  // Formatted chart data for the 12 months
  const monthlyChartData = useMemo(() => {
    return summary.months.map((m) => {
      const monthNum = parseInt(m.month.slice(5, 7), 10);
      return {
        name: monthShortName(monthNum),
        monthKey: m.month,
        Income: m.income,
        Expenses: m.expenses,
        NetSavings: m.netSavings,
      };
    });
  }, [summary.months]);

  // Spending extremes
  const activeExpenseMonths = summary.months.filter((m) => m.transactionCount > 0 && m.expenses > 0);
  const highestSpending = activeExpenseMonths.length > 0
    ? [...activeExpenseMonths].sort((a, b) => b.expenses - a.expenses)[0]
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Annual Financial Report (${year})`}
        description="Comprehensive review of annual cashflow, monthly trends, and long-term savings performance."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" onClick={() => setYear(year - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-16 text-center font-semibold text-sm tabular-nums">{year}</span>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setYear(year + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Income"
          value={fmt.money(summary.income)}
          subtitle={`Across ${summary.activeMonths} active months`}
          tone="positive"
          icon={ArrowUpRight}
        />
        <StatCard
          title="Total Expenses"
          value={fmt.money(summary.expenses)}
          subtitle={highestSpending ? `Peak: ${monthShortName(parseInt(highestSpending.month.slice(5, 7), 10))} (${fmt.money(highestSpending.expenses)})` : undefined}
          tone="negative"
          icon={ArrowDownRight}
        />
        <StatCard
          title="Annual Net Savings"
          value={fmt.money(summary.netSavings)}
          subtitle={summary.netSavings >= 0 ? "Surplus retained" : "Net deficit"}
          tone={summary.netSavings >= 0 ? "positive" : "destructive"}
          icon={Wallet}
        />
        <StatCard
          title="Annual Savings Rate"
          value={fmt.percent(summary.savingsRate)}
          subtitle={summary.savingsRate >= 20 ? "Exceeds 20% target" : "Below target"}
          tone="accent"
          icon={summary.savingsRate >= 20 ? TrendingUp : TrendingDown}
        />
      </div>

      {summary.activeMonths === 0 ? (
        <EmptyState
          title={`No records for ${year}`}
          description={`You don't have any financial entries recorded in ${year}.`}
          action={
            <Button size="sm" asChild>
              <Link to="/transactions">Record Transactions</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Income vs Expenses Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Income vs. Expenses</CardTitle>
                <CardDescription>Monthly comparison across {year}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} tickFormatter={(value: number) => fmt.moneyCompact(value)} />
                      <Tooltip
                        formatter={(val: any) => [fmt.money(Number(val) || 0)]}
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          borderColor: "var(--color-border)",
                          borderRadius: "8px",
                          color: "var(--color-foreground)",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Net Savings Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Net Savings Trend</CardTitle>
                <CardDescription>Surplus or deficit retained month by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} tickFormatter={(value: number) => fmt.moneyCompact(value)} />
                      <Tooltip
                        formatter={(val: any) => [fmt.money(Number(val) || 0), "Net Savings"]}
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          borderColor: "var(--color-border)",
                          borderRadius: "8px",
                          color: "var(--color-foreground)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="NetSavings"
                        name="Net Savings"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#6366f1" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Month-by-Month Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Full Year Breakdown</CardTitle>
              <CardDescription>Monthly totals and savings rates throughout {year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-3 font-medium">Month</th>
                      <th className="pb-3 font-medium text-right">Income</th>
                      <th className="pb-3 font-medium text-right">Expenses</th>
                      <th className="pb-3 font-medium text-right">Net Savings</th>
                      <th className="pb-3 font-medium text-right">Savings Rate</th>
                      <th className="pb-3 font-medium text-right">Entries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.months.map((m) => {
                      const monthNum = parseInt(m.month.slice(5, 7), 10);
                      const isSurplus = m.netSavings >= 0;
                      return (
                        <tr key={m.month} className="hover:bg-muted/30">
                          <td className="py-3 font-medium text-foreground">
                            {monthShortName(monthNum)} {year}
                          </td>
                          <td className="py-3 text-right tabular-nums text-success">
                            {m.income > 0 ? `+${fmt.money(m.income)}` : "—"}
                          </td>
                          <td className="py-3 text-right tabular-nums text-foreground">
                            {m.expenses > 0 ? fmt.money(m.expenses) : "—"}
                          </td>
                          <td
                            className={`py-3 text-right tabular-nums font-medium ${
                              isSurplus ? "text-foreground" : "text-destructive"
                            }`}
                          >
                            {m.transactionCount > 0 ? fmt.money(m.netSavings) : "—"}
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {m.income > 0 ? fmt.percent(m.savingsRate) : "—"}
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {m.transactionCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
