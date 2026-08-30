import { useNavigate } from "@tanstack/react-router";
import { Plus, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { money, num, today } from "@/lib/format";
import { emptyMoveLine, moveLineBaseQty, warehouseOptions } from "@/lib/inventory";
import { saveStockMove } from "@/lib/inventoryActions";
import { nextMoveNo } from "@/lib/inventoryActions";
import {
  MOVE_KIND_LABEL,
  UNIT_LABEL,
  uid,
  useDb,
  type DocStatus,
  type StockMove,
  type StockMoveKind,
  type StockMoveLine,
} from "@/lib/mockDb";
import { printStockMove } from "@/lib/printMove";
import { unitOptions, unitPatch } from "@/lib/units";

export function StockMoveForm({ moveId }: { moveId?: string }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = moveId ? data.stockMoves.find((m) => m.id === moveId) : undefined;

  const [kind, setKind] = useState<StockMoveKind>(existing?.kind ?? "in");
  const [date, setDate] = useState(existing?.date ?? today());
  const [warehouseId, setWarehouseId] = useState(existing?.warehouseId ?? data.warehouses[0]?.id ?? "");
  const [toWarehouseId, setToWarehouseId] = useState(existing?.toWarehouseId ?? "");
  const [branchId, setBranchId] = useState(existing?.branchId ?? data.branches[0]?.id ?? "");
  const [userId, setUserId] = useState(existing?.userId ?? data.users[0]?.id ?? "");
  const [partyName, setPartyName] = useState(existing?.partyName ?? "");
  const [refNo, setRefNo] = useState(existing?.refNo ?? "");
  const [refCode, setRefCode] = useState(existing?.refCode ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [lines, setLines] = useState<StockMoveLine[]>(existing?.lines ?? [emptyMoveLine(uid("ml"))]);

  const setLine = (id: string, patch: Partial<StockMoveLine>) =>
    setLines((rows) => rows.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const pickProduct = (id: string, productId: string) => {
    const product = data.products.find((p) => p.id === productId);
    if (!product) return;
    setLine(id, {
      productId,
      code: product.code,
      name: product.name,
      unit: product.unit,
      cost: Number(product.cost || 0),
      ...unitPatch(product, product.unit),
      price: undefined,
    } as Partial<StockMoveLine>);
  };

  const totalQty = lines.reduce((s, l) => s + moveLineBaseQty(l), 0);
  const totalValue = lines.reduce((s, l) => s + moveLineBaseQty(l) * Number(l.cost || 0), 0);

  const submit = (status: DocStatus) => {
    const res = saveStockMove({
      id: existing?.id,
      date,
      kind,
      warehouseId,
      toWarehouseId: kind === "transfer" ? toWarehouseId || null : null,
      branchId,
      userId,
      partyName,
      refNo,
      refCode,
      lines,
      note,
      status,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(status === "posted" ? "تم ترحيل الإذن وتحديث المخزون" : "تم حفظ الإذن كمسودة");
    navigate({ to: "/inventory/moves" });
  };

  const options = warehouseOptions(data);
  const nextNumber = existing?.no ?? nextMoveNo(data, kind);

  return (
    <FormPage
      title={existing ? `تعديل ${MOVE_KIND_LABEL[existing.kind]} — ${existing.no}` : "إذن مخزني جديد"}
      subtitle="إضافة مخزون، صرف مخزني، تحويل بين المخازن أو تسوية جرد"
      onCancel={() => navigate({ to: "/inventory/moves" })}
      onSubmit={() => submit("posted")}
      submitLabel="ترحيل الإذن"
      extraActions={
        <>
          <Button type="button" variant="outline" onClick={() => submit("draft")}>
            حفظ كمسودة
          </Button>
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5"
              onClick={() => printStockMove(data, existing as StockMove)}
            >
              <Printer className="size-4" />
              طباعة
            </Button>
          ) : null}
        </>
      }
    >
      <FormSection title="بيانات الإذن">
        <Field label="رقم الإذن" hint="يتم توليده تلقائياً">
          <Input dir="ltr" className="bg-muted/50 text-right" value={nextNumber} readOnly />
        </Field>
        <Field label="نوع الإذن">
          <SearchSelect
            options={Object.entries(MOVE_KIND_LABEL).map(([value, label]) => ({ value, label }))}
            value={kind}
            onChange={(v) => setKind((v as StockMoveKind) || "in")}
          />
        </Field>
        <Field label="التاريخ">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={kind === "transfer" ? "من مخزن" : "المخزن"}>
          <SearchSelect options={options} value={warehouseId} onChange={(v) => setWarehouseId(v ?? "")} />
        </Field>
        {kind === "transfer" ? (
          <Field label="إلى مخزن">
            <SearchSelect
              options={options.filter((o) => o.value !== warehouseId)}
              value={toWarehouseId}
              onChange={(v) => setToWarehouseId(v ?? "")}
            />
          </Field>
        ) : null}
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchId}
            onChange={(v) => setBranchId(v ?? "")}
          />
        </Field>
        <Field label="المستخدم / أمين المخزن">
          <SearchSelect
            options={data.users.map((u) => ({ value: u.id, label: u.name, hint: u.role }))}
            value={userId}
            onChange={(v) => setUserId(v ?? "")}
          />
        </Field>
        <Field label="الجهة (عميل / مورد / جهة داخلية)">
          <Input dir="rtl" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
        </Field>
        <Field label="الرقم المرجعى" hint="مثال: PINV-PO-000012">
          <Input dir="ltr" className="text-right" value={refNo} onChange={(e) => setRefNo(e.target.value)} />
        </Field>
        <Field label="كود / رقم الفاتورة المرتبطة">
          <Input dir="ltr" className="text-right" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
        </Field>
      </FormSection>

      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-primary">أصناف الإذن</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setLines((rows) => [...rows, emptyMoveLine(uid("ml"))])}
          >
            <Plus className="size-4" />
            إضافة صنف
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line) => {
            const product = data.products.find((p) => p.id === line.productId);
            return (
              <div key={line.id} className="grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-2 lg:grid-cols-6">
                <Field label="الصنف" className="lg:col-span-2">
                  <SearchSelect
                    options={data.products
                      .filter((p) => p.active)
                      .map((p) => ({
                        value: p.id,
                        label: p.name,
                        hint: `${p.code} — الرصيد: ${num(p.stock)} ${UNIT_LABEL[p.unit]}`,
                      }))}
                    value={line.productId}
                    onChange={(v) => pickProduct(line.id, v ?? "")}
                  />
                </Field>
                <Field label="الوحدة">
                  <SearchSelect
                    options={product ? unitOptions(product) : []}
                    value={line.unitCode ?? line.unit}
                    onChange={(v) => {
                      if (!product) return;
                      const patch = unitPatch(product, v);
                      setLine(line.id, {
                        unitCode: patch.unitCode,
                        unitName: patch.unitName,
                        unitFactor: patch.unitFactor,
                      });
                    }}
                  />
                </Field>
                <Field label="الكمية">
                  <Input
                    type="number"
                    step="0.001"
                    className="text-right"
                    value={line.qty}
                    onChange={(e) => setLine(line.id, { qty: Number(e.target.value) })}
                  />
                </Field>
                <Field label="تكلفة الوحدة الأساسية">
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right"
                    value={line.cost}
                    onChange={(e) => setLine(line.id, { cost: Number(e.target.value) })}
                  />
                </Field>
                <div className="flex items-end justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    <div>الكمية الأساسية: {num(moveLineBaseQty(line))}</div>
                    <div>القيمة: {money(moveLineBaseQty(line) * Number(line.cost || 0))}</div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setLines((rows) => (rows.length > 1 ? rows.filter((l) => l.id !== line.id) : rows))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-6 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm font-semibold">
          <span>إجمالي الكمية: {num(totalQty)}</span>
          <span>إجمالي القيمة: {money(totalValue)}</span>
        </div>
      </section>

      <FormSection title="ملاحظات">
        <Field label="ملاحظات الإذن" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
