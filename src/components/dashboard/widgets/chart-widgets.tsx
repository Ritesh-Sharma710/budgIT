import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WidgetCard, WidgetEmpty } from "../widget-card";
import { AXIS_PROPS, CHART, GRID_PROPS, TOOLTIP_STYLE } from "../chart-theme";
import { useFormat } from "@/state/format";
import { monthLabel, monthShortName } from "@/lib/date";
import type { WidgetProps } from "./metric-widgets";

function hasAnyValue(points: { value: number }[]): boolean {
  return points.some((p) => Math.abs(p.value) > 0);
}

/** Recharts hands tooltip values back as `ValueType`; coerce for the formatters. */
function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

/* -------------------------------------------------------------------------- */
/* Income vs expenses                                                          */
/* -------------------------------------------------------------------------- */

export function IncomeVsExpenseWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { yearSeries, previousSummary, summary, comparison, year } = data;

  const chartData = yearSeries.map((m) => ({
    name: monthShortName(Number(m.month.slice(5, 7))),
    Income: m.income,
    Expenses: m.expenses,
  }));

  return (
    <WidgetCard
      title="Income vs expenses"
      description={`Monthly comparison across ${year}`}
      action={
        comparison.expenseChange === null ? undefined : (
          <span className="text-xs tabular-nums text-muted-foreground">
            {comparison.expenseChange >= 0 ? "+" : ""}
            {comparison.expenseChange.toFixed(1)}% vs prev
          </span>
        )
      }
    >
      {!hasAnyValue(yearSeries.map((m) => ({ value: m.income + m.expenses }))) ? (
        <WidgetEmpty title={`No activity in ${year}`} description="Income and expenses will chart here." />
      ) : (
        <>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="name" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} tickFormatter={(value: number) => fmt.moneyCompact(value)} width={56} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [fmt.money(toNumber(value)), name]}
                />
                <Bar dataKey="Income" fill={CHART.income} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill={CHART.expense} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              This month: <span className="font-medium text-success">{fmt.money(summary.income)}</span> in ·{" "}
              <span className="font-medium text-destructive">{fmt.money(summary.expenses)}</span> out
            </span>
            <span>Last month: {fmt.money(previousSummary.expenses)} spent</span>
          </p>
        </>
      )}
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Category breakdown                                                          */
/* -------------------------------------------------------------------------- */

export function CategoryBreakdownWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { categoryBreakdown, month } = data;
  const top = categoryBreakdown.slice(0, 8);
  const rest = categoryBreakdown.slice(8);
  const restTotal = rest.reduce((acc, row) => acc + row.total, 0);

  const pieData = [
    ...top.map((row) => ({ name: row.name, value: row.total, color: row.color })),
    ...(restTotal > 0 ? [{ name: "Other", value: restTotal, color: "var(--color-muted-foreground)" }] : []),
  ];

  return (
    <WidgetCard title="Expense distribution" description={monthLabel(month)}>
      {pieData.length === 0 ? (
        <WidgetEmpty title="No expenses yet" description="Your spending split by category will appear here." />
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => fmt.money(toNumber(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full space-y-1.5">
            {pieData.map((entry) => (
              <li key={entry.name} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{fmt.money(entry.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Daily spending                                                              */
/* -------------------------------------------------------------------------- */

export function DailySpendingWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { daily, month } = data;

  return (
    <WidgetCard title="Daily spending" description={`Day-by-day spend for ${monthLabel(month)}`}>
      {!hasAnyValue(daily.map((d) => ({ value: d.amount }))) ? (
        <WidgetEmpty title="No spending recorded" description="Daily bars and the running total will show here." />
      ) : (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="day" {...AXIS_PROPS} interval={4} />
              <YAxis {...AXIS_PROPS} tickFormatter={(value: number) => fmt.moneyCompact(value)} width={56} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) => `Day ${label}`}
                formatter={(value, name) => [fmt.money(toNumber(value)), name === "cumulative" ? "Running total" : "Spent"]}
              />
              <Bar dataKey="amount" fill={CHART.primary} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="cumulative" stroke={CHART.savings} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Annual savings trend                                                        */
/* -------------------------------------------------------------------------- */

export function AnnualSavingsTrendWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { yearSeries, year } = data;

  let running = 0;
  const chartData = yearSeries.map((m) => {
    running += m.netSavings;
    return {
      name: monthShortName(Number(m.month.slice(5, 7))),
      Net: m.netSavings,
      Cumulative: running,
    };
  });

  return (
    <WidgetCard title="Annual savings trend" description={`Savings across ${year}`}>
      {!hasAnyValue(chartData.map((d) => ({ value: d.Net }))) ? (
        <WidgetEmpty title={`No savings activity in ${year}`} description="Monthly net savings will chart here." />
      ) : (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={(value: number) => fmt.moneyCompact(value)} width={56} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) => [fmt.money(toNumber(value)), name === "Cumulative" ? "Running total" : "Net savings"]}
              />
              <ReferenceLine y={0} stroke={CHART.grid} />
              <Bar dataKey="Net" fill={CHART.savings} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="Cumulative" stroke={CHART.investment} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Savings rate                                                                */
/* -------------------------------------------------------------------------- */

export function SavingsRateWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { yearSeries, year, settings } = data;

  const chartData = yearSeries.map((m) => ({
    name: monthShortName(Number(m.month.slice(5, 7))),
    Rate: m.income > 0 ? Number(m.savingsRate.toFixed(1)) : null,
  }));

  return (
    <WidgetCard title="Savings rate" description={`Share of income saved each month in ${year}`}>
      {!hasAnyValue(yearSeries.map((m) => ({ value: m.income }))) ? (
        <WidgetEmpty title="No income recorded" description="Savings rate needs income to calculate." />
      ) : (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={(value: number) => `${value}%`} width={48} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [fmt.percent(toNumber(value)), "Savings rate"]}
              />
              <ReferenceLine y={20} stroke={CHART.income} strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="Rate"
                stroke={CHART.primary}
                fill={CHART.primary}
                fillOpacity={0.15}
                strokeWidth={2}
                connectNulls
              />
              <Bar dataKey="Rate" fill={CHART.primary} radius={[3, 3, 0, 0]} maxBarSize={18} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Dashed line marks the 20% guideline. {settings.currency} figures are estimates based on recorded income.
      </p>
    </WidgetCard>
  );
}
