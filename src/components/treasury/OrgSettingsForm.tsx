import { ImagePlus, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DangerZone } from "@/components/treasury/DangerZone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings, useDb, type OrgSettings } from "@/lib/mockDb";

/** يضغط الصورة ويحولها إلى data URL صغيرة مناسبة للتخزين المحلى */
function fileToLogoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("الملف ليس صورة صالحة"));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("تعذر معالجة الصورة"));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

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
  const fileRef = useRef<HTMLInputElement>(null);

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      set("logoDataUrl", dataUrl);
      toast.success("تم تحميل الشعار — احفظ الإعدادات لتطبيقه");
    } catch {
      toast.error("تعذر تحميل الصورة، جرّب ملفاً آخر");
    }
  };

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
          <CardTitle className="text-sm">شعار الشركة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-2xl font-bold text-primary">
            {form.logoDataUrl ? (
              <img src={form.logoDataUrl} alt="شعار الشركة" className="size-full object-cover" />
            ) : (
              form.logoLetter || "إ"
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="size-4" /> رفع الشعار
              </Button>
              {form.logoDataUrl ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("logoDataUrl", undefined)}>
                  <Trash2 className="size-4" /> إزالة
                </Button>
              ) : null}
            </div>
            <p className="max-w-sm text-[11px] text-muted-foreground">
              يظهر الشعار فى الشريط الجانبى وشاشة الدخول وجميع المطبوعات. عند عدم رفع شعار يُستخدم «حرف الشعار» فى المطبوعات.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void pickLogo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">رسائل الفواتير للعملاء (واتساب)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span>إرسال رسالة الفاتورة تلقائياً عند ترحيل فاتورة مبيعات</span>
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={Boolean(form.autoSendInvoiceMsg)}
              onChange={(e) => set("autoSendInvoiceMsg", e.target.checked)}
            />
          </label>
          <div className="space-y-1.5">
            <Label className="text-xs">صيغة الرسالة</Label>
            <Textarea
              dir="rtl"
              rows={6}
              value={form.invoiceMsgTemplate ?? ""}
              onChange={(e) => set("invoiceMsgTemplate", e.target.value)}
            />
            <p className="text-[11px] leading-6 text-muted-foreground">
              المتغيرات المتاحة: {"{customer}"} {"{no}"} {"{date}"} {"{items}"} {"{total}"} {"{paid}"}{" "}
              {"{remaining}"} {"{company}"} {"{phone}"} — يتم إرسالها فقط للعملاء المُفعّل لهم خيار «إرسال رسالة
              بالفاتورة» فى صفحة تكويد العملاء.
            </p>
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
