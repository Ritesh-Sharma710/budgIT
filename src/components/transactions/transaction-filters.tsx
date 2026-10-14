import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TRANSACTION_TYPE_META, TRANSACTION_TYPE_ORDER } from "@/domain/constants";
import type { Category, PaymentMethod, TransactionType } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface TransactionFilters {
  search: string;
  from: string;
  to: string;
  categoryId: string;
  type: TransactionType | "all";
  paymentMethodId: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  search: "",
  from: "",
  to: "",
  categoryId: "all",
  type: "all",
  paymentMethodId: "all",
};

export function countActiveFilters(filters: TransactionFilters): number {
  return [
    filters.from,
    filters.to,
    filters.categoryId !== "all" ? filters.categoryId : "",
    filters.type !== "all" ? filters.type : "",
    filters.paymentMethodId !== "all" ? filters.paymentMethodId : "",
  ].filter(Boolean).length;
}

interface FilterFieldsProps {
  filters: TransactionFilters;
  onChange: (next: Partial<TransactionFilters>) => void;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  idPrefix: string;
}

function FilterFields({ filters, onChange, categories, paymentMethods, idPrefix }: FilterFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-from`}>From date</Label>
        <Input id={`${idPrefix}-from`} type="date" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-to`}>To date</Label>
        <Input id={`${idPrefix}-to`} type="date" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-type`}>Type</Label>
        <Select value={filters.type} onValueChange={(v) => onChange({ type: v as TransactionFilters["type"] })}>
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TRANSACTION_TYPE_ORDER.map((type) => (
              <SelectItem key={type} value={type}>
                {TRANSACTION_TYPE_META[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <Select value={filters.categoryId} onValueChange={(v) => onChange({ categoryId: v })}>
          <SelectTrigger id={`${idPrefix}-category`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-method`}>Payment method</Label>
        <Select value={filters.paymentMethodId} onValueChange={(v) => onChange({ paymentMethodId: v })}>
          <SelectTrigger id={`${idPrefix}-method`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {paymentMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onChange: (next: Partial<TransactionFilters>) => void;
  onReset: () => void;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  resultCount: number;
}

export function TransactionFilterBar({
  filters,
  onChange,
  onReset,
  categories,
  paymentMethods,
  mobileOpen,
  onMobileOpenChange,
  resultCount,
}: TransactionFilterBarProps) {
  const active = countActiveFilters(filters);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search descriptions…"
            aria-label="Search transactions by description"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="default" className="lg:hidden" onClick={() => onMobileOpenChange(true)}>
            <Filter />
            Filters
            {active > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{active}</span>
            ) : null}
          </Button>
          {active > 0 ? (
            <Button variant="ghost" onClick={onReset}>
              <X />
              Clear
            </Button>
          ) : null}
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </span>
        </div>
      </div>

      <div className={cn("hidden gap-3 lg:grid lg:grid-cols-5")}>
        <FilterFields
          filters={filters}
          onChange={onChange}
          categories={categories}
          paymentMethods={paymentMethods}
          idPrefix="desktop"
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="bottom" aria-describedby={undefined} className="lg:hidden">
          <div className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">Filter transactions</SheetTitle>
          </div>
          <div className="space-y-4 overflow-y-auto p-4">
            <FilterFields
              filters={filters}
              onChange={onChange}
              categories={categories}
              paymentMethods={paymentMethods}
              idPrefix="mobile"
            />
          </div>
          <div className="flex gap-2 border-t border-border p-4">
            <Button variant="outline" className="flex-1" onClick={onReset}>
              Clear all
            </Button>
            <Button className="flex-1" onClick={() => onMobileOpenChange(false)}>
              Show {resultCount} results
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
