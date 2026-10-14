import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomiseDashboardDialog } from "@/components/dashboard/customise-dialog";
import { WIDGET_REGISTRY } from "@/components/dashboard/registry";
import { WIDGET_META } from "@/domain/constants";
import { useDashboardData } from "@/state/dashboard-data";
import { useSettings } from "@/state/hooks";
import { useUIStore } from "@/state/ui";
import { monthLabel } from "@/lib/date";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const data = useDashboardData();
  const settings = useSettings();
  const month = useUIStore((s) => s.selectedMonth);
  const [customiseOpen, setCustomiseOpen] = useState(false);

  const metaById = new Map(WIDGET_META.map((m) => [m.id, m]));
  const visible = settings.dashboard
    .filter((pref) => pref.visible && WIDGET_REGISTRY[pref.id])
    .sort((a, b) => a.order - b.order);

  const hasAnyData = data.transactions.length > 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Everything below reflects your own records for ${monthLabel(month)}.`}
        actions={
          <Button variant="outline" size="sm" onClick={() => setCustomiseOpen(true)}>
            <SlidersHorizontal />
            Customise
          </Button>
        }
      />

      {!hasAnyData ? (
        <EmptyState
          className="mb-4"
          title="Your dashboard is ready"
          description="Every card and chart below is driven by your own records. Add a transaction to bring it to life, or load optional demo data from Data & settings."
        />
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title="No widgets visible"
          description="Every dashboard widget is hidden. Use Customise to bring some back."
          action={
            <Button size="sm" onClick={() => setCustomiseOpen(true)}>
              Customise dashboard
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {visible.map((pref) => {
            const definition = WIDGET_REGISTRY[pref.id];
            if (!definition) return null;
            const meta = metaById.get(pref.id);
            const Widget = definition.component;
            return (
              <section
                key={pref.id}
                aria-label={meta?.title ?? pref.id}
                className={cn(definition.spans[pref.size] ?? definition.spans.md)}
              >
                <Widget data={data} />
              </section>
            );
          })}
        </div>
      )}

      <CustomiseDashboardDialog open={customiseOpen} onOpenChange={setCustomiseOpen} />
    </div>
  );
}
