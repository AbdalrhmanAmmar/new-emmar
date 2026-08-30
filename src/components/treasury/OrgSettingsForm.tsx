import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DangerZone } from "@/components/treasury/DangerZone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings, useDb, type OrgSettings } from "@/lib/mockDb";

type TextKey =
  | "companyName"
  | "companyNameEn"
  | "activity"
  | "taxNo"
  | "commercialNo"
  | "address"
  | "phone"
  | "phone2"
  | "email"
  | "website"
  | "logoLetter"
  | "currencyLabel";

const IDENTITY: Array<{ key: TextKey; label: string; hint?: string }> = [
  { key: "companyName", label: "اسم الشركة (عربى)" },
  { key: "companyNameEn", label: "اسم الشركة (إنجليزى)" },
  { key: "activity", label: "النشاط", hint: "يظهر أسفل اسم الشركة فى الطباعة" },
  { key: "taxNo", label: "الرقم الضريبى" },
  { key: "commercialNo", label: "السجل التجارى" },
  { key: "address", label: "العنوان" },
  { key: "phone", label: "الهاتف" },
  { key: "phone2", label: "هاتف إضافى" },
  { key: "email", label: "البريد الإلكترونى" },
  { key: "website", label: "الموقع الإلكترونى" },
  { key: "logoLetter", label: "حرف الشعار" },
  { key: "currencyLabel", label: "رمز العملة" },
];

const NUMBERS: Array<{ key: keyof OrgSettings; label: string; hint?: string }> = [
  { key: "vatRate", label: "نسبة القيمة المضافة %", hint: "الافتراضى فى مصر 14%" },
  { key: "whtRate", label: "نسبة الخصم والإضافة %", hint: "تُخصم لصالح الضرائب" },
  { key: "defaultPaymentDays", label: "مدة السماح للآجل (يوم)" },
  { key: "maxLineDiscountPct", label: "أقصى خصم مسموح للسطر %" },
];

const FLAGS: Array<{ key: keyof OrgSettings; label: string }> = [
  { key: "showSignatures", label: "طباعة خانات التوقيعات" },
  { key: "allowNegativeStock", label: "السماح بالبيع بأكثر من المتاح" },
  { key: "priceEditInPos", label: "السماح بتعديل السعر فى الكاشير" },
];

/** الإعدادات الرئيسية: بيانات الطباعة والضرائب والسياسات */
export function OrgSettingsForm() {
  const data = useDb();
  const [form, setForm] = useState<OrgSettings>(data.settings);

  useEffect(() => {
    setForm(data.settings);
  }, [data.settings]);

  const set = <K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.companyName.trim()) {
      toast.error("اسم الشركة مطلوب");
      return;
    }
    saveSettings(form);
    toast.success("تم حفظ الإعدادات الرئيسية");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">بيانات الشركة التى تظهر فى كل المطبوعات</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IDENTITY.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <Input dir="rtl" value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              {f.hint ? <p className="text-[11px] text-muted-foreground">{f.hint}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">الضرائب والسياسات المالية</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NUMBERS.map((f) => (
            <div key={String(f.key)} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <Input
                type="number"
                value={String(form[f.key] ?? 0)}
                onChange={(e) => set(f.key as "vatRate", Number(e.target.value || 0))}
              />
              {f.hint ? <p className="text-[11px] text-muted-foreground">{f.hint}</p> : null}
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2 lg:col-span-4">
            {FLAGS.map((f) => (
              <label
                key={String(f.key)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{f.label}</span>
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={Boolean(form[f.key])}
                  onChange={(e) => set(f.key as "showSignatures", e.target.checked)}
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">نصوص الطباعة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">الشروط والأحكام على الفاتورة</Label>
            <Textarea dir="rtl" rows={3} value={form.invoiceTerms} onChange={(e) => set("invoiceTerms", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">تذييل المطبوعات</Label>
            <Textarea dir="rtl" rows={3} value={form.printFooter} onChange={(e) => set("printFooter", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={submit}>
          <Save className="size-4" /> حفظ الإعدادات
        </Button>
      </div>

      <DangerZone />
    </div>
  );
}
