import { MoreHorizontal, Pencil, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TRANSACTION_TYPE_META } from "@/domain/constants";
import type { Category, PaymentMethod, Transaction } from "@/domain/types";
import { useFormat } from "@/state/format";
import { cn } from "@/lib/utils";

export interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  paymentMethod?: PaymentMethod;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  className?: string;
}

export function TransactionRow({ transaction, category, paymentMethod, onEdit, onDelete, className }: TransactionRowProps) {
  const fmt = useFormat();
  const meta = TRANSACTION_TYPE_META[transaction.type];
  const isIncome = transaction.type === "income";
  const sign = isIncome ? "+" : transaction.type === "transfer" ? "" : "−";

  return (
    <div className={cn("flex items-center gap-3 py-2.5", className)}>
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold"
        style={{ backgroundColor: `${category?.color ?? "#64748b"}22`, color: category?.color ?? "#64748b" }}
        aria-hidden
      >
        {category?.name?.slice(0, 2).toUpperCase() ?? "??"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{transaction.description}</p>
          {transaction.recurringId ? (
            <Repeat className="size-3 shrink-0 text-muted-foreground" aria-label="Recurring" />
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {fmt.dateShort(transaction.date)}
          {" · "}
          {category?.name ?? "Uncategorised"}
          {paymentMethod ? ` · ${paymentMethod.name}` : ""}
          {meta.shortLabel !== "Expense" && meta.shortLabel !== "Income" ? ` · ${meta.shortLabel}` : ""}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isIncome && "text-success",
            !isIncome && transaction.type !== "transfer" && "text-foreground",
            transaction.type === "transfer" && "text-muted-foreground",
          )}
        >
          {sign}
          {fmt.money(transaction.amount)}
        </p>
      </div>

      {onEdit || onDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${transaction.description}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit ? (
              <DropdownMenuItem onSelect={() => onEdit(transaction)}>
                <Pencil />
                Edit
              </DropdownMenuItem>
            ) : null}
            {onEdit && onDelete ? <DropdownMenuSeparator /> : null}
            {onDelete ? (
              <DropdownMenuItem
                onSelect={() => onDelete(transaction)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
