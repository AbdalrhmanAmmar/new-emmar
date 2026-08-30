import { Link } from "@tanstack/react-router";
import { Calculator, Plus, Ruler, Trash2, Wand2 } from "lucide-react";

import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uid, unitLabel, useDb, type ProductUnit, type Unit } from "@/lib/mockDb";

/** صياغة معامل التحويل بدون فقدان الكسور الصغيرة */
function factorText(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return Number(v.toFixed(6)).toLocaleString("en-GB", { maximumFractionDigits: 6 });
}

/** جاهزات سريعة: «الوحدة الأصغر جوه الوحدة الأساسية» */
const PRESETS: Record<string, Array<{ code: string; label: string; perBase: number }>> = {
  ton: [
    { code: "kg", label: "كيلو (1000 فى الطن)", perBase: 1000 },
    { code: "bag", label: "شيكارة 50 كجم (20 فى الطن)", perBase: 20 },
    { code: "bag", label: "شيكارة 25 كجم (40 فى الطن)", perBase: 40 },
    { code: "qnt", label: "قنطار 50 كجم (20 فى الطن)", perBase: 20 },
  ],
  bag: [{ code: "kg", label: "كيلو (50 فى الشيكارة)", perBase: 50 }],
  kg: [{ code: "gm", label: "جرام (1000 فى الكيلو)", perBase: 1000 }],
};

/**
 * محرر وحدات بيع الصنف — مبسّط:
 * المستخدم يختار الوحدة من الوحدات المكوّدة، ويكتب «كم وحدة فى الوحدة الأساسية»
 * والنظام يحسب معامل التحويل والسعر تلقائياً.
 */
export function ProductUnitsEditor({
  baseUnit,
  units,
  onChange,
  basePrice = 0,
  baseWholesale = 0,
}: {
  baseUnit: Unit;
  units: ProductUnit[];
  onChange: (units: ProductUnit[]) => void;
  /** سعر بيع الوحدة الأساسية — لحساب السعر المقترح تلقائياً */
  basePrice?: number;
  /** سعر جملة الوحدة الأساسية */
  baseWholesale?: number;
}) {
  const data = useDb();
  const baseLabel = unitLabel(baseUnit) || String(baseUnit);
  const coded = data.measureUnits.filter((u) => u.active && u.code !== baseUnit);
  const options = coded.map((u) => ({ value: u.code, label: u.name, hint: u.code }));

  const patch = (id: string, values: Partial<ProductUnit>) =>
    onChange(units.map((u) => (u.id === id ? { ...u, ...values } : u)));

  /** perBase = عدد وحدات البيع داخل الوحدة الأساسية (أسهل فى الفهم) */
  const addUnit = (code = "", perBase = 0) => {
    const factor = perBase > 0 ? 1 / perBase : 0;
    onChange([
      ...units,
      {
        id: uid("pu"),
        code,
        name: code ? unitLabel(code) : "",
        factor,
        price: factor > 0 ? Number((basePrice * factor).toFixed(2)) : 0,
        wholesalePrice: factor > 0 ? Number((baseWholesale * factor).toFixed(2)) : 0,
      },
    ]);
  };

  const setPerBase = (u: ProductUnit, perBaseRaw: string) => {
    const perBase = Number(perBaseRaw);
    const factor = perBase > 0 ? 1 / perBase : 0;
    patch(u.id, { factor });
  };

  const perBaseOf = (u: ProductUnit) => (Number(u.factor) > 0 ? 1 / Number(u.factor) : 0);

  const autoPrice = (u: ProductUnit) => {
    const factor = Number(u.factor);
    if (!(factor > 0)) return;
    patch(u.id, {
      price: Number((basePrice * factor).toFixed(2)),
      wholesalePrice: Number((baseWholesale * factor).toFixed(2)),
    });
  };

  const presets = PRESETS[String(baseUnit)] ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <p className="text-xs leading-6 text-muted-foreground">
          وحدة المخزون الأساسية:{" "}
          <span className="font-semibold text-foreground">{baseLabel}</span> — الرصيد يُحفظ بها دائماً. أضف وحدات بيع
          أصغر (زى الكيلو أو الشيكارة) واكتب فقط{" "}
          <span className="font-semibold text-foreground">عدد الوحدات داخل {baseLabel} واحد</span>، والنظام يحسب معامل
          التحويل والسعر المقترح ويخصم الرصيد تلقائياً بالوحدة الأساسية.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <Button
              key={`${p.code}-${p.perBase}-${p.label}`}
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => addUnit(p.code, p.perBase)}
            >
              <Wand2 className="size-3.5" />
              {p.label}
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => addUnit()}>
            <Plus className="size-4" />
            إضافة وحدة يدوياً
          </Button>
          <Button asChild type="button" size="sm" variant="ghost" className="gap-1.5">
            <Link to="/sales/units">
              <Ruler className="size-3.5" />
              تكويد وحدات جديدة
            </Link>
          </Button>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          البيع حالياً بالوحدة الأساسية ({baseLabel}) فقط — اختر جاهزة سريعة أعلاه أو أضف وحدة يدوياً.
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((u, index) => {
            const perBase = perBaseOf(u);
            const name = u.name?.trim() || unitLabel(u.code) || "الوحدة";
            return (
              <div key={u.id} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary">وحدة بيع #{index + 1}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive"
                    aria-label="حذف الوحدة"
                    onClick={() => onChange(units.filter((x) => x.id !== u.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">الوحدة</Label>
                    <SearchSelect
                      options={options}
                      value={u.code}
                      placeholder="اختر الوحدة"
                      onChange={(code) => patch(u.id, { code, name: unitLabel(code) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">كم {name} فى {baseLabel} واحد؟</Label>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      placeholder="1000"
                      value={perBase ? String(Number(perBase.toFixed(6))) : ""}
                      onChange={(e) => setPerBase(u, e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">سعر بيع {name}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={String(u.price ?? "")}
                      onChange={(e) => patch(u.id, { price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">سعر جملة {name}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={String(u.wholesalePrice ?? "")}
                      onChange={(e) => patch(u.id, { wholesalePrice: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-xs text-foreground">
                    {perBase > 0
                      ? `1 ${baseLabel} = ${factorText(perBase)} ${name}   •   1 ${name} = ${factorText(
                          Number(u.factor),
                        )} ${baseLabel}`
                      : "اكتب عدد الوحدات داخل الوحدة الأساسية لحساب معامل التحويل"}
                  </span>
                  <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => autoPrice(u)}>
                    <Calculator className="size-3.5" />
                    احسب السعر تلقائياً
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
