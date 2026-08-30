import React, { useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw, Save, Settings2 } from 'lucide-react';

import { PageHeader, NumberField, SwitchRow } from '@/components/accounting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRefresh } from '@/hooks/useTable';
import { DEFAULT_SETTINGS, getSettings, num, saveSettings, type DocSettings } from '@/lib/docFlow';
import { resetDb } from '@/lib/mockDb';

const AccDocSettingsPage: React.FC = () => {
  const refresh = useRefresh();
  const [form, setForm] = useState<DocSettings>(getSettings());
  const set = <K extends keyof DocSettings>(k: K, v: DocSettings[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (num(form.vat_rate) < 0 || num(form.vat_rate) > 100) return toast.error('نسبة ض.ق.م غير منطقية');
    await saveSettings(form);
    refresh('acc_doc_settings');
    toast.success('تم حفظ إعدادات الدورات — سيتم تطبيقها على المستندات الجديدة');
  };

  const reset = async () => {
    setForm(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS);
    refresh('acc_doc_settings');
    toast.success('تمت الاستعادة للإعدادات المصرية الافتراضية');
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <PageHeader
        icon={<Settings2 className="h-6 w-6" />}
        title="إعدادات دورتي الشراء والبيع"
        subtitle="الضوابط الضريبية ونسب السماح وقواعد الحماية — تُطبَّق تلقائياً على كل مستند جديد في البرنامج."
      />

      <Card>
        <CardHeader><CardTitle>الضرائب المصرية</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <NumberField label="ض.ق.م % (القيمة المضافة)" step="0.1" value={form.vat_rate} onChange={(v) => set('vat_rate', v)} />
          <NumberField label="خصم وحسم على المشتريات %" step="0.1" value={form.wht_purchase_pct} onChange={(v) => set('wht_purchase_pct', v)} />
          <NumberField label="خصم وحسم على المبيعات %" step="0.1" value={form.wht_sales_pct} onChange={(v) => set('wht_sales_pct', v)} />
          <NumberField label="حد تطبيق الخصم والحسم (ج.م)" value={form.wht_threshold} onChange={(v) => set('wht_threshold', v)} />
          <SwitchRow title="تطبيق رسم الدمغة" description="يُحسب على صافي الفاتورة" checked={form.stamp_enabled} onCheckedChange={(v) => set('stamp_enabled', v)} />
          <NumberField label="نسبة الدمغة %" step="0.01" value={form.stamp_pct} onChange={(v) => set('stamp_pct', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>نسب السماح والمطابقة</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <NumberField
            label="نسبة السماح في فرق الوزن %"
            hint="فرق الميزان بين القائم والفارغ وأسطر الاستلام أو التسليم."
            step="0.1"
            value={form.weight_tolerance_pct}
            onChange={(v) => set('weight_tolerance_pct', v)}
          />
          <NumberField
            label="نسبة السماح في فرق السعر %"
            hint="فرق سعر فاتورة المورد عن سعر أمر الشراء (المطابقة الثلاثية)."
            step="0.1"
            value={form.price_tolerance_pct}
            onChange={(v) => set('price_tolerance_pct', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قواعد الحماية المالية</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <SwitchRow title="منع تجاوز حد ائتمان العميل" description="يرفض أمر البيع إذا تجاوز الرصيد + قيمة الأمر حد الائتمان." checked={form.enforce_credit_limit} onCheckedChange={(v) => set('enforce_credit_limit', v)} />
          <SwitchRow title="منع الاستلام بأكثر من كمية أمر الشراء" description="يمنع دخول كميات غير متعاقد عليها للمخزن." checked={form.block_over_receipt} onCheckedChange={(v) => set('block_over_receipt', v)} />
          <SwitchRow title="إظهار حقول الفاتورة الإلكترونية" description="البطاقة الضريبية وأكواد الأصناف للتوافق مع منظومة الفاتورة المصرية." checked={form.einvoice_fields_enabled} onCheckedChange={(v) => set('einvoice_fields_enabled', v)} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={reset}>استعادة الافتراضي المصري</Button>
        <Button onClick={save}><Save className="h-4 w-4 me-1" /> حفظ الإعدادات</Button>
      </div>
    </div>
  );
};

export default AccDocSettingsPage;
