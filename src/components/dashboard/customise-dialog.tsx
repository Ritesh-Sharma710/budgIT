import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, LayoutGrid, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WIDGET_META } from "@/domain/constants";
import { settingsRepo } from "@/data/repositories";
import { useSettings } from "@/state/hooks";
import { defaultDashboardLayout } from "@/data/defaults";
import { registeredWidgetIds } from "./registry";
import type { DashboardWidgetPref, WidgetId } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface CustomiseDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomiseDashboardDialog({ open, onOpenChange }: CustomiseDashboardDialogProps) {
  const settings = useSettings();
  const [draft, setDraft] = useState<DashboardWidgetPref[]>(settings.dashboard);
  const [saving, setSaving] = useState(false);

  const available = new Set(registeredWidgetIds());
  const metaById = new Map(WIDGET_META.map((m) => [m.id, m]));

  const ordered = [...draft].sort((a, b) => a.order - b.order).filter((w) => available.has(w.id));

  const move = (index: number, delta: number) => {
    const next = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((w, i) => (w.order = i));
    // Keep widgets that are not shown here in the same relative order after the visible set.
    const hidden = draft.filter((w) => !ordered.some((o) => o.id === w.id));
    let offset = next.length;
    for (const w of hidden) w.order = offset++;
    setDraft([...next, ...hidden]);
  };

  const toggle = (id: WidgetId, visible: boolean) => {
    setDraft((prev) => prev.map((w) => (w.id === id ? { ...w, visible } : w)));
  };

  const reset = () => {
    setDraft(defaultDashboardLayout());
    toast.info("Layout reset to the default. Save to apply.");
  };

  const save = async () => {
    setSaving(true);
    try {
      await settingsRepo.patch({ dashboard: draft });
      toast.success("Dashboard updated");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Could not save your dashboard layout.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(settings.dashboard);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Customise dashboard</DialogTitle>
          <DialogDescription>
            Show, hide and reorder widgets. Your layout is saved with your settings.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-2">
          {ordered.map((widget, index) => {
            const meta = metaById.get(widget.id);
            if (!meta) return null;
            return (
              <div
                key={widget.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border p-2.5",
                  !widget.visible && "opacity-60",
                )}
              >
                <span className="text-muted-foreground">
                  {widget.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{meta.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${meta.title} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${meta.title} down`}
                    disabled={index === ordered.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Switch
                    checked={widget.visible}
                    onCheckedChange={(checked) => toggle(widget.id, checked)}
                    aria-label={`${widget.visible ? "Hide" : "Show"} ${meta.title}`}
                  />
                </div>
              </div>
            );
          })}
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={reset}>
            <RotateCcw />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              <LayoutGrid />
              Save layout
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
