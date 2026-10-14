import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MONTH_ABBR, addMonths, currentMonthKey, monthLabel, monthKeyOf, parseMonthKey } from "@/lib/date";
import { useUIStore } from "@/state/ui";

/**
 * Month navigation shared by every page. Changing the month here updates all
 * monthly metrics, charts and lists through the Zustand store.
 */
export function MonthSelector({ className }: { className?: string }) {
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const setMonth = useUIStore((s) => s.setMonth);
  const shiftMonth = useUIStore((s) => s.shiftMonth);
  const goToCurrentMonth = useUIStore((s) => s.goToCurrentMonth);
  const [open, setOpen] = useState(false);

  const { year } = parseMonthKey(selectedMonth);
  const [pickerYear, setPickerYear] = useState(year);
  const isCurrent = selectedMonth === currentMonthKey();

  const openPicker = () => {
    setPickerYear(year);
    setOpen(true);
  };

  return (
    <div className={cn("flex items-center gap-1 rounded-lg border border-border bg-card p-1", className)}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous month"
        onClick={() => shiftMonth(-1)}
      >
        <ChevronLeft />
      </Button>
      <button
        type="button"
        onClick={openPicker}
        className="min-w-28 rounded-md px-2 py-1 text-sm font-medium tabular-nums hover:bg-accent sm:min-w-32"
        aria-label={`Selected month: ${monthLabel(selectedMonth)}. Change month`}
      >
        {monthLabel(selectedMonth, { short: true })}
      </button>
      <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => shiftMonth(1)}>
        <ChevronRight />
      </Button>
      {!isCurrent ? (
        <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="hidden sm:inline-flex">
          <CalendarDays />
          Today
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jump to month</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon-sm" aria-label="Previous year" onClick={() => setPickerYear((y) => y - 1)}>
                <ChevronLeft />
              </Button>
              <span className="text-base font-semibold tabular-nums">{pickerYear}</span>
              <Button variant="outline" size="icon-sm" aria-label="Next year" onClick={() => setPickerYear((y) => y + 1)}>
                <ChevronRight />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MONTH_ABBR.map((abbr, index) => {
                const key = monthKeyOf(pickerYear, index + 1);
                const active = key === selectedMonth;
                const future = key > currentMonthKey();
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMonth(key);
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent",
                      future && !active && "text-muted-foreground",
                    )}
                  >
                    {abbr}
                  </button>
                );
              })}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                goToCurrentMonth();
                setOpen(false);
              }}
            >
              Go to {monthLabel(addMonths(currentMonthKey(), 0), { short: true })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
