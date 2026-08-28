import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

interface Party {
  id: string; code: string; name_ar: string; name_en?: string | null;
  vat_number?: string | null; cr_number?: string | null;
  email?: string | null; phone?: string | null; city?: string | null;
  contact_person?: string | null; payment_terms_days?: number | null;
  credit_limit?: number | null; opening_balance: number; opening_date?: string | null;
  category?: string | null; gl_account_code?: string | null; status: string; notes?: string | null;
  bank_name?: string | null; bank_account?: string | null; iban?: string | null;
  [k: string]: any;
}

interface Props {
  table: 'acc_customers' | 'acc_vendors';
  title: string;
  subtitle: string;
  typeField: 'customer_type' | 'vendor_type';
  moduleKey: 'accounting_customers' | 'accounting_vendors';
  showBankDetails?: boolean;
  icon: React.ReactNode;
}

const typeLabels: Record<string, string> = { company: 'شركة', individual: 'فرد', government: 'جهة حكومية' };

const PartyMasterPage: React.FC<Props> = ({ table, title, subtitle, typeField, moduleKey, showBankDetails, icon }) => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission(moduleKey as any, 'view');
  const canEdit = isAdmin || hasPermission(moduleKey as any, 'edit');
  const canDelete = isAdmin || hasPermission(moduleKey as any, 'delete');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Partial<Party>>({ code: '', name_ar: '', [typeField]: 'company', opening_balance: 0, status: 'active', payment_terms_days: 30, credit_limit: 0 });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(table).select('*').order('code');
      if (error) throw error;
      return (data || []) as Party[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.code, r.name_ar, r.name_en, r.vat_number, r.phone, r.email].some(v => (v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const totals = useMemo(() => ({
    count: rows.length,
    active: rows.filter(r => r.status === 'active').length,
    balance: rows.reduce((s, r) => s + Number(r.opening_balance || 0), 0),
  }), [rows]);

  const openNew = () => { setForm({ code: '', name_ar: '', [typeField]: 'company', opening_balance: 0, status: 'active', payment_terms_days: 30, credit_limit: 0 }); setOpen(true); };
  const openEdit = (r: Party) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.code || !form.name_ar) { toast.error('الكود والاسم مطلوبان'); return; }
    try {
      const payload: any = { ...form, opening_balance: Number(form.opening_balance || 0), credit_limit: Number(form.credit_limit || 0), payment_terms_days: Number(form.payment_terms_days || 0) };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from(table).update(payload).eq('id', form.id)
        : await (supabase as any).from(table).insert(payload);
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: [table] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const del = async (r: Party) => {
    if (!confirm(`حذف "${r.name_ar}"؟`)) return;
    const { error } = await (supabase as any).from(table).delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: [table] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="text-primary">{icon}</div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title={title}
            headers={['الكود', 'الاسم', 'النوع', 'الرقم الضريبي', 'الجوال', 'المدينة', 'شروط السداد', 'الرصيد الافتتاحي', 'الحالة']}
            rows={filtered.map(r => [r.code, r.name_ar, typeLabels[r[typeField]] || '-', r.vat_number || '-', r.phone || '-', r.city || '-', r.payment_terms_days ? `${r.payment_terms_days} يوم` : '-', Number(r.opening_balance).toLocaleString('ar-EG', { minimumFractionDigits: 2 }), r.status === 'active' ? 'نشط' : r.status === 'blocked' ? 'محظور' : 'موقوف'])}
            kpis={[{ label: 'العدد', value: totals.count }, { label: 'نشط', value: totals.active }, { label: 'إجمالي الأرصدة', value: totals.balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) }]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> إضافة</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">نشط</div><div className="text-2xl font-bold text-emerald-600">{totals.active}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الأرصدة الافتتاحية (SAR)</div><div className="text-2xl font-bold text-primary">{totals.balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>القائمة ({filtered.length})</CardTitle>
          <div className="relative w-72"><Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>النوع</TableHead>
              <TableHead>الرقم الضريبي</TableHead><TableHead>الجوال</TableHead>
              <TableHead>شروط السداد</TableHead><TableHead className="text-right">الرصيد الافتتاحي</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">لا توجد بيانات</TableCell></TableRow>
                  : filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name_ar}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[r[typeField]] || r[typeField]}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.vat_number || '-'}</TableCell>
                      <TableCell>{r.phone || '-'}</TableCell>
                      <TableCell>{r.payment_terms_days ? `${r.payment_terms_days} يوم` : '-'}</TableCell>
                      <TableCell className="text-right font-mono">{Number(r.opening_balance).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{r.status === 'active' ? <Badge className="bg-emerald-100 text-emerald-700">نشط</Badge> : r.status === 'blocked' ? <Badge variant="destructive">محظور</Badge> : <Badge variant="secondary">موقوف</Badge>}</TableCell>
                      <TableCell>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                            {canDelete && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'تعديل' : 'إضافة جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>الكود *</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الاسم بالعربي *</Label><Input value={form.name_ar || ''} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الاسم بالإنجليزي</Label><Input value={form.name_en || ''} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>النوع</Label>
              <Select value={form[typeField] || 'company'} onValueChange={v => setForm({ ...form, [typeField]: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الرقم الضريبي</Label><Input value={form.vat_number || ''} onChange={e => setForm({ ...form, vat_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>السجل التجاري</Label><Input value={form.cr_number || ''} onChange={e => setForm({ ...form, cr_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>البريد الإلكتروني</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الجوال</Label><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المدينة</Label><Input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>مسؤول التواصل</Label><Input value={form.contact_person || ''} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>شروط السداد (أيام)</Label><Input type="number" value={form.payment_terms_days ?? 30} onChange={e => setForm({ ...form, payment_terms_days: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الحد الائتماني</Label><Input type="number" step="0.01" value={form.credit_limit ?? 0} onChange={e => setForm({ ...form, credit_limit: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الرصيد الافتتاحي</Label><Input type="number" step="0.01" value={form.opening_balance ?? 0} onChange={e => setForm({ ...form, opening_balance: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>تاريخ الرصيد الافتتاحي</Label><Input type="date" value={form.opening_date || ''} onChange={e => setForm({ ...form, opening_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>التصنيف</Label><Input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>كود حساب دفتر الأستاذ</Label><Input value={form.gl_account_code || ''} onChange={e => setForm({ ...form, gl_account_code: e.target.value })} /></div>
            {showBankDetails && <>
              <div className="space-y-1.5"><Label>اسم البنك</Label><Input value={form.bank_name || ''} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>رقم الحساب البنكي</Label><Input value={form.bank_account || ''} onChange={e => setForm({ ...form, bank_account: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>IBAN</Label><Input value={form.iban || ''} onChange={e => setForm({ ...form, iban: e.target.value })} /></div>
            </>}
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="inactive">موقوف</SelectItem><SelectItem value="blocked">محظور</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5"><Label>ملاحظات</Label><Input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartyMasterPage;
