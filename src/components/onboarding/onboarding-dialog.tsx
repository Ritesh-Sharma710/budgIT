import { useState } from "react";
import { toast } from "sonner";
import { HardDrive, Loader2, Sheet } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@/domain/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { budgetsRepo, settingsRepo } from "@/data/repositories";
import { normalizeBudget } from "@/domain/validation";
import { useSettings } from "@/state/hooks";
import { currentMonthKey, monthLabel } from "@/lib/date";
import { parseAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { StorageMode } from "@/domain/types";

/**
 * First-run setup: currency, approximate income, a starting budget and the
 * storage mode. Skippable — nothing is invented for the user, this only records
 * what they tell us and marks onboarding complete.
 */
export function OnboardingDialog() {
  const settings = useSettings();
  const open = !settings.onboardingCompleted;

  const [currency, setCurrency] = useState(settings.currency);
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState("");
  const [savingsTarget, setSavingsTarget] = useState("");
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [saving, setSaving] = useState(false);

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      const month = currentMonthKey();
      if (!skip) {
        const meta = CURRENCIES.find((c) => c.code === currency);
        await settingsRepo.patch({
          currency,
          locale: meta?.locale ?? settings.locale,
          approximateMonthlyIncome: income ? parseAmount(income) : null,
          storageMode,
        });

        const budgetValue = budget ? parseAmount(budget) : null;
        const savingsValue = savingsTarget ? parseAmount(savingsTarget) : null;
        if (budgetValue || savingsValue) {
          await budgetsRepo.upsert(
            normalizeBudget(month, { overallLimit: budgetValue, savingsTarget: savingsValue, notes: "Starting budget" }),
          );
        }
      }
      await settingsRepo.patch({ onboardingCompleted: true });
      toast.success(skip ? "You can set things up later in Settings." : "Setup complete. Welcome to budgIT!");
    } catch (error) {
      console.error(error);
      toast.error("Could not save your setup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to budgIT</DialogTitle>
          <DialogDescription>
            A quick setup so your dashboard starts from your real numbers. Nothing leaves this device.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="ob-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="ob-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Indian Rupee (₹) is the default and can be changed later.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ob-income">Approximate monthly income</Label>
              <Input
                id="ob-income"
                inputMode="decimal"
                placeholder="e.g. 100000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optional — used for guidance only.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-budget">Initial monthly budget</Label>
              <Input
                id="ob-budget"
                inputMode="decimal"
                placeholder="e.g. 50000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Applies to {monthLabel(currentMonthKey(), { short: true })}.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ob-savings">Monthly savings target</Label>
            <Input
              id="ob-savings"
              inputMode="decimal"
              placeholder="e.g. 20000"
              value={savingsTarget}
              onChange={(e) => setSavingsTarget(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Where should your data live?</legend>
            <div className="grid gap-2">
              {(
                [
                  {
                    value: "local" as StorageMode,
                    title: "This device (recommended)",
                    description: "IndexedDB in this browser. Private, offline-capable, never uploaded.",
                    icon: HardDrive,
                    disabled: false,
                  },
                  {
                    value: "google-sheets" as StorageMode,
                    title: "My Google Sheets",
                    description: "Coming soon — requires Google sign-in, which is not enabled yet.",
                    icon: Sheet,
                    disabled: true,
                  },
                ]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => setStorageMode(option.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    storageMode === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                    option.disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
                  )}
                >
                  <option.icon className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => void finish(true)} disabled={saving}>
            Skip for now
          </Button>
          <Button onClick={() => void finish(false)} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Get started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
