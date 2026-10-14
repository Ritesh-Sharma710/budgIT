import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "../widget-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { GoalProgress } from "@/domain/types";
import { useFormat } from "@/state/format";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "./metric-widgets";

const STATUS_META: Record<GoalProgress["status"], { label: string; variant: "success" | "warning" | "destructive" | "info" | "outline" }> = {
  "on-track": { label: "On track", variant: "success" },
  behind: { label: "Behind", variant: "warning" },
  completed: { label: "Completed", variant: "info" },
  overdue: { label: "Target date passed", variant: "destructive" },
  "no-target-date": { label: "No target date", variant: "outline" },
};

export function FinancialGoalsWidget({ data }: WidgetProps) {
  const fmt = useFormat();
  const goals = data.goalProgressList.slice(0, 3);

  return (
    <WidgetCard
      title="Financial goals"
      description="Progress towards your targets"
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/goals">Manage</Link>
        </Button>
      }
    >
      {goals.length === 0 ? (
        <WidgetEmpty
          title="No goals yet"
          description="Create an emergency fund, a travel fund or anything else you are saving for."
          action={
            <Button size="sm" asChild>
              <Link to="/goals">Create a goal</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {goals.map((progress) => {
            const meta = STATUS_META[progress.status];
            return (
              <li key={progress.goal.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Target className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{progress.goal.name}</span>
                  <Badge variant={meta.variant} className="shrink-0">
                    {meta.label}
                  </Badge>
                </div>
                <Progress value={progress.progress} className="h-2" indicatorClassName={cn(progress.progress >= 100 ? "bg-success" : "bg-primary")} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {fmt.money(progress.saved)} / {fmt.money(progress.goal.targetAmount)}
                  </span>
                  <span className="tabular-nums">
                    {progress.requiredMonthly !== null && progress.remaining > 0
                      ? `${fmt.money(progress.requiredMonthly)}/mo needed`
                      : `${progress.progress.toFixed(0)}%`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
