import React, { useState } from 'react';
import { toast } from 'sonner';
import { Save, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRefresh } from '@/hooks/useTable';
import { DEFAULT_SETTINGS, getSettings, num, saveSettings, type DocSettings } from '@/lib/docFlow';

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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings2 className="h-6 w-6" /> إعدادات دورتي الشراء والبيع</h1>
        <p className="text-sm text-muted-foreground mt-1">
          الضوابط الضريبية ونسب السماح وقواعد الحماية — تُطبَّق تلقائياً على كل مستند جديد في البرنامج.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>الضرائب المصرية</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div><Label>ض.ق.م % (القيمة المضافة)</Label><Input type="number" step="0.1" value={form.vat_rate} onChange={(e) => set('vat_rate', Number(e.target.value))} /></div>
          <div><Label>خصم وحسم على المشتريات %</Label><Input type="number" step="0.1" value={form.wht_purchase_pct} onChange={(e) => set('wht_purchase_pct', Number(e.target.value))} /></div>
          <div><Label>خصم وحسم على المبيعات %</Label><Input type="number" step="0.1" value={form.wht_sales_pct} onChange={(e) => set('wht_sales_pct', Number(e.target.value))} /></div>
          <div><Label>حد تطبيق الخصم والحسم (ج.م)</Label><Input type="number" value={form.wht_threshold} onChange={(e) => set('wht_threshold', Number(e.target.value))} /></div>
          <div className="flex items-center justify-between rounded border p-3">
            <div><div className="font-medium">تطبيق رسم الدمغة</div><div className="text-xs text-muted-foreground">يُحسب على صافي الفاتورة</div></div>
            <Switch checked={form.stamp_enabled} onCheckedChange={(v) => set('stamp_enabled', v)} />
          </div>
          <div><Label>نسبة الدمغة %</Label><Input type="number" step="0.01" value={form.stamp_pct} onChange={(e) => set('stamp_pct', Number(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>نسب السماح والمطابقة</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>نسبة السماح في فرق الوزن %</Label>
            <Input type="number" step="0.1" value={form.weight_tolerance_pct} onChange={(e) => set('weight_tolerance_pct', Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">فرق الميزان بين القائم والفارغ وأسطر الاستلام أو التسليم.</p>
          </div>
          <div>
            <Label>نسبة السماح في فرق السعر %</Label>
            <Input type="number" step="0.1" value={form.price_tolerance_pct} onChange={(e) => set('price_tolerance_pct', Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">فرق سعر فاتورة المورد عن سعر أمر الشراء (المطابقة الثلاثية).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قواعد الحماية المالية</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded border p-3">
            <div><div className="font-medium">منع تجاوز حد ائتمان العميل</div><div className="text-xs text-muted-foreground">يرفض أمر البيع إذا تجاوز الرصيد + قيمة الأمر حد الائتمان.</div></div>
            <Switch checked={form.enforce_credit_limit} onCheckedChange={(v) => set('enforce_credit_limit', v)} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <div><div className="font-medium">منع الاستلام بأكثر من كمية أمر الشراء</div><div className="text-xs text-muted-foreground">يمنع دخول كميات غير متعاقد عليها للمخزن.</div></div>
            <Switch checked={form.block_over_receipt} onCheckedChange={(v) => set('block_over_receipt', v)} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <div><div className="font-medium">إظهار حقول الفاتورة الإلكترونية</div><div className="text-xs text-muted-foreground">البطاقة الضريبية وأكواد الأصناف للتوافق مع منظومة الفاتورة المصرية.</div></div>
            <Switch checked={form.einvoice_fields_enabled} onCheckedChange={(v) => set('einvoice_fields_enabled', v)} />
          </div>
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
