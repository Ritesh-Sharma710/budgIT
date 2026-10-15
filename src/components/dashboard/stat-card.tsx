import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "positive" | "negative" | "destructive" | "warning" | "accent";

export interface StatCardProps {
  /** Metric name, e.g. "Net savings". */
  title: string;
  /** Pre-formatted value — formatting happens at the call site via `useFormat`. */
  value: string;
  icon?: LucideIcon;
  /** Secondary line under the value (context, totals, qualifiers). */
  subtitle?: string;
  /** Percentage change vs the previous period, or null when not comparable. */
  change?: number | null;
  changeLabel?: string;
  /** Set when an increase is a bad thing (e.g. expenses). */
  invertChange?: boolean;
  tone?: StatTone;
  loading?: boolean;
}

const toneStyles: Record<StatTone, string> = {
  default: "text-foreground",
  positive: "text-success",
  negative: "text-destructive",
  destructive: "text-destructive",
  warning: "text-warning-foreground dark:text-warning",
  accent: "text-primary",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  change,
  changeLabel,
  invertChange,
  tone = "default",
  loading,
}: StatCardProps) {
  const hasChange = change !== null && change !== undefined && Number.isFinite(change);
  const positive = hasChange && (invertChange ? change! < 0 : change! > 0);
  const negative = hasChange && (invertChange ? change! > 0 : change! < 0);

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-32" />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
      </div>
      <p className={cn("mt-2 text-xl font-semibold tabular-nums sm:text-2xl", toneStyles[tone])}>{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        {hasChange ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              positive && "text-success",
              negative && "text-destructive",
              !positive && !negative && "text-muted-foreground",
            )}
          >
            {change! > 0 ? (
              <ArrowUpRight className="size-3.5" />
            ) : change! < 0 ? (
              <ArrowDownRight className="size-3.5" />
            ) : (
              <Minus className="size-3.5" />
            )}
            {Math.abs(change!).toFixed(1)}%
          </span>
        ) : null}
        {changeLabel ? <span className="text-muted-foreground">{changeLabel}</span> : null}
        {subtitle ? <span className="text-muted-foreground">{subtitle}</span> : null}
      </div>
    </Card>
  );
}
