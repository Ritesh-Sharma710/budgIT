import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

export type ProgressTone = "default" | "success" | "warning" | "destructive";

const toneStyles: Record<ProgressTone, string> = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    /** Convenience colour token; `indicatorClassName` still wins when both are set. */
    tone?: ProgressTone;
    indicatorClassName?: string;
  }
>(({ className, value, tone = "default", indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    value={value}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 rounded-full transition-all", toneStyles[tone], indicatorClassName)}
      style={{ transform: `translateX(-${100 - Math.min(Math.max(value ?? 0, 0), 100)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";

export const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className,
    )}
    {...props}
  />
));
Separator.displayName = "Separator";
