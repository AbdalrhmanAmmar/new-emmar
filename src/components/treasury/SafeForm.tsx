import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  SAFE_TYPE_LABEL,
  isDuplicate,
  mutate,
  uid,
  useDb,
  type Safe,
  type SafeType,
} from "@/lib/mockDb";

export function SafeForm({ safeId }: { safeId?: string }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = safeId ? data.safes.find((s) => s.id === safeId) : undefined;

  const [code, setCode] = useState(
    existing?.code ?? nextCode(existing?.type === "bank" ? "BANK" : "CASH", data.safes.map((s) => s.code)),
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<SafeType>(existing?.type ?? "branch");
  const [branchId, setBranchId] = useState(existing?.branchId ?? data.branches[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(existing?.ownerId ?? data.users[0]?.id ?? "");
  const [openingBalance, setOpeningBalance] = useState(String(existing?.openingBalance ?? 0));
  const [bankName, setBankName] = useState(existing?.bankName ?? "");
  const [accountNo, setAccountNo] = useState(existing?.accountNo ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [active, setActive] = useState(existing?.active ?? true);

  const submit = () => {
    if (!name.trim() || !code.trim()) {
      toast.error("الكود والاسم مطلوبان");
      return;
    }
    if (isDuplicate(data.safes, "code", code, existing?.id)) {
      toast.error("كود الخزينة مكرر");
      return;
    }
    if (isDuplicate(data.safes, "name", name, existing?.id)) {
      toast.error("اسم الخزينة مكرر");
      return;
    }

    const record: Safe = {
      id: existing?.id ?? uid("sf"),
      code: code.trim(),
      name: name.trim(),
      type,
      branchId,
      ownerId,
      openingBalance: Number(openingBalance) || 0,
      bankName: bankName.trim(),
      accountNo: accountNo.trim(),
      active,
      notes: notes.trim(),
    };

    mutate((db) => {
      const target = db.safes.find((s) => s.id === record.id);
      if (target) Object.assign(target, record);
      else db.safes.push(record);
    });

    toast.success("تم حفظ بيانات الخزينة");
    navigate({ to: "/treasury/safes" });
  };

  return (
    <FormPage
      title={existing ? `تعديل خزينة — ${existing.name}` : "إضافة خزينة / حساب جديد"}
      subtitle="خزينة رئيسية، خزينة فرع، حساب بنكي أو محفظة إلكترونية"
      onCancel={() => navigate({ to: "/treasury/safes" })}
      onSubmit={submit}
    >
      <FormSection title="البيانات الأساسية">
        <Field label="الكود" hint="يتم توليده تلقائياً">
          <Input dir="rtl" value={code} readOnly className="bg-muted/50" />
        </Field>
        <Field label="الاسم">
          <Input dir="rtl" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="النوع">
          <SearchSelect
            options={Object.entries(SAFE_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            value={type}
            onChange={(value) => setType((value as SafeType) ?? "branch")}
          />
        </Field>
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchId}
            onChange={(value) => setBranchId(value ?? "")}
          />
        </Field>
        <Field label="أمين الخزينة">
          <SearchSelect
            options={data.users.map((u) => ({ value: u.id, label: u.name, hint: u.role }))}
            value={ownerId}
            onChange={(value) => setOwnerId(value ?? "")}
          />
        </Field>
        <Field label="الرصيد الافتتاحي (ج.م)" hint="لا يمكن تغييره بعد تسجيل حركات إلا بتسوية">
          <Input
            type="number"
            step="0.01"
            className="text-right"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="بيانات بنكية (للحسابات والمحافظ)">
        <Field label="اسم البنك / مشغل المحفظة">
          <Input dir="rtl" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </Field>
        <Field label="رقم الحساب / المحفظة">
          <Input dir="rtl" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
        </Field>
        <Field label="الحالة">
          <div className="flex items-center gap-2 pt-1.5">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label className="text-sm">{active ? "نشطة" : "معطّلة"}</Label>
          </div>
        </Field>
        <Field label="ملاحظات" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
