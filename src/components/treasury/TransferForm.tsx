import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { money, today } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { safeBalance } from "@/lib/treasury";
import { saveTransfer } from "@/lib/treasuryActions";

export function TransferForm({ transferId }: { transferId?: string }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = transferId ? data.transfers.find((t) => t.id === transferId) : undefined;
  const safes = data.safes.filter((s) => s.active);

  const [date, setDate] = useState(existing?.date ?? today());
  const [fromSafeId, setFromSafeId] = useState(existing?.fromSafeId ?? safes[0]?.id ?? "");
  const [toSafeId, setToSafeId] = useState(existing?.toSafeId ?? safes[1]?.id ?? "");
  const [amount, setAmount] = useState(String(existing?.amount ?? ""));
  const [fee, setFee] = useState(String(existing?.fee ?? 0));
  const [userId, setUserId] = useState(existing?.userId ?? data.users[0]?.id ?? "");
  const [note, setNote] = useState(existing?.note ?? "");

  const submit = () => {
    const result = saveTransfer({
      id: existing?.id,
      date,
      fromSafeId,
      toSafeId,
      amount: Number(amount) || 0,
      fee: Number(fee) || 0,
      userId,
      note,
      status: "posted",
    });
    if (!result.ok) {
      toast.error(result.error ?? "تعذّر الحفظ");
      return;
    }
    toast.success("تم تسجيل التحويل");
    navigate({ to: "/treasury/transfers" });
  };

  return (
    <FormPage
      title={existing ? `تعديل تحويل — ${existing.no}` : "تحويل بين الخزن"}
      subtitle="نقل سيولة بين الخزن والحسابات البنكية مع تسجيل مصاريف التحويل"
      onCancel={() => navigate({ to: "/treasury/transfers" })}
      onSubmit={submit}
    >
      <FormSection title="بيانات التحويل">
        <Field label="التاريخ">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field
          label="من خزينة"
          hint={fromSafeId ? `الرصيد المتاح: ${money(safeBalance(data, fromSafeId))}` : undefined}
        >
          <SearchSelect
            options={safes.map((s) => ({ value: s.id, label: s.name, hint: s.code }))}
            value={fromSafeId}
            onChange={setFromSafeId}
          />
        </Field>
        <Field label="إلى خزينة">
          <SearchSelect
            options={safes.filter((s) => s.id !== fromSafeId).map((s) => ({ value: s.id, label: s.name }))}
            value={toSafeId}
            onChange={setToSafeId}
          />
        </Field>
        <Field label="المبلغ (ج.م)">
          <Input
            type="number"
            step="0.01"
            min="0"
            className="text-right font-semibold"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="مصاريف التحويل (ج.م)" hint="تُخصم من الخزينة المُحوّل منها">
          <Input
            type="number"
            step="0.01"
            min="0"
            className="text-right"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </Field>
        <Field label="المستخدم المسؤول">
          <SearchSelect
            options={data.users.map((u) => ({ value: u.id, label: u.name, hint: u.role }))}
            value={userId}
            onChange={setUserId}
          />
        </Field>
        <Field label="البيان" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
