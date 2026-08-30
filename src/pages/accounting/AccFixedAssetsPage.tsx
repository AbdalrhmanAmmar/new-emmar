import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/accounting/FormPage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Building2, Play } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Asset {
  id: string; code: string; name_ar: string; category?: string | null;
  acquisition_date: string; acquisition_cost: number; salvage_value: number;
  useful_life_months: number; depreciation_method: 'straight' | 'declining' | 'none';
  declining_rate?: number | null; location?: string | null; serial_number?: string | null;
  supplier?: string | null; status: string; accumulated_depreciation: number;
  last_depreciation_date?: string | null; disposal_date?: string | null; disposal_value?: number | null;
  notes?: string | null;
}

const statusLabels: Record<string, string> = { in_use: 'قيد الاستخدام', disposed: 'تم التخلص', sold: 'مباع', fully_depreciated: 'مستهلك كليًا' };
const methodLabels: Record<string, string> = { straight: 'قسط ثابت', declining: 'قسط متناقص', none: 'بدون إهلاك' };

const emptyForm = (): Partial<Asset> => ({
  code: '', name_ar: '', acquisition_date: new Date().toISOString().slice(0, 10),
  acquisition_cost: 0, salvage_value: 0, useful_life_months: 60, depreciation_method: 'straight',
  status: 'in_use', accumulated_depreciation: 0,
});

const monthlyDepreciation = (a: Asset): number => {
  if (a.depreciation_method === 'none' || a.useful_life_months <= 0) return 0;
  const depreciable = Math.max(0, a.acquisition_cost - a.salvage_value);
  if (a.depreciation_method === 'straight') return depreciable / a.useful_life_months;
  const rate = (a.declining_rate ?? 0) / 100;
  const nbv = Math.max(0, a.acquisition_cost - a.accumulated_depreciation);
  return (nbv * rate) / 12;
};

const AccFixedAssetsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_fixed_assets' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_fixed_assets' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_fixed_assets' as any, 'delete');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Asset>>(emptyForm());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_fixed_assets'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_fixed_assets').select('*').order('code');
      if (error) throw error;
      return (data || []) as Asset[];
    },
  });

  const totals = useMemo(() => ({
    count: rows.length,
    cost: rows.reduce((s, r) => s + Number(r.acquisition_cost || 0), 0),
    accum: rows.reduce((s, r) => s + Number(r.accumulated_depreciation || 0), 0),
    nbv: rows.reduce((s, r) => s + Number(r.acquisition_cost || 0) - Number(r.accumulated_depreciation || 0), 0),
  }), [rows]);

  const openNew = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (r: Asset) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.code || !form.name_ar || !form.acquisition_date) { toast.error('الكود والاسم وتاريخ الشراء مطلوبة'); return; }
    try {
      const payload: any = {
        ...form,
        acquisition_cost: Number(form.acquisition_cost || 0),
        salvage_value: Number(form.salvage_value || 0),
        useful_life_months: Number(form.useful_life_months || 0),
        declining_rate: form.declining_rate != null ? Number(form.declining_rate) : null,
        accumulated_depreciation: Number(form.accumulated_depreciation || 0),
      };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_fixed_assets').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_fixed_assets').insert(payload);
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_fixed_assets'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const del = async (r: Asset) => {
    if (!confirm(`حذف "${r.name_ar}"؟`)) return;
    const { error } = await (supabase as any).from('acc_fixed_assets').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_fixed_assets'] });
  };

  const runDepreciation = async (r: Asset) => {
    const amount = monthlyDepreciation(r);
    if (amount <= 0) { toast.error('لا يوجد إهلاك لهذا الأصل'); return; }
    const today = new Date();
    const period_month = today.getMonth() + 1;
    const period_year = today.getFullYear();
    const remainingDepreciable = Math.max(0, r.acquisition_cost - r.salvage_value - r.accumulated_depreciation);
    const finalAmount = Math.min(amount, remainingDepreciable);
    if (finalAmount <= 0) { toast.error('الأصل مستهلك بالكامل'); return; }
    const accumulated_after = Number(r.accumulated_depreciation) + finalAmount;
    const net_book_value = Number(r.acquisition_cost) - accumulated_after;

    if (!confirm(`ترحيل إهلاك شهر ${period_month}/${period_year} بمبلغ ${finalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} جنيه؟`)) return;
    try {
      const { error: e1 } = await (supabase as any).from('acc_depreciation_entries').insert({
        fixed_asset_id: r.id, period_date: today.toISOString().slice(0, 10),
        period_month, period_year, amount: finalAmount,
        accumulated_after, net_book_value, posted: false,
      });
      if (e1) throw e1;
      const newStatus = net_book_value <= r.salvage_value ? 'fully_depreciated' : r.status;
      const { error: e2 } = await (supabase as any).from('acc_fixed_assets').update({
        accumulated_depreciation: accumulated_after,
        last_depreciation_date: today.toISOString().slice(0, 10),
        status: newStatus,
      }).eq('id', r.id);
      if (e2) throw e2;
      toast.success('تم ترحيل الإهلاك');
      qc.invalidateQueries({ queryKey: ['acc_fixed_assets'] });
    } catch (e: any) { toast.error(e.message || 'فشل الترحيل'); }
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الأصول الثابتة</h1>
            <p className="text-xs text-muted-foreground">سجل الأصول مع الإهلاك الشهري (قسط ثابت أو متناقص) وترحيل تلقائي</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="سجل الأصول الثابتة"
            headers={['الكود', 'الاسم', 'التصنيف', 'تاريخ الشراء', 'التكلفة', 'مجمع الإهلاك', 'صافي القيمة الدفترية', 'الحالة']}
            rows={rows.map(r => [r.code, r.name_ar, r.category || '-', r.acquisition_date, Number(r.acquisition_cost).toLocaleString('en-GB', { minimumFractionDigits: 2 }), Number(r.accumulated_depreciation).toLocaleString('en-GB', { minimumFractionDigits: 2 }), (Number(r.acquisition_cost) - Number(r.accumulated_depreciation)).toLocaleString('en-GB', { minimumFractionDigits: 2 }), statusLabels[r.status] || r.status])}
            kpis={[{ label: 'العدد', value: totals.count }, { label: 'التكلفة', value: totals.cost.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }, { label: 'مجمع الإهلاك', value: totals.accum.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }, { label: 'صافي القيمة', value: totals.nbv.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> أصل جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">عدد الأصول</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">التكلفة الإجمالية</div><div className="text-lg font-bold">{totals.cost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مجمع الإهلاك</div><div className="text-lg font-bold text-orange-600">{totals.accum.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">صافي القيمة الدفترية</div><div className="text-lg font-bold text-primary">{totals.nbv.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الأصول ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>التصنيف</TableHead>
              <TableHead>تاريخ الشراء</TableHead><TableHead className="text-right">التكلفة</TableHead>
              <TableHead className="text-right">مجمع الإهلاك</TableHead>
              <TableHead className="text-right">صافي القيمة</TableHead>
              <TableHead className="text-right">إهلاك شهري</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={10} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">لا توجد أصول</TableCell></TableRow>
                  : rows.map(r => {
                    const nbv = Number(r.acquisition_cost) - Number(r.accumulated_depreciation);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.code}</TableCell>
                        <TableCell className="font-medium">{r.name_ar}</TableCell>
                        <TableCell>{r.category || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.acquisition_date}</TableCell>
                        <TableCell className="text-right font-mono">{Number(r.acquisition_cost).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{Number(r.accumulated_depreciation).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{nbv.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{monthlyDepreciation(r).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{r.status === 'in_use' ? <Badge className="bg-emerald-100 text-emerald-700">{statusLabels[r.status]}</Badge> : <Badge variant="secondary">{statusLabels[r.status] || r.status}</Badge>}</TableCell>
                        <TableCell>
                          <RowActions>
                            {canEdit && r.status === 'in_use' && (
                              <Button size="sm" variant="ghost" title="ترحيل إهلاك الشهر" onClick={() => runDepreciation(r)}><Play className="w-3.5 h-3.5 text-emerald-600" /></Button>
                            )}
                            {canEdit && <Button title="تعديل" aria-label="تعديل" size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                            {canDelete && <Button title="حذف" aria-label="حذف" size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'تعديل أصل' : 'أصل جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>الكود *</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الاسم *</Label><Input value={form.name_ar || ''} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>التصنيف</Label><Input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="مركبات، أجهزة، أثاث..." /></div>
            <div className="space-y-1.5"><Label>تاريخ الشراء *</Label><Input type="date" value={form.acquisition_date || ''} onChange={e => setForm({ ...form, acquisition_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>تكلفة الشراء</Label><Input type="number" step="0.01" value={form.acquisition_cost ?? 0} onChange={e => setForm({ ...form, acquisition_cost: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>قيمة الخردة</Label><Input type="number" step="0.01" value={form.salvage_value ?? 0} onChange={e => setForm({ ...form, salvage_value: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>العمر الإنتاجي (شهر)</Label><Input type="number" value={form.useful_life_months ?? 60} onChange={e => setForm({ ...form, useful_life_months: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>طريقة الإهلاك</Label>
              <Select value={form.depreciation_method || 'straight'} onValueChange={v => setForm({ ...form, depreciation_method: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(methodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.depreciation_method === 'declining' && (
              <div className="space-y-1.5"><Label>معدل الإهلاك السنوي %</Label><Input type="number" step="0.01" value={form.declining_rate ?? 0} onChange={e => setForm({ ...form, declining_rate: Number(e.target.value) })} /></div>
            )}
            <div className="space-y-1.5"><Label>الموقع</Label><Input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الرقم التسلسلي</Label><Input value={form.serial_number || ''} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المورد</Label><Input value={form.supplier || ''} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>مجمع الإهلاك (افتتاحي)</Label><Input type="number" step="0.01" value={form.accumulated_depreciation ?? 0} onChange={e => setForm({ ...form, accumulated_depreciation: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={form.status || 'in_use'} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
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

export default AccFixedAssetsPage;
