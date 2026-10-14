import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface WidgetCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function WidgetCard({ title, description, action, children, className, contentClassName }: WidgetCardProps) {
  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="truncate">{title}</CardTitle>
          {description ? <CardDescription className="truncate">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn("flex-1", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function WidgetEmpty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <EmptyState title={title} description={description} action={action} className="h-full" />;
}
