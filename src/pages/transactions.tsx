import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownWideNarrow, Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/stat-card";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionRow } from "@/components/transactions/transaction-row";
import {
  EMPTY_FILTERS,
  TransactionFilterBar,
  type TransactionFilters,
} from "@/components/transactions/transaction-filters";
import { summarize } from "@/domain/calculations";
import type { Transaction } from "@/domain/types";
import { transactionsRepo } from "@/data/repositories";
import { useCategories, usePaymentMethods, useSettings, useTransactions } from "@/state/hooks";
import { useFormat } from "@/state/format";
import { useUIStore } from "@/state/ui";
import { monthLabel } from "@/lib/date";

type SortKey = "date" | "amount";

const PAGE_SIZE = 25;

export function TransactionsPage() {
  const fmt = useFormat();
  const settings = useSettings();
  const month = useUIStore((s) => s.selectedMonth);
  const transactions = useTransactions();
  const categories = useCategories();
  const paymentMethods = usePaymentMethods();

  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [scopeToMonth, setScopeToMonth] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const methodById = useMemo(() => new Map(paymentMethods.map((p) => [p.id, p])), [paymentMethods]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const result = transactions.filter((tx) => {
      if (scopeToMonth && !filters.from && !filters.to && !tx.date.startsWith(`${month}-`)) return false;
      if (filters.from && tx.date < filters.from) return false;
      if (filters.to && tx.date > filters.to) return false;
      if (filters.categoryId !== "all" && tx.categoryId !== filters.categoryId) return false;
      if (filters.type !== "all" && tx.type !== filters.type) return false;
      if (filters.paymentMethodId !== "all" && tx.paymentMethodId !== filters.paymentMethodId) return false;
      if (search && !tx.description.toLowerCase().includes(search) && !tx.tags.some((t) => t.toLowerCase().includes(search)))
        return false;
      return true;
    });

    result.sort((a, b) => {
      const factor = sortDir === "asc" ? 1 : -1;
      if (sortKey === "amount") return (a.amount - b.amount) * factor;
      if (a.date === b.date) return a.createdAt.localeCompare(b.createdAt) * factor;
      return a.date.localeCompare(b.date) * factor;
    });

    return result;
  }, [transactions, filters, scopeToMonth, month, sortKey, sortDir]);

  const totals = useMemo(
    () => summarize(filtered, { countContributionsAsExpenses: settings.countContributionsAsExpenses }),
    [filtered, settings.countContributionsAsExpenses],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const update = (next: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await transactionsRepo.remove(pendingDelete.id);
      toast.success("Transaction deleted");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete the transaction.");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transactions"
        description="Every income, expense, saving and transfer you have recorded."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus />
            Add transaction
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Income" value={fmt.money(totals.income)} tone="positive" />
        <StatCard label="Expenses" value={fmt.money(totals.expenses)} tone="negative" />
        <StatCard label="Net savings" value={fmt.money(totals.netSavings)} tone={totals.netSavings >= 0 ? "positive" : "negative"} />
        <StatCard label="Entries" value={String(totals.transactionCount)} hint={scopeToMonth ? monthLabel(month, { short: true }) : "All time"} />
      </div>

      <Card className="space-y-4 p-4">
        <TransactionFilterBar
          filters={filters}
          onChange={update}
          onReset={reset}
          categories={categories}
          paymentMethods={paymentMethods}
          mobileOpen={mobileFiltersOpen}
          onMobileOpenChange={setMobileFiltersOpen}
          resultCount={filtered.length}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button
            variant={scopeToMonth ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setScopeToMonth((v) => !v);
              setPage(1);
            }}
            aria-pressed={scopeToMonth}
          >
            {scopeToMonth ? `Showing ${monthLabel(month, { short: true })}` : "Showing all time"}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-9 w-32" aria-label="Sort by">
                <ArrowDownWideNarrow className="size-4 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label={`Sort direction: ${sortDir === "asc" ? "ascending" : "descending"}`}
            >
              {sortDir === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title={transactions.length === 0 ? "No transactions yet" : "Nothing matches these filters"}
            description={
              transactions.length === 0
                ? "Add your first transaction and it will appear here immediately."
                : "Try clearing the filters or widening the date range."
            }
            action={
              transactions.length === 0 ? (
                <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                  <Plus />
                  Add transaction
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={reset}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {paged.map((tx) => (
                <li key={tx.id}>
                  <TransactionRow
                    transaction={tx}
                    category={categoryById.get(tx.categoryId)}
                    paymentMethod={methodById.get(tx.paymentMethodId)}
                    onEdit={(t) => {
                      setEditing(t);
                      setDialogOpen(true);
                    }}
                    onDelete={setPendingDelete}
                  />
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {pageCount} · {filtered.length} entries
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        Savings and investment contributions are tracked separately and never counted as consumption expenses.
      </p>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this transaction?"
        description={
          pendingDelete
            ? `“${pendingDelete.description}” for ${fmt.money(pendingDelete.amount)} on ${fmt.date(pendingDelete.date)} will be removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
