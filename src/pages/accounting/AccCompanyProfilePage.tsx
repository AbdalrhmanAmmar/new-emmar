import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyProfile {
  id?: string;
  legal_name_ar: string;
  legal_name_en?: string | null;
  vat_number: string;
  cr_number: string;
  short_address?: string | null;
  building_number?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  postal_code?: string | null;
  additional_number?: string | null;
  country_code: string;
  phone?: string | null;
  email?: string | null;
  is_group_vat: boolean;
}

const emptyProfile: CompanyProfile = {
  legal_name_ar: '', legal_name_en: '', vat_number: '', cr_number: '',
  short_address: '', building_number: '', street: '', district: '',
  city: '', postal_code: '', additional_number: '', country_code: 'SA',
  phone: '', email: '', is_group_vat: false,
};

const AccCompanyProfilePage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<CompanyProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);

  const canView = isAdmin || hasPermission('accounting_setup' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_setup' as any, 'edit');

  const { data, isLoading } = useQuery({
    queryKey: ['acc_company_profile'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('acc_company_profile').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data as CompanyProfile | null;
    },
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const validateVat = (v: string) => /^\d{15}$/.test(v);

  const handleSave = async () => {
    if (!form.legal_name_ar || !form.vat_number || !form.cr_number) {
      toast.error('الاسم القانوني والرقم الضريبي والسجل التجاري مطلوبة');
      return;
    }
    if (!validateVat(form.vat_number)) {
      toast.error('الرقم الضريبي يجب أن يكون 15 رقم');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      const { error } = form.id
        ? await (supabase as any).from('acc_company_profile').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_company_profile').insert(payload);
      if (error) throw error;
      toast.success('تم حفظ بيانات المنشأة');
      qc.invalidateQueries({ queryKey: ['acc_company_profile'] });
    } catch (e: any) {
      toast.error(e.message || 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  const set = <K extends keyof CompanyProfile>(k: K, v: CompanyProfile[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">بيانات المنشأة</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        هذه البيانات تظهر على فواتير البيع وأوامر الشراء والتقارير الرسمية — تأكد من مطابقتها للسجل التجاري والبطاقة الضريبية المصرية.
      </p>

      <Card>
        <CardHeader><CardTitle>البيانات القانونية والضريبية</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="الاسم القانوني (عربي) *"><Input value={form.legal_name_ar} onChange={e => set('legal_name_ar', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="الاسم القانوني (إنجليزي)"><Input value={form.legal_name_en || ''} onChange={e => set('legal_name_en', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="الرقم الضريبي (البطاقة الضريبية) *"><Input value={form.vat_number} onChange={e => set('vat_number', e.target.value)} disabled={!canEdit} placeholder="123-456-789" /></Field>
          <Field label="رقم السجل التجاري *"><Input value={form.cr_number} onChange={e => set('cr_number', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="رقم العنوان الوطني (Short)"><Input value={form.short_address || ''} onChange={e => set('short_address', e.target.value)} disabled={!canEdit} placeholder="RQYS3421" /></Field>
          <Field label="رقم إضافي"><Input value={form.additional_number || ''} onChange={e => set('additional_number', e.target.value)} disabled={!canEdit} /></Field>
          <div className="flex items-center gap-3 md:col-span-2">
            <Switch checked={form.is_group_vat} onCheckedChange={v => set('is_group_vat', v)} disabled={!canEdit} />
            <Label>مجموعة ضريبية (Group VAT)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>العنوان الوطني</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="رقم المبنى"><Input value={form.building_number || ''} onChange={e => set('building_number', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="الشارع"><Input value={form.street || ''} onChange={e => set('street', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="الحي"><Input value={form.district || ''} onChange={e => set('district', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="المدينة"><Input value={form.city || ''} onChange={e => set('city', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="الرمز البريدي"><Input value={form.postal_code || ''} onChange={e => set('postal_code', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="الدولة"><Input value={form.country_code} onChange={e => set('country_code', e.target.value)} disabled={!canEdit} maxLength={2} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>معلومات الاتصال</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="الهاتف"><Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} disabled={!canEdit} /></Field>
          <Field label="البريد الإلكتروني"><Input value={form.email || ''} onChange={e => set('email', e.target.value)} disabled={!canEdit} type="email" /></Field>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || isLoading} className="min-w-[140px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-2" /> حفظ البيانات</>}
          </Button>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    {children}
  </div>
);

export default AccCompanyProfilePage;
