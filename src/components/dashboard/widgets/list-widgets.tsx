import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Receipt, Tag, TrendingUp } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "../widget-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/progress";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import type { Transaction } from "@/domain/types";
import { useFormat } from "@/state/format";
import { monthLabel } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "./metric-widgets";

export function RecentTransactionsWidget({ data }: WidgetProps) {
  const { recentTransactions, categories, month } = data;
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <>
      <WidgetCard
        title="Recent transactions"
        description={monthLabel(month)}
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/transactions">View all</Link>
          </Button>
        }
        contentClassName="pt-0"
      >
        {recentTransactions.length === 0 ? (
          <WidgetEmpty
            title="No transactions yet"
            description="Add your first entry to see it appear here instantly."
            action={
              <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
                Add transaction
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {recentTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                category={categoryById.get(tx.categoryId)}
                onEdit={(t) => {
                  setEditing(t);
                  setOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </WidgetCard>

      <TransactionDialog open={open} onOpenChange={setOpen} transaction={editing} />
    </>
  );
}

export function TopCategoriesWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { categoryBreakdown, month } = data;
  const top = categoryBreakdown.slice(0, 6);

  return (
    <WidgetCard title="Top spending categories" description={monthLabel(month)}>
      {top.length === 0 ? (
        <WidgetEmpty title="No spending this month" description="Expenses will be ranked here by category." />
      ) : (
        <ul className="space-y-3">
          {top.map((row, index) => (
            <li key={row.categoryId} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="shrink-0 tabular-nums font-medium">{fmt.money(row.total)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={row.share} className="h-1.5 flex-1" indicatorClassName="bg-primary" />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {row.share.toFixed(0)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function UpcomingRecurringWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { recurringUpcoming } = data;

  return (
    <WidgetCard
      title="Upcoming recurring payments"
      description="Next scheduled entries"
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/settings">Manage</Link>
        </Button>
      }
    >
      {recurringUpcoming.length === 0 ? (
        <WidgetEmpty
          title="No recurring rules"
          description="Turn on “Repeat monthly” when adding a transaction to schedule it."
        />
      ) : (
        <ul className="divide-y divide-border">
          {recurringUpcoming.map(({ rule, due }) => (
            <li key={rule.id} className="flex items-center gap-3 py-2.5">
              <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{rule.description}</p>
                <p className="text-xs text-muted-foreground">Due {fmt.date(due, { day: "2-digit", month: "short" })}</p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">{fmt.money(rule.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function SavingsInsightsWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { insights, year } = data;

  return (
    <WidgetCard title={`${year} highlights`} description="Derived from your recorded transactions">
      <div className="space-y-3 text-sm">
        <Row icon={<TrendingUp className="size-4" />} label="Average monthly savings" value={fmt.money(insights.averageMonthlySavings)} />
        <Separator />
        <Row
          icon={<Receipt className="size-4" />}
          label="Highest spending month"
          value={insights.highestMonth ? `${monthLabel(insights.highestMonth.month, { short: true })} · ${fmt.money(insights.highestMonth.expenses)}` : "—"}
        />
        <Separator />
        <Row
          icon={<Tag className="size-4" />}
          label="Biggest category"
          value={insights.topCategories[0] ? `${insights.topCategories[0].name} · ${fmt.money(insights.topCategories[0].total)}` : "—"}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">Active months · {insights.summary.activeMonths}</Badge>
      </div>
    </WidgetCard>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <span className={cn("shrink-0 font-medium tabular-nums")}>{value}</span>
    </div>
  );
}
