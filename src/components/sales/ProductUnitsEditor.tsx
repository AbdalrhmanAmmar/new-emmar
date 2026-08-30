import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { num } from "@/lib/format";
import { UNIT_LABEL, uid, type ProductUnit, type Unit } from "@/lib/mockDb";

/** محرر وحدات الصنف ومعاملات التحويل — اشترِ بالطن وبِع بالكيلو أو الشيكارة */
export function ProductUnitsEditor({
  baseUnit,
  units,
  onChange,
}: {
  baseUnit: Unit;
  units: ProductUnit[];
  onChange: (units: ProductUnit[]) => void;
}) {
  const baseLabel = UNIT_LABEL[baseUnit] ?? baseUnit;

  const patch = (id: string, values: Partial<ProductUnit>) =>
    onChange(units.map((u) => (u.id === id ? { ...u, ...values } : u)));

  const add = () =>
    onChange([...units, { id: uid("pu"), code: "", name: "", factor: 1, price: 0, wholesalePrice: 0 }]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          الوحدة الأساسية للمخزون: <span className="font-semibold text-foreground">{baseLabel}</span> — أضف وحدات بيع
          أصغر أو أكبر ومعامل التحويل لكل منها، وسيقل الرصيد تلقائياً بالوحدة الأساسية عند البيع.
        </p>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={add}>
          <Plus className="size-4" />
          إضافة وحدة
        </Button>
      </div>

      <div className="table-scroll overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {["كود الوحدة", "اسم الوحدة", `معامل التحويل (بالـ ${baseLabel})`, "سعر البيع", "سعر الجملة", "المعادلة", ""].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-center font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border/60 bg-primary/5">
              <td className="px-3 py-2 text-center font-mono text-xs">{baseUnit}</td>
              <td className="px-3 py-2 text-center font-semibold">{baseLabel}</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-center text-xs text-muted-foreground">سعر البيع الأساسى</td>
              <td className="px-3 py-2 text-center text-xs text-muted-foreground">سعر الجملة الأساسى</td>
              <td className="px-3 py-2 text-center text-xs">الوحدة الأساسية للمخزون</td>
              <td />
            </tr>

            {units.length === 0 ? (
              <tr className="border-t border-border/60">
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  لا توجد وحدات تحويل — اضغط «إضافة وحدة» لتقدر تبيع بوحدات أخرى
                </td>
              </tr>
            ) : (
              units.map((u) => (
                <tr key={u.id} className="border-t border-border/60">
                  <td className="px-2 py-1.5">
                    <Input
                      dir="ltr"
                      className="h-9 text-center"
                      placeholder="kg"
                      value={u.code}
                      onChange={(e) => patch(u.id, { code: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      dir="rtl"
                      className="h-9"
                      placeholder="كيلو"
                      value={u.name}
                      onChange={(e) => patch(u.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      step="any"
                      className="h-9 text-center"
                      value={String(u.factor ?? "")}
                      onChange={(e) => patch(u.id, { factor: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      step="any"
                      className="h-9 text-center"
                      value={String(u.price ?? "")}
                      onChange={(e) => patch(u.id, { price: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      step="any"
                      className="h-9 text-center"
                      value={String(u.wholesalePrice ?? "")}
                      onChange={(e) => patch(u.id, { wholesalePrice: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {Number(u.factor) > 0
                      ? `1 ${u.name || u.code || "وحدة"} = ${num(Number(u.factor))} ${baseLabel}`
                      : "أدخل معامل تحويل أكبر من صفر"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => onChange(units.filter((x) => x.id !== u.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
