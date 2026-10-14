import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TRANSACTION_TYPE_META, TRANSACTION_TYPE_ORDER } from "@/domain/constants";
import { TRANSACTION_TYPES, type Transaction, type TransactionType } from "@/domain/types";
import { normalizeTransactionInput, validateTransaction, type TransactionInput } from "@/domain/validation";
import { transactionsRepo, recurringRepo } from "@/data/repositories";
import { useCategories, usePaymentMethods } from "@/state/hooks";
import { todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing record to edit, or `null`/`undefined` to create. */
  transaction?: Transaction | null;
  /** Pre-fills the date for new transactions (defaults to today). */
  defaultDate?: string;
  defaultType?: TransactionType;
}

function emptyForm(date: string, type: TransactionType): TransactionInput {
  return {
    date,
    description: "",
    amount: "",
    type,
    categoryId: "",
    paymentMethodId: "pm_upi",
    notes: "",
    tags: [],
  };
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  defaultDate,
  defaultType = "expense",
}: TransactionDialogProps) {
  const categories = useCategories();
  const paymentMethods = usePaymentMethods();

  const [form, setForm] = useState<TransactionInput>(() => emptyForm(defaultDate ?? todayISO(), defaultType));
  const [tagsText, setTagsText] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the dialog opens so stale values never leak between edits.
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setForm({
        date: transaction.date,
        description: transaction.description,
        amount: String(transaction.amount),
        type: transaction.type,
        categoryId: transaction.categoryId,
        paymentMethodId: transaction.paymentMethodId,
        subcategoryId: transaction.subcategoryId ?? null,
        notes: transaction.notes ?? "",
        tags: transaction.tags,
      });
      setTagsText(transaction.tags.join(", "));
      setRecurring(Boolean(transaction.recurringId));
    } else {
      setForm(emptyForm(defaultDate ?? todayISO(), defaultType));
      setTagsText("");
      setRecurring(false);
    }
    setErrors({});
  }, [open, transaction, defaultDate, defaultType]);

  const categoryType = TRANSACTION_TYPE_META[form.type].categoryType;

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === categoryType),
    [categories, categoryType],
  );

  // Keep the category valid when the transaction type changes.
  useEffect(() => {
    if (!open) return;
    const stillValid = availableCategories.some((c) => c.id === form.categoryId);
    if (!stillValid) {
      setForm((prev) => ({ ...prev, categoryId: availableCategories[0]?.id ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCategories, open]);

  const activeMethods = paymentMethods.filter((p) => !p.archivedAt);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const input: TransactionInput = { ...form, tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean) };
    const result = validateTransaction(input);
    setErrors(result.errors);
    if (!result.ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      const normalized = normalizeTransactionInput(input, transaction ?? undefined);
      if (transaction) {
        await transactionsRepo.update(transaction.id, normalized);
        toast.success("Transaction updated");
      } else {
        await transactionsRepo.create({
          date: normalized.date,
          description: normalized.description,
          amount: normalized.amount,
          type: normalized.type,
          categoryId: normalized.categoryId,
          subcategoryId: normalized.subcategoryId,
          paymentMethodId: normalized.paymentMethodId,
          tags: normalized.tags,
          notes: normalized.notes,
          recurringId: normalized.recurringId,
          source: normalized.source,
        });

        if (recurring) {
          await recurringRepo.create({
            description: normalized.description,
            amount: normalized.amount,
            type: normalized.type,
            categoryId: normalized.categoryId,
            paymentMethodId: normalized.paymentMethodId,
            frequency: "monthly",
            anchor: Math.min(Number(normalized.date.slice(8, 10)) || 1, 28),
            startDate: normalized.date,
            endDate: null,
            lastRunMonth: normalized.date.slice(0, 7),
            active: true,
            notes: normalized.notes,
          });
        }
        toast.success("Transaction added");
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Could not save the transaction. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof TransactionInput>(key: K, value: TransactionInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            {transaction
              ? "Update the details below. Changes are saved to this device immediately."
              : "Record income, spending, savings or investments. Amounts are always positive."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Type</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TRANSACTION_TYPE_ORDER.map((type) => {
                  const meta = TRANSACTION_TYPE_META[type];
                  const active = form.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set("type", type)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        active ? "border-primary bg-primary/10 text-foreground" : "border-border hover:bg-accent",
                      )}
                    >
                      <span className="block font-medium">{meta.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                        {meta.shortLabel === "Transfer" ? "Not counted as spending" : meta.description.split(".")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.type ? <p className="mt-1 text-xs text-destructive">{errors.type}</p> : null}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tx-amount">Amount</Label>
                <Input
                  id="tx-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={String(form.amount)}
                  aria-invalid={Boolean(errors.amount)}
                  onChange={(e) => set("amount", e.target.value)}
                />
                {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-date">Date</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={form.date}
                  aria-invalid={Boolean(errors.date)}
                  onChange={(e) => set("date", e.target.value)}
                />
                {errors.date ? <p className="text-xs text-destructive">{errors.date}</p> : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-description">Description</Label>
              <Input
                id="tx-description"
                placeholder="e.g. Grocery run at the supermarket"
                value={form.description}
                aria-invalid={Boolean(errors.description)}
                onChange={(e) => set("description", e.target.value)}
              />
              {errors.description ? <p className="text-xs text-destructive">{errors.description}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tx-category">Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                  <SelectTrigger id="tx-category" aria-invalid={Boolean(errors.categoryId)}>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId ? <p className="text-xs text-destructive">{errors.categoryId}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-method">Payment method</Label>
                <Select value={form.paymentMethodId} onValueChange={(v) => set("paymentMethodId", v)}>
                  <SelectTrigger id="tx-method">
                    <SelectValue placeholder="Choose a method" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-tags">Tags</Label>
              <Input
                id="tx-tags"
                placeholder="Comma separated, e.g. essential, reimbursable"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-notes">Notes</Label>
              <Textarea
                id="tx-notes"
                placeholder="Optional context for this entry"
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            {!transaction ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="tx-recurring">Repeat monthly</Label>
                  <p className="text-xs text-muted-foreground">
                    Creates a recurring rule that generates this entry each month.
                  </p>
                </div>
                <Switch id="tx-recurring" checked={recurring} onCheckedChange={setRecurring} />
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {TRANSACTION_TYPES.includes(form.type)
                ? TRANSACTION_TYPE_META[form.type].description
                : ""}
            </p>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              {transaction ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
