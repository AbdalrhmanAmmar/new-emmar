import { useNavigate } from "@tanstack/react-router";
import { Printer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dateFmt, money, today } from "@/lib/format";
import { METHOD_LABEL, useDb, type PayMethod, type VoucherKind } from "@/lib/mockDb";
import { printRecord } from "@/lib/printDoc";
import { invoiceRemaining, openInvoices } from "@/lib/treasury";
import { saveVoucher, voucherPrintFields } from "@/lib/treasuryActions";

interface Props {
  kind: VoucherKind;
  voucherId?: string;
}

export function VoucherForm({ kind, voucherId }: Props) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = voucherId ? data.vouchers.find((v) => v.id === voucherId) : undefined;
  const listPath = kind === "receipt" ? "/treasury/receipts" : "/treasury/payments";
  const isReceipt = kind === "receipt";

  const [date, setDate] = useState(existing?.date ?? today());
  const [safeId, setSafeId] = useState(existing?.safeId ?? data.safes.find((s) => s.active)?.id ?? "");
  const [branchId, setBranchId] = useState(existing?.branchId ?? data.branches[0]?.id ?? "");
  const [userId, setUserId] = useState(existing?.userId ?? data.users[0]?.id ?? "");
  const [partyType, setPartyType] = useState<"customer" | "supplier" | "other">(
    existing?.partyType ?? (isReceipt ? "customer" : "supplier"),
  );
  const [partyId, setPartyId] = useState<string | null>(existing?.partyId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [costCenter, setCostCenter] = useState(existing?.costCenter ?? "");
  const [method, setMethod] = useState<PayMethod>(existing?.method ?? "cash");
  const [reference, setReference] = useState(existing?.reference ?? "");
  const [amount, setAmount] = useState(String(existing?.amount ?? ""));
  const [note, setNote] = useState(existing?.note ?? "");
  const [status, setStatus] = useState(existing?.status ?? "posted");
  const [allocations, setAllocations] = useState<Record<string, string>>(
    Object.fromEntries((existing?.allocations ?? []).map((a) => [a.invoiceId, String(a.amount)])),
  );

  const invoiceKind = isReceipt ? "sales" : "purchase";
  const parties = isReceipt ? data.customers : data.suppliers;
  const categories = data.categories.filter((c) => (isReceipt ? c.kind === "revenue" : c.kind === "expense"));

  const invoices = useMemo(() => {
    if (partyType === "other" || !partyId) return [];
    const open = openInvoices(data, invoiceKind, partyId);
    const extra = (existing?.allocations ?? [])
      .map((a) => data.invoices.find((i) => i.id === a.invoiceId))
      .filter((i): i is NonNullable<typeof i> => Boolean(i) && !open.some((o) => o.id === i!.id));
    return [...open, ...extra];
  }, [data, partyType, partyId, invoiceKind, existing]);

  const allocTotal = Object.values(allocations).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const amountValue = Number(amount) || 0;

  const autoDistribute = () => {
    let remainingAmount = amountValue;
    const next: Record<string, string> = {};
    for (const inv of invoices) {
      if (remainingAmount <= 0) break;
      const alreadyPaidHere = Number(existing?.allocations.find((a) => a.invoiceId === inv.id)?.amount ?? 0);
      const capacity = invoiceRemaining(inv) + alreadyPaidHere;
      const take = Math.min(capacity, remainingAmount);
      if (take > 0) {
        next[inv.id] = String(Number(take.toFixed(2)));
        remainingAmount -= take;
      }
    }
    setAllocations(next);
  };

  const submit = () => {
    const result = saveVoucher({
      id: existing?.id,
      kind,
      date,
      safeId,
      branchId,
      userId,
      partyType,
      partyId,
      categoryId,
      costCenter,
      method,
      reference,
      amount: amountValue,
      note,
      status,
      allocations: Object.entries(allocations)
        .map(([invoiceId, value]) => ({ invoiceId, amount: Number(value) || 0 }))
        .filter((a) => a.amount > 0),
      reconciled: existing?.reconciled ?? false,
      shiftId: existing?.shiftId ?? null,
    });

    if (!result.ok) {
      toast.error(result.error ?? "تعذّر الحفظ");
      return;
    }
    toast.success(isReceipt ? "تم حفظ سند القبض" : "تم حفظ سند الصرف");
    navigate({ to: listPath });
  };

  const doPrint = () => {
    if (!existing) {
      toast.error("احفظ السند أولاً ليتم طباعته");
      return;
    }
    printRecord(
      isReceipt ? `سند قبض ${existing.no}` : `سند صرف ${existing.no}`,
      voucherPrintFields(data, existing),
      existing.allocations.length
        ? {
            headers: ["الفاتورة", "التاريخ", "إجمالي الفاتورة", "المسدد بهذا السند"],
            rows: existing.allocations.map((a) => {
              const inv = data.invoices.find((i) => i.id === a.invoiceId);
              return [inv?.no ?? "-", dateFmt(inv?.date), money(inv?.total ?? 0), money(a.amount)];
            }),
          }
        : undefined,
      `إجمالي السند: ${money(existing.amount)}`,
    );
  };

  return (
    <FormPage
      title={
        existing
          ? `تعديل ${isReceipt ? "سند قبض" : "سند صرف"} — ${existing.no}`
          : isReceipt
            ? "سند قبض جديد"
            : "سند صرف جديد"
      }
      subtitle={isReceipt ? "تحصيل من عميل أو إيراد متنوع" : "سداد لمورد أو مصروف"}
      onCancel={() => navigate({ to: listPath })}
      onSubmit={submit}
      extraActions={
        existing ? (
          <Button type="button" variant="outline" onClick={doPrint} className="gap-1.5">
            <Printer className="size-4" />
            طباعة
          </Button>
        ) : null
      }
    >
      <FormSection title="بيانات السند">
        <Field label="التاريخ">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="الخزينة / الحساب">
          <SearchSelect
            options={data.safes
              .filter((s) => s.active)
              .map((s) => ({ value: s.id, label: s.name, hint: s.code }))}
            value={safeId}
            onChange={setSafeId}
            placeholder="اختر الخزينة"
          />
        </Field>
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchId}
            onChange={setBranchId}
          />
        </Field>
        <Field label="المستخدم المسؤول">
          <SearchSelect
            options={data.users.map((u) => ({ value: u.id, label: u.name, hint: u.role }))}
            value={userId}
            onChange={setUserId}
          />
        </Field>
        <Field label="طريقة الدفع">
          <Select value={method} onValueChange={(value) => setMethod(value as PayMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METHOD_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="رقم المرجع / الشيك">
          <Input dir="rtl" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title={isReceipt ? "مصدر التحصيل" : "جهة الصرف"}>
        <Field label="النوع">
          <Select
            value={partyType}
            onValueChange={(value) => {
              setPartyType(value as typeof partyType);
              setPartyId(null);
              setCategoryId(null);
              setAllocations({});
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={isReceipt ? "customer" : "supplier"}>
                {isReceipt ? "تحصيل من عميل" : "سداد لمورد"}
              </SelectItem>
              <SelectItem value="other">{isReceipt ? "إيراد متنوع" : "مصروف"}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {partyType === "other" ? (
          <>
            <Field label={isReceipt ? "بند الإيراد" : "بند المصروف"}>
              <SearchSelect
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="اختر البند"
              />
            </Field>
            <Field label="مركز التكلفة">
              <Input dir="rtl" value={costCenter} onChange={(e) => setCostCenter(e.target.value)} />
            </Field>
          </>
        ) : (
          <Field label={isReceipt ? "العميل" : "المورد"} className="sm:col-span-2">
            <SearchSelect
              options={parties.map((p) => ({ value: p.id, label: p.name, hint: `${p.code} — ${p.phone}` }))}
              value={partyId}
              onChange={(value) => {
                setPartyId(value);
                setAllocations({});
              }}
              placeholder={isReceipt ? "اختر العميل" : "اختر المورد"}
            />
          </Field>
        )}

        <Field label="المبلغ (ج.م)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-right font-semibold"
          />
        </Field>
        <Field label="الحالة">
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="posted">مُرحّل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="البيان" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      </FormSection>

      {partyType !== "other" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-primary">تسوية الفواتير الآجلة</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                الموزّع: <strong className="text-foreground">{money(allocTotal)}</strong> من {money(amountValue)}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={autoDistribute}>
                توزيع تلقائي
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAllocations({})} className="gap-1">
                <Trash2 className="size-3.5" />
                تفريغ
              </Button>
            </div>
          </div>

          {invoices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              لا توجد فواتير آجلة مفتوحة لهذا الطرف
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-center text-xs">
                  <tr>
                    <th className="p-2">الفاتورة</th>
                    <th className="p-2">التاريخ</th>
                    <th className="p-2">الاستحقاق</th>
                    <th className="p-2">الإجمالي</th>
                    <th className="p-2">المتبقي</th>
                    <th className="p-2">المسدد الآن</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-border/70 text-right">
                      <td className="p-2 font-medium">{inv.no}</td>
                      <td className="p-2">{dateFmt(inv.date)}</td>
                      <td className="p-2">{dateFmt(inv.dueDate)}</td>
                      <td className="p-2">{money(inv.total)}</td>
                      <td className="p-2 text-destructive">{money(invoiceRemaining(inv))}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={allocations[inv.id] ?? ""}
                          onChange={(e) =>
                            setAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))
                          }
                          className="h-8 w-32 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {amountValue - allocTotal > 0.01 ? (
            <p className="text-xs text-muted-foreground">
              المتبقي غير مُوزّع: {money(amountValue - allocTotal)} — سيُسجل كدفعة تحت الحساب.
            </p>
          ) : null}
        </section>
      ) : null}
    </FormPage>
  );
}
