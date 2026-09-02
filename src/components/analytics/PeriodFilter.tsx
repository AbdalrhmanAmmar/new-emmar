import { CalendarRange } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateFmt } from "@/lib/format";
import type { DbShape } from "@/lib/mockDb";
import { cn } from "@/lib/utils";

export type PeriodKey = "month" | "quarter" | "half" | "year" | "all" | "custom";

export interface PeriodRange {
  key: PeriodKey;
  from: string;
  to: string;
}

const iso = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  month: "شهري",
  quarter: "ربع سنوي",
  half: "نصف سنوي",
  year: "سنوي",
  all: "كل الفترات",
  custom: "بين تاريخين",
};

/** يحسب المدى الزمنى لكل نوع فترة (مرتكزًا على تاريخ اليوم) */
export function rangeOf(key: Exclude<PeriodKey, "custom">): { from: string; to: string } {
  const now = new Date();
  const to = iso(now);
  if (key === "all") return { from: "1900-01-01", to: "2999-12-31" };
  const from = new Date(now);
  if (key === "month") from.setMonth(from.getMonth() - 1);
  if (key === "quarter") from.setMonth(from.getMonth() - 3);
  if (key === "half") from.setMonth(from.getMonth() - 6);
  if (key === "year") from.setFullYear(from.getFullYear() - 1);
  return { from: iso(from), to };
}

/** حالة الفترة المختارة محفوظة لكل شاشة على حدة */
export function usePeriod(storageKey = "period:default", initial: PeriodKey = "quarter") {
  const [range, setRange] = useState<PeriodRange>(() => ({ key: initial, ...rangeOf(initial) }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`aliman_${storageKey}`);
      if (!raw) return;
      const saved = JSON.parse(raw) as PeriodRange;
      if (!saved?.key) return;
      setRange(saved.key === "custom" ? saved : { key: saved.key, ...rangeOf(saved.key) });
    } catch {
      /* تجاهل */
    }
  }, [storageKey]);

  const update = (next: PeriodRange) => {
    setRange(next);
    try {
      localStorage.setItem(`aliman_${storageKey}`, JSON.stringify(next));
    } catch {
      /* تجاهل */
    }
  };

  return [range, update] as const;
}

const KEYS: PeriodKey[] = ["month", "quarter", "half", "year", "all", "custom"];

export function PeriodFilter({
  value,
  onChange,
  className,
}: {
  value: PeriodRange;
  onChange: (next: PeriodRange) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
        <CalendarRange className="mx-1 size-4 text-muted-foreground" />
        {KEYS.map((key) => {
          const active = value.key === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                onChange(key === "custom" ? { key, from: value.from, to: value.to } : { key, ...rangeOf(key) })
              }
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {PERIOD_LABEL[key]}
            </button>
          );
        })}
      </div>

      {value.key === "custom" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, key: "custom", from: e.target.value })}
            className="h-8 w-[9.5rem] text-xs"
          />
          <span className="text-xs text-muted-foreground">إلى</span>
          <Input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, key: "custom", to: e.target.value })}
            className="h-8 w-[9.5rem] text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onChange({ key: "quarter", ...rangeOf("quarter") })}
          >
            إعادة ضبط
          </Button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          {value.key === "all" ? "كل البيانات المسجلة" : `${dateFmt(value.from)} — ${dateFmt(value.to)}`}
        </span>
      )}
    </div>
  );
}

/** وصف نصى للفترة يُستخدم فى العناوين والتقارير */
export function periodText(range: PeriodRange): string {
  if (range.key === "all") return "كل الفترات";
  return `${PERIOD_LABEL[range.key]}: ${dateFmt(range.from)} — ${dateFmt(range.to)}`;
}

function inRange(date: string | undefined | null, from: string, to: string): boolean {
  if (!date) return false;
  const d = String(date).slice(0, 10);
  return d >= from && d <= to;
}

/** ينشئ نسخة من قاعدة البيانات محصورة بالفترة المختارة (البيانات الأساسية تبقى كاملة) */
export function filterDbByPeriod(data: DbShape, range: PeriodRange): DbShape {
  if (range.key === "all") return data;
  const { from, to } = range;
  const f = <T extends { date?: string }>(rows: T[]) => rows.filter((r) => inRange(r.date, from, to));
  return {
    ...data,
    vouchers: f(data.vouchers),
    transfers: f(data.transfers),
    invoices: f(data.invoices),
    stockMoves: f(data.stockMoves),
    salesInvoices: f(data.salesInvoices),
    purchaseInvoices: f(data.purchaseInvoices),
    returns: f(data.returns),
    expenses: f(data.expenses),
    attendance: f(data.attendance),
    shifts: data.shifts.filter((s) => inRange(s.openedAt, from, to)),
    adjustments: data.adjustments.filter((a) => {
      const m = String(a.month ?? "").slice(0, 7);
      return !!m && m >= from.slice(0, 7) && m <= to.slice(0, 7);
    }),
  };
}

/** هوك جاهز: يرجع الفترة + البيانات المفلترة */
export function usePeriodDb(data: DbShape, storageKey?: string, initial?: PeriodKey) {
  const [range, setRange] = usePeriod(storageKey, initial);
  const scoped = useMemo(() => filterDbByPeriod(data, range), [data, range]);
  return { range, setRange, scoped };
}
