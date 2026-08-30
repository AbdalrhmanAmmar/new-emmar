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
import { warehouseOptions } from "@/lib/inventory";
import {
  RETURN_KIND_LABEL,
  RETURN_SETTLE_LABEL,
  UNIT_LABEL,
  uid,
  useDb,
  type DocStatus,
  type ReturnKind,
  type ReturnSettle,
  type SalesLine,
} from "@/lib/mockDb";
import { printReturn } from "@/lib/printReturn";
import { saveReturn } from "@/lib/returnActions";
import { returnTotals, returnableInvoices } from "@/lib/returns";
import { emptyLine } from "@/lib/sales";
import { lineTotals } from "@/lib/sales";
import { baseQty, unitOptions, unitPatch } from "@/lib/units";

export function ReturnForm({ returnId, initialKind }: { returnId?: string; initialKind?: ReturnKind }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = returnId ? data.returns.find((r) => r.id === returnId) : undefined;

  const [kind, setKind] = useState<ReturnKind>(existing?.kind ?? initialKind ?? "sales");
  const [date, setDate] = useState(existing?.date ?? today());
  const [branchId, setBranchId] = useState(existing?.branchId ?? data.branches[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(existing?.warehouseId ?? data.warehouses[0]?.id ?? "");
  const [userId, setUserId] = useState(existing?.userId ?? data.users[0]?.id ?? "");
  const [partyId, setPartyId] = useState(existing?.partyId ?? "");
  const [partyName, setPartyName] = useState(existing?.partyName ?? "");
  const [refInvoiceId, setRefInvoiceId] = useState(existing?.refInvoiceId ?? "");
  const [settle, setSettle] = useState<ReturnSettle>(existing?.settle ?? "credit");
  const [safeId, setSafeId] = useState(existing?.safeId ?? data.safes[0]?.id ?? "");
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [lines, setLines] = useState<SalesLine[]>(existing?.lines ?? [emptyLine(uid("rl"))]);

  const parties = kind === "sales" ? data.customers : data.suppliers;
  const invoices = returnableInvoices(data, kind, partyId || null);
  const refInvoice = invoices.find((i) => i.id === refInvoiceId);

  const setLine = (id: string, patch: Partial<SalesLine>) =>
    setLines((rows) => rows.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const pickProduct = (id: string, productId: string) => {
    const product = data.products.find((p) => p.id === productId);
    if (!product) return;
    setLine(id, {
      productId,
      code: product.code,
      name: product.name,
      unit: product.unit,
      price: kind === "sales" ? Number(product.unitPrice || 0) : Number(product.cost || 0),
      taxRate: Number(product.taxRate ?? data.settings.vatRate),
      ...unitPatch(product, product.unit),
    });
  };

  /** تحميل أصناف الفاتورة الأصلية بضغطة واحدة */
  const loadInvoiceLines = (invoiceId: string) => {
    setRefInvoiceId(invoiceId);
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) return;
    setPartyName(invoice.partyName);
    setLines(invoice.lines.map((l) => ({ ...l, id: uid("rl") })));
  };

  const totals = returnTotals(lines);

  const submit = (status: DocStatus) => {
    const res = saveReturn({
      id: existing?.id,
      kind,
      date,
      branchId,
      warehouseId,
      userId,
      partyId: partyId || null,
      partyName,
      refInvoiceId: refInvoiceId || null,
      refInvoiceNo: refInvoice?.no ?? existing?.refInvoiceNo ?? "",
      lines,
      settle,
      safeId: settle === "cash" ? safeId : null,
      reason,
      note,
      status,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      status === "posted" ? "تم ترحيل المرتجع وتحديث المخزون والحساب" : "تم حفظ المرتجع كمسودة",
    );
    navigate({ to: "/returns" });
  };

  return (
    <FormPage
      title={existing ? `تعديل ${RETURN_KIND_LABEL[existing.kind]} — ${existing.no}` : "مرتجع جديد"}
      subtitle="مرتجع مبيعات (رد للمخزن) أو مرتجع مشتريات (خروج للمورد) مع إذن مخزني وتسوية مالية تلقائية"
      onCancel={() => navigate({ to: "/returns" })}
      onSubmit={() => submit("posted")}
      submitLabel="ترحيل المرتجع"
      extraActions={
        <>
          <Button type="button" variant="outline" onClick={() => submit("draft")}>
            حفظ كمسودة
          </Button>
          {existing ? (
            <Button type="button" variant="ghost" className="gap-1.5" onClick={() => printReturn(data, existing)}>
              <Printer className="size-4" />
              طباعة
            </Button>
          ) : null}
        </>
      }
    >
      <FormSection title="بيانات المرتجع">
        <Field label="نوع المرتجع">
          <SearchSelect
            options={Object.entries(RETURN_KIND_LABEL).map(([value, label]) => ({ value, label }))}
            value={kind}
            onChange={(v) => {
              setKind((v as ReturnKind) || "sales");
              setPartyId("");
              setRefInvoiceId("");
            }}
          />
        </Field>
        <Field label="التاريخ">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={kind === "sales" ? "العميل" : "المورد"}>
          <SearchSelect
            options={parties.map((p) => ({ value: p.id, label: p.name, hint: p.code }))}
            value={partyId}
            onChange={(v) => {
              setPartyId(v ?? "");
              setPartyName(parties.find((p) => p.id === v)?.name ?? "");
              setRefInvoiceId("");
            }}
          />
        </Field>
        <Field label="الفاتورة الأصلية" hint="اختيارها يحمّل الأصناف ويمنع إرجاع أكثر من المفوتر">
          <SearchSelect
            options={invoices.map((i) => ({ value: i.id, label: i.no, hint: `${i.date} — ${i.partyName}` }))}
            value={refInvoiceId}
            onChange={(v) => loadInvoiceLines(v ?? "")}
          />
        </Field>
        <Field label="المخزن">
          <SearchSelect
            options={warehouseOptions(data)}
            value={warehouseId}
            onChange={(v) => setWarehouseId(v ?? "")}
          />
        </Field>
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchId}
            onChange={(v) => setBranchId(v ?? "")}
          />
        </Field>
        <Field label="المستخدم">
          <SearchSelect
            options={data.users.map((u) => ({ value: u.id, label: u.name, hint: u.role }))}
            value={userId}
            onChange={(v) => setUserId(v ?? "")}
          />
        </Field>
        <Field label="التسوية المالية">
          <SearchSelect
            options={Object.entries(RETURN_SETTLE_LABEL).map(([value, label]) => ({ value, label }))}
            value={settle}
            onChange={(v) => setSettle((v as ReturnSettle) || "credit")}
          />
        </Field>
        {settle === "cash" ? (
          <Field label="الخزينة">
            <SearchSelect
              options={data.safes.map((s) => ({ value: s.id, label: s.name, hint: s.code }))}
              value={safeId}
              onChange={(v) => setSafeId(v ?? "")}
            />
          </Field>
        ) : null}
        <Field label="سبب الإرجاع">
          <Input dir="rtl" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </FormSection>

      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-primary">أصناف المرتجع</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setLines((rows) => [...rows, emptyLine(uid("rl"))])}
          >
            <Plus className="size-4" />
            إضافة صنف
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line) => {
            const product = data.products.find((p) => p.id === line.productId);
            const lt = lineTotals(line);
            return (
              <div
                key={line.id}
                className="grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-2 lg:grid-cols-6"
              >
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
                      setLine(line.id, unitPatch(product, v));
                    }}
                  />
                </Field>
                <Field label="الكمية المرتجعة">
                  <Input
                    type="number"
                    step="0.001"
                    className="text-right"
                    value={line.qty}
                    onChange={(e) => setLine(line.id, { qty: Number(e.target.value) })}
                  />
                </Field>
                <Field label="السعر">
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right"
                    value={line.price}
                    onChange={(e) => setLine(line.id, { price: Number(e.target.value) })}
                  />
                </Field>
                <div className="flex items-end justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    <div>الكمية الأساسية: {num(baseQty(line))}</div>
                    <div>الإجمالي: {money(lt.total)}</div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      setLines((rows) => (rows.length > 1 ? rows.filter((l) => l.id !== line.id) : rows))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-6 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm font-semibold">
          <span>الكمية: {num(totals.qty)}</span>
          <span>الصافي: {money(totals.net)}</span>
          <span>الضريبة: {money(totals.tax)}</span>
          <span className="text-primary">إجمالي المرتجع: {money(totals.total)}</span>
        </div>
      </section>

      <FormSection title="ملاحظات">
        <Field label="ملاحظات المرتجع" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
