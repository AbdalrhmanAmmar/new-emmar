import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Printer, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SupplierHistoryButton } from "@/components/purchases/SupplierHistoryButton";
import { Field } from "@/components/treasury/FormPage";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { money, num, today } from "@/lib/format";
import { addDays } from "@/lib/settingsRules";
import {
  SALES_PAY_LABEL,
  UNIT_LABEL,
  nextNo,
  uid,
  useDb,
  type PurchaseInvoice,
  type SalesLine,
  type SalesPayMethod,
} from "@/lib/mockDb";
import { printSalesInvoice } from "@/lib/printInvoice";
import { purchasePrintInput } from "@/lib/printPurchase";
import { savePurchaseInvoice } from "@/lib/purchaseActions";
import { baseQty, lineUnitLabel, unitOptions, unitPatch } from "@/lib/units";
import { purchaseTotals } from "@/lib/purchases";
import { effectiveTaxRate, emptyLine, lineTotals, productOptions } from "@/lib/sales";

interface Props {
  invoice?: PurchaseInvoice;
}

/** شاشة فاتورة المشتريات — الهيدر + جدول الأصناف + الملخص المالي والتسوية */
export function PurchaseInvoiceEditor({ invoice }: Props) {
  const data = useDb();
  const navigate = useNavigate();

  const [branchId, setBranchId] = useState(invoice?.branchId ?? data.branches[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(invoice?.warehouseId ?? data.warehouses[0]?.id ?? "");
  const [date, setDate] = useState(invoice?.date ?? today());
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ?? addDays(today(), data.settings.defaultPaymentDays),
  );
  const [supplierKind, setSupplierKind] = useState<"cash" | "registered">(invoice?.supplierId ? "registered" : "cash");
  const [supplierId, setSupplierId] = useState<string | null>(invoice?.supplierId ?? null);
  const [supplierName, setSupplierName] = useState(invoice?.supplierId ? "" : invoice?.supplierName ?? "مورد نقدي");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(invoice?.supplierInvoiceNo ?? "");
  const [lines, setLines] = useState<SalesLine[]>(invoice?.lines ?? [emptyLine(uid("pl"))]);
  const [payMethod, setPayMethod] = useState<SalesPayMethod>(invoice?.payMethod ?? "cash");
  const [payCash, setPayCash] = useState(String(invoice?.payCash ?? 0));
  const [payCard, setPayCard] = useState(String(invoice?.payCard ?? 0));
  const [safeId, setSafeId] = useState<string | null>(invoice?.safeId ?? data.safes[0]?.id ?? null);
  const [note, setNote] = useState(invoice?.note ?? "");

  const invoiceNo = useMemo(
    () => invoice?.no ?? nextNo("PO", data.purchaseInvoices.map((i) => i.no)),
    [invoice?.no, data.purchaseInvoices],
  );

  const filledLines = lines.filter((l) => l.productId);
  const qtySum = filledLines.reduce((acc, l) => acc + Number(l.qty || 0), 0);
  const products = useMemo(() => productOptions(data), [data]);

  const totals = purchaseTotals({
    lines,
    payMethod,
    payCash: Number(payCash || 0),
    payCard: Number(payCard || 0),
  });

  const setLine = (id: string, patch: Partial<SalesLine>) =>
    setLines((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const pickProduct = (lineId: string, productId: string) => {
    const product = data.products.find((p) => p.id === productId);
    if (!product) return;
    if (lines.some((l) => l.productId === productId && l.id !== lineId)) {
      toast.error("الصنف مضاف بالفعل في الفاتورة — عدّل الكمية بدلاً من التكرار");
      return;
    }
    setLine(lineId, {
      productId: product.id,
      code: product.code,
      name: product.name,
      unit: product.unit,
      unitCode: product.unit,
      unitName: UNIT_LABEL[product.unit],
      unitFactor: 1,
      price: product.cost,
      taxRate: effectiveTaxRate(product.taxRate),
    });
  };

  const buildPayload = (status: PurchaseInvoice["status"]) => ({
    ...(invoice?.id ? { id: invoice.id, no: invoice.no } : {}),
    date,
    dueDate: payMethod === "credit" ? dueDate : date,
    branchId,
    warehouseId,
    userId: data.users[0]?.id ?? "u1",
    supplierId: supplierKind === "registered" ? supplierId : null,
    supplierName: supplierKind === "registered" ? "" : supplierName,
    supplierInvoiceNo,
    lines: lines.filter((l) => l.productId),
    payMethod,
    payCash: payMethod === "card" ? 0 : Number(payCash || 0),
    payCard: payMethod === "cash" ? 0 : Number(payCard || 0),
    safeId: payMethod === "credit" ? null : safeId,
    note,
    status,
  });

  const doPrint = () => {
    printSalesInvoice(
      purchasePrintInput(data, {
        id: invoice?.id ?? "preview",
        no: invoiceNo,
        ...buildPayload(invoice?.status ?? "draft"),
      } as PurchaseInvoice),
    );
  };

  const submit = (status: PurchaseInvoice["status"], andPrint = false) => {
    const res = savePurchaseInvoice(buildPayload(status));
    if (!res.ok) {
      toast.error(res.error ?? "تعذر الحفظ");
      return;
    }
    toast.success(status === "posted" ? "تم حفظ وترحيل فاتورة الشراء" : "تم حفظ الفاتورة كمسودة");
    if (andPrint) doPrint();
    navigate({ to: "/purchases/invoices" });
  };

  const supplierOptions = data.suppliers.map((s) => ({
    value: s.id,
    label: s.name,
    hint: `${s.code} — ${s.phone}`,
  }));

  return (
    <div className="form-page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {invoice ? `تعديل فاتورة مشتريات ${invoice.no}` : "فاتورة مشتريات جديدة"}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              رقم الفاتورة (تلقائى): {invoiceNo}
            </span>
            {`شاشة شراء متكاملة — أصناف، خصومات، ضريبة ${data.settings.vatRate}%، وسداد فورى`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/purchases/invoices" })} className="gap-1.5">
            <ArrowLeft className="size-4" />
            رجوع
          </Button>
          <Button type="button" variant="outline" onClick={doPrint} className="gap-1.5">
            <Printer className="size-4" />
            طباعة
          </Button>
          <Button type="button" variant="outline" onClick={() => submit("draft")} className="gap-1.5">
            حفظ كمسودة
          </Button>
          <Button type="button" onClick={() => submit("posted")} className="gap-1.5">
            <Save className="size-4" />
            حفظ وترحيل
          </Button>
          <Button type="button" variant="secondary" onClick={() => submit("posted", true)} className="gap-1.5">
            <Printer className="size-4" />
            حفظ وطباعة
          </Button>
        </div>
      </div>

      {/* ===== شريط الملخص اللحظى ===== */}
      <div className="sticky top-14 z-20 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur sm:grid-cols-3 lg:grid-cols-6">
        <LiveStat label="عدد الأصناف" value={String(filledLines.length)} />
        <LiveStat label="إجمالي الكميات" value={num(qtySum)} />
        <LiveStat label="الصافي" value={money(totals.net)} />
        <LiveStat label="الضريبة" value={money(totals.tax)} />
        <LiveStat label="المستحق للمورد" value={money(totals.total)} tone="primary" />
        <LiveStat label="المتبقي" value={money(totals.remaining)} tone={totals.remaining > 0 ? "danger" : "ok"} />
      </div>

      <div className="min-w-0 space-y-4">
        {/* ===== بيانات الفاتورة ===== */}
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="border-b border-border pb-2 text-sm font-semibold text-primary">بيانات فاتورة الشراء</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="الفرع">
              <SearchSelect
                options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
                value={branchId}
                onChange={setBranchId}
              />
            </Field>
            <Field label="المخزن المستقبل">
              <SearchSelect
                options={data.warehouses.map((w) => ({ value: w.id, label: w.name, hint: w.code }))}
                value={warehouseId}
                onChange={setWarehouseId}
              />
            </Field>
            <Field label="نوع المورد">
              <div className="flex gap-2">
                {(["cash", "registered"] as const).map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    variant={supplierKind === kind ? "default" : "outline"}
                    className="flex-1 text-xs"
                    onClick={() => setSupplierKind(kind)}
                  >
                    {kind === "cash" ? "نقدي" : "مورد مسجل"}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="رقم فاتورة المورد" hint="لمنع تكرار تسجيل نفس الفاتورة">
              <Input dir="rtl" value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} />
            </Field>
            <Field label={supplierKind === "registered" ? "المورد" : "اسم المورد النقدي"} className="lg:col-span-2">
              {supplierKind === "registered" ? (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchSelect
                      options={supplierOptions}
                      value={supplierId}
                      onChange={setSupplierId}
                      placeholder="اختر المورد"
                    />
                  </div>
                  <SupplierHistoryButton supplierId={supplierId} />
                </div>
              ) : (
                <Input dir="rtl" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              )}
            </Field>
            <Field label="تاريخ الفاتورة">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="تاريخ الاستحقاق" hint={payMethod === "credit" ? undefined : "يُستخدم في الشراء الآجل"}>
              <Input
                type="date"
                value={dueDate}
                disabled={payMethod !== "credit"}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field label="ملاحظات" className="sm:col-span-2 lg:col-span-4">
              <Textarea dir="rtl" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </section>

        {/* ===== جدول الأصناف ===== */}
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-primary">الأصناف الموردة</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setLines((rows) => [...rows, emptyLine(uid("pl"))])}
            >
              <Plus className="size-4" />
              إضافة سطر
            </Button>
          </div>

          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[54rem] text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  {["الكود", "اسم الصنف / بحث سريع", "الكمية", "الوحدة", "سعر الشراء", "خصم %", "خصم مبلغ", "الضريبة", "الإجمالي", ""].map(
                    (h) => (
                      <th key={h} className="px-2 py-2 text-center font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const t = lineTotals(line);
                  const product = data.products.find((p) => p.id === line.productId);
                  return (
                    <tr key={line.id} className="border-b border-border/60 align-middle">
                      <td className="px-2 py-2 text-center text-xs text-muted-foreground">{line.code || "—"}</td>
                      <td className="min-w-[16rem] px-2 py-2">
                        <SearchSelect
                          options={products}
                          value={line.productId || null}
                          onChange={(v) => pickProduct(line.id, v)}
                          placeholder="ابحث بالاسم أو الكود أو الباركود"
                        />
                        {product ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            الرصيد الحالى: {num(product.stock)} {UNIT_LABEL[product.unit]} — آخر تكلفة: {num(product.cost)}
                            {line.unitFactor && line.unitFactor !== 1
                              ? ` — يضاف ${num(baseQty(line))} ${UNIT_LABEL[product.unit]}`
                              : ""}
                          </p>
                        ) : null}
                      </td>
                      <td className="w-20 px-2 py-2">
                        <Input
                          type="number"
                          className="h-9 text-center"
                          value={line.qty}
                          onChange={(e) => setLine(line.id, { qty: Number(e.target.value) })}
                        />
                      </td>
                      <td className="w-32 px-2 py-2">
                        {product ? (
                          <SearchSelect
                            options={unitOptions(product)}
                            value={line.unitCode ?? product.unit}
                            onChange={(v) => {
                              const patch = unitPatch(product, v);
                              setLine(line.id, {
                                ...patch,
                                price: Number((product.cost * (patch.unitFactor || 1)).toFixed(2)),
                              });
                            }}
                          />
                        ) : (
                          <span className="block text-center text-xs text-muted-foreground">{lineUnitLabel(line)}</span>
                        )}
                      </td>
                      <td className="w-28 px-2 py-2">
                        <Input
                          type="number"
                          className="h-9 text-center"
                          value={line.price}
                          onChange={(e) => setLine(line.id, { price: Number(e.target.value) })}
                        />
                      </td>
                      <td className="w-20 px-2 py-2">
                        <Input
                          type="number"
                          className="h-9 text-center"
                          value={line.discountPct}
                          onChange={(e) => setLine(line.id, { discountPct: Number(e.target.value) })}
                        />
                      </td>
                      <td className="w-24 px-2 py-2">
                        <Input
                          type="number"
                          className="h-9 text-center"
                          value={line.discountAmt}
                          onChange={(e) => setLine(line.id, { discountAmt: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-2 py-2 text-center text-xs">{num(t.tax)}</td>
                      <td className="px-2 py-2 text-center text-xs font-semibold">{num(t.total)}</td>
                      <td className="px-2 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() =>
                            setLines((rows) =>
                              rows.length === 1 ? [emptyLine(uid("pl"))] : rows.filter((r) => r.id !== line.id),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== الملخص المالي والسداد ===== */}
        <section className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="border-b border-border pb-2 text-sm font-semibold text-primary">سداد الفاتورة</h2>
            <Field label="طريقة السداد">
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(SALES_PAY_LABEL) as SalesPayMethod[]).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={payMethod === m ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => {
                      setPayMethod(m);
                      if (m === "cash") setPayCash(String(Number(totals.total.toFixed(2))));
                      if (m === "card") setPayCard(String(Number(totals.total.toFixed(2))));
                    }}
                  >
                    {SALES_PAY_LABEL[m]}
                  </Button>
                ))}
              </div>
            </Field>
            {payMethod !== "credit" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {payMethod !== "card" ? (
                  <Field label="المسدد نقدي">
                    <Input type="number" value={payCash} onChange={(e) => setPayCash(e.target.value)} />
                  </Field>
                ) : null}
                {payMethod !== "cash" ? (
                  <Field label="المسدد تحويل / شبكة">
                    <Input type="number" value={payCard} onChange={(e) => setPayCard(e.target.value)} />
                  </Field>
                ) : null}
                <Field label="الخزينة / الحساب المصروف منه" className="sm:col-span-2">
                  <SearchSelect
                    options={data.safes.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name, hint: s.code }))}
                    value={safeId}
                    onChange={setSafeId}
                  />
                </Field>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                الشراء الآجل يُسجَّل على حساب المورد ويظهر في الفواتير الآجلة بالخزينة للسداد لاحقاً.
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <h2 className="pb-1 text-sm font-semibold text-primary">الملخص المالي</h2>
            <SummaryRow label="الإجمالي" value={money(totals.gross)} />
            <SummaryRow label="الخصم" value={money(totals.discount)} />
            <SummaryRow label="الصافي" value={money(totals.net)} />
            <SummaryRow label={`الضريبة (${data.settings.vatRate}%)`} value={money(totals.tax)} />
            <SummaryRow label="المستحق للمورد" value={money(totals.total)} strong />
            <SummaryRow label="إجمالي المسدد" value={money(totals.paid)} />
            <SummaryRow label="المتبقي" value={money(totals.remaining)} strong danger={totals.remaining > 0} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`${strong ? "text-base font-bold" : "text-sm font-medium"} ${
          danger ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function LiveStat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "primary" | "danger" | "ok";
}) {
  const tones: Record<string, string> = {
    muted: "border-border bg-muted/40 text-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    ok: "border-primary/25 bg-primary/5 text-primary",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
    </div>
  );
}
