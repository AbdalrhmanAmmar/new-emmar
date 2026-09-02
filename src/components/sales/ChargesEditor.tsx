import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import type { InvoiceCharge } from "@/lib/mockDb";

const PRESETS = ["تحميل", "نقل", "شكارة", "خدمات أخرى"];

interface Props {
  charges: InvoiceCharge[];
  onChange: (charges: InvoiceCharge[]) => void;
  /** نسخة مضغوطة للاستخدام فى الملخص الجانبى / الكاشير */
  compact?: boolean;
}

/** إضافة بنود إضافية على الفاتورة (تحميل / نقل ...) تُضاف على الإجمالى */
export function ChargesEditor({ charges, onChange, compact }: Props) {
  const add = (label = "") =>
    onChange([...charges, { id: crypto.randomUUID(), label, amount: 0 }]);
  const patch = (id: string, p: Partial<InvoiceCharge>) =>
    onChange(charges.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const remove = (id: string) => onChange(charges.filter((c) => c.id !== id));

  const total = charges.reduce((a, c) => a + Number(c.amount || 0), 0);

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between">
        <span className={compact ? "text-xs font-semibold text-foreground" : "text-sm font-semibold text-foreground"}>
          بنود إضافية
        </span>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => add()}>
          <Plus className="size-3.5" /> بند
        </Button>
      </div>

      {charges.length === 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => add(p)}
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              + {p}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {charges.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <Input
                dir="rtl"
                value={c.label}
                onChange={(e) => patch(c.id, { label: e.target.value })}
                placeholder="اسم البند (مثال: تحميل)"
                className="h-8 min-w-0 flex-1 text-xs"
                list="charge-presets"
              />
              <Input
                type="number"
                value={c.amount}
                onChange={(e) => patch(c.id, { amount: Number(e.target.value || 0) })}
                className="h-8 w-24 shrink-0 text-center text-xs"
              />
              <button type="button" onClick={() => remove(c.id)} className="shrink-0 text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالى البنود الإضافية</span>
            <span className="font-semibold text-foreground">{money(total)}</span>
          </div>
        </div>
      )}

      <datalist id="charge-presets">
        {PRESETS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
}
