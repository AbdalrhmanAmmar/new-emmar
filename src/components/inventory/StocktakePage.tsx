import { useNavigate } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { money, num, today } from "@/lib/format";
import { warehouseBalance, warehouseOptions } from "@/lib/inventory";
import { postStocktake } from "@/lib/inventoryActions";
import { UNIT_LABEL, useDb } from "@/lib/mockDb";
import { useCurrentUser } from "@/lib/session";

export function StocktakePage() {
  const data = useDb();
  const navigate = useNavigate();
  const current = useCurrentUser();

  const [warehouseId, setWarehouseId] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [actual, setActual] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    if (!warehouseId) return [];
    const balances = warehouseBalance(data, warehouseId);
    const map = new Map(balances.map((r) => [r.productId, r]));
    const list = showAll
      ? data.products.map(
          (p) =>
            map.get(p.id) ?? {
              productId: p.id,
              code: p.code,
              name: p.name,
              unit: UNIT_LABEL[p.unit],
              qty: 0,
              cost: Number(p.cost || 0),
              value: 0,
              minStock: Number(p.minStock || 0),
            },
        )
      : balances;
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [data, warehouseId, showAll]);

  const diffOf = (productId: string, book: number) => {
    const raw = actual[productId];
    if (raw === undefined || raw === "") return null;
    return Number(raw) - book;
  };

  const counted = rows.filter((r) => diffOf(r.productId, r.qty) !== null);
  const diffRows = counted.filter((r) => Math.abs(diffOf(r.productId, r.qty) ?? 0) > 0.0001);
  const surplus = diffRows.reduce((s, r) => s + Math.max(diffOf(r.productId, r.qty) ?? 0, 0), 0);
  const shortage = diffRows.reduce((s, r) => s + Math.max(-(diffOf(r.productId, r.qty) ?? 0), 0), 0);
  const diffValue = diffRows.reduce((s, r) => s + (diffOf(r.productId, r.qty) ?? 0) * r.cost, 0);

  const submit = () => {
    const res = postStocktake({
      warehouseId,
      date,
      branchId: data.branches[0]?.id ?? "",
      userId: current?.user.id ?? data.users[0]?.id ?? "",
      note,
      rows: counted.map((r) => ({ productId: r.productId, book: r.qty, actual: Number(actual[r.productId] || 0) })),
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("تم ترحيل الجرد وتعديل الأرصدة الدفترية بالأرصدة الفعلية");
    navigate({ to: "/inventory/moves" });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="جرد المخازن"
        description="اختر المخزن ليظهر كل صنف برصيده الدفترى، أدخل الرصيد الفعلى والنظام يُسوّى الفرق تلقائياً"
      />

      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>المخزن</Label>
            <SearchSelect
              options={warehouseOptions(data, false)}
              value={warehouseId}
              onChange={(v) => {
                setWarehouseId(v ?? "");
                setActual({});
              }}
              placeholder="اختر المخزن للجرد"
            />
          </div>
          <div className="space-y-1.5">
            <Label>تاريخ الجرد</Label>
            <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>ملاحظات الجرد</Label>
            <Textarea rows={1} value={note} onChange={(e) => setNote(e.target.value)} placeholder="لجنة الجرد / سبب الفرق..." />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Switch id="showAll" checked={showAll} onCheckedChange={setShowAll} />
          <Label htmlFor="showAll" className="cursor-pointer text-sm text-muted-foreground">
            إظهار كل الأصناف (حتى بدون رصيد دفترى)
          </Label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="أصناف تم جردها" value={num(counted.length)} />
        <StatCard label="إجمالى الزيادة" value={num(surplus)} tone="accent" />
        <StatCard label="إجمالى النقص" value={num(shortage)} tone="danger" />
        <StatCard label="قيمة الفرق" value={money(diffValue)} />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2">كود الصنف</th>
              <th className="p-2">الصنف</th>
              <th className="p-2">الوحدة</th>
              <th className="p-2">الرصيد الدفترى</th>
              <th className="p-2">الرصيد الفعلى</th>
              <th className="p-2">الفرق</th>
              <th className="p-2">قيمة الفرق</th>
              <th className="p-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  اختر المخزن لعرض أصنافه وأرصدتها الدفترية
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const diff = diffOf(r.productId, r.qty);
                return (
                  <tr key={r.productId} className="border-t">
                    <td className="p-2 text-right">{r.code}</td>
                    <td className="p-2 text-right">{r.name}</td>
                    <td className="p-2 text-center">{r.unit}</td>
                    <td className="p-2 text-right">{num(r.qty)}</td>
                    <td className="p-2">
                      <Input
                        dir="ltr"
                        type="number"
                        step="0.01"
                        className="h-9 w-28 text-right"
                        value={actual[r.productId] ?? ""}
                        onChange={(e) => setActual((s) => ({ ...s, [r.productId]: e.target.value }))}
                        placeholder="—"
                      />
                    </td>
                    <td className="p-2 text-right font-semibold">{diff === null ? "-" : num(diff)}</td>
                    <td className="p-2 text-right">{diff === null ? "-" : money(diff * r.cost)}</td>
                    <td className="p-2 text-center">
                      {diff === null ? (
                        <StatusBadge label="لم يُجرد" tone="gray" />
                      ) : Math.abs(diff) < 0.0001 ? (
                        <StatusBadge label="مطابق" tone="green" />
                      ) : diff > 0 ? (
                        <StatusBadge label="زيادة" tone="blue" />
                      ) : (
                        <StatusBadge label="نقص" tone="red" />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setActual({})} disabled={counted.length === 0}>
          تفريغ الأرصدة الفعلية
        </Button>
        <Button className="gap-1.5" onClick={submit} disabled={diffRows.length === 0}>
          <ClipboardCheck className="size-4" />
          ترحيل الجرد وتسوية الفروق
        </Button>
      </div>
    </div>
  );
}
