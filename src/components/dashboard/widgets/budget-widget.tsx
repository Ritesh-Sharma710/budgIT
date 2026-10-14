import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "../widget-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFormat } from "@/state/format";
import { monthLabel } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "./metric-widgets";

function statusTone(status: string): { variant: "success" | "warning" | "destructive" | "outline"; bar: string } {
  switch (status) {
    case "exceeded":
      return { variant: "destructive", bar: "bg-destructive" };
    case "critical":
      return { variant: "warning", bar: "bg-warning" };
    case "warning":
      return { variant: "warning", bar: "bg-warning" };
    default:
      return { variant: "success", bar: "bg-success" };
  }
}

export function BudgetProgressWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const { budgetEvaluation, month } = data;
  const withBudget = budgetEvaluation.lines.filter((line) => line.budgeted > 0).slice(0, 6);
  const exceeding = budgetEvaluation.lines.filter((line) => line.status === "exceeded").length;

  return (
    <WidgetCard
      title="Budget progress"
      description={monthLabel(month)}
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/budgets">Manage</Link>
        </Button>
      }
    >
      {withBudget.length === 0 ? (
        <WidgetEmpty
          title="No budgets set"
          description="Set category limits to see how this month is tracking."
          action={
            <Button size="sm" asChild>
              <Link to="/budgets">Set a budget</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3.5">
          {budgetEvaluation.overallUtilization !== null ? (
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall</span>
                <span className="tabular-nums text-muted-foreground">
                  {fmt.money(budgetEvaluation.totalSpent)} / {fmt.money(budgetEvaluation.overallRemaining === null ? 0 : budgetEvaluation.totalSpent + budgetEvaluation.overallRemaining)}
                </span>
              </div>
              <Progress
                value={Math.min(budgetEvaluation.overallUtilization, 100)}
                className="mt-2 h-2"
                indicatorClassName={cn(budgetEvaluation.overallUtilization >= 100 ? "bg-destructive" : budgetEvaluation.overallUtilization >= 90 ? "bg-warning" : "bg-primary")}
              />
            </div>
          ) : null}

          <ul className="space-y-3">
            {withBudget.map((line) => {
              const tone = statusTone(line.status);
              return (
                <li key={line.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{line.categoryName}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {fmt.money(line.spent)} / {fmt.money(line.budgeted)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(line.utilization, 100)} className="h-1.5 flex-1" indicatorClassName={tone.bar} />
                    <Badge variant={tone.variant} className="shrink-0 tabular-nums">
                      {line.utilization === Infinity ? "—" : fmt.percent(line.utilization, 0)}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>

          {exceeding > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="size-3.5" />
              {exceeding} categor{exceeding === 1 ? "y is" : "ies are"} over budget this month.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="size-3.5" />
              All tracked categories are within budget.
            </p>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
