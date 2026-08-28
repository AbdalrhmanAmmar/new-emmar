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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Entry {
  id: string; entry_number: string; entry_date: string; entry_type: 'withheld' | 'released' | 'forfeited';
  project_name: string; customer_name?: string | null;
  amount: number; currency: string;
  release_stage?: string | null; scheduled_release_date?: string | null;
  released_at?: string | null; bank_guarantee_ref?: string | null; guarantee_expiry?: string | null;
  status: string; notes?: string | null;
}

const typeLabels: Record<string, string> = { withheld: 'محتجز', released: 'مُفرج', forfeited: 'مصادر' };
const typeColors: Record<string, string> = {
  withheld: 'bg-orange-100 text-orange-700',
  released: 'bg-emerald-100 text-emerald-700',
  forfeited: 'bg-red-100 text-red-700',
};
const stageLabels: Record<string, string> = { first_half: 'دفعة أولى (50%)', second_half: 'دفعة ثانية (50%)', full: 'كامل', other: 'أخرى' };
const statusLabels: Record<string, string> = { active: 'نشط', released: 'مُفرج عنه', forfeited: 'مصادر', cancelled: 'ملغي' };
const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700', released: 'bg-emerald-100 text-emerald-700',
  forfeited: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-700',
};

const emptyEntry = (): Partial<Entry> => ({
  entry_number: `RET-${Date.now().toString().slice(-6)}`,
  entry_date: new Date().toISOString().slice(0, 10),
  entry_type: 'withheld', project_name: '', amount: 0, currency: 'EGP', status: 'active',
});

const fmt = (n: number) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccRetentionPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_retention' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_retention' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_retention' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Entry>>(emptyEntry());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_retention_entries'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_retention_entries').select('*').order('entry_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Entry[];
    },
  });

  const totals = useMemo(() => {
    const withheld = rows.filter(r => r.status === 'active' && r.entry_type === 'withheld').reduce((s, r) => s + Number(r.amount || 0), 0);
    const released = rows.filter(r => r.entry_type === 'released' || r.status === 'released').reduce((s, r) => s + Number(r.amount || 0), 0);
    const soonDue = rows.filter(r => r.status === 'active' && r.scheduled_release_date && new Date(r.scheduled_release_date) < new Date(Date.now() + 30 * 86400000)).length;
    return { count: rows.length, withheld, released, soonDue };
  }, [rows]);

  const openNew = () => { setForm(emptyEntry()); setOpen(true); };
  const openEdit = (r: Entry) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.project_name) { toast.error('اسم المشروع مطلوب'); return; }
    if (!Number(form.amount || 0)) { toast.error('المبلغ مطلوب'); return; }
    try {
      const payload: any = { ...form };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_retention_entries').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_retention_entries').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_retention_entries'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const release = async (r: Entry) => {
    if (!confirm(`الإفراج عن ${fmt(r.amount)} من ضمان مشروع ${r.project_name}؟`)) return;
    const { error } = await (supabase as any).from('acc_retention_entries').update({
      status: 'released', entry_type: 'released', released_at: new Date().toISOString(), released_by: user?.id,
    }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الإفراج');
    qc.invalidateQueries({ queryKey: ['acc_retention_entries'] });
  };

  const del = async (r: Entry) => {
    if (!confirm(`حذف ${r.entry_number}؟`)) return;
    const { error } = await (supabase as any).from('acc_retention_entries').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_retention_entries'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">ضمان حسن التنفيذ (Retention)</h1>
            <p className="text-xs text-muted-foreground">إدارة استقطاعات وإفراج ضمان الأداء والصيانة لكل مشروع</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="سجل ضمان حسن التنفيذ"
            headers={['رقم', 'التاريخ', 'المشروع', 'العميل', 'النوع', 'المبلغ', 'الحالة', 'استحقاق الإفراج']}
            rows={rows.map(r => [r.entry_number, r.entry_date, r.project_name, r.customer_name || '-', typeLabels[r.entry_type], fmt(r.amount), statusLabels[r.status], r.scheduled_release_date || '-'])}
            kpis={[
              { label: 'الإجمالي', value: rows.length },
              { label: 'محتجز', value: fmt(totals.withheld) },
              { label: 'مُفرج عنه', value: fmt(totals.released) },
              { label: 'يستحق خلال 30 يوم', value: totals.soonDue },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> قيد جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي القيود</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">ضمان محتجز نشط</div><div className="text-lg font-bold text-orange-600">{fmt(totals.withheld)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مُفرج عنه</div><div className="text-lg font-bold text-emerald-600">{fmt(totals.released)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">يستحق خلال 30 يوم</div><div className="text-2xl font-bold text-blue-600">{totals.soonDue}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>سجل الضمانات ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>رقم</TableHead><TableHead>التاريخ</TableHead>
              <TableHead>المشروع</TableHead><TableHead>العميل</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead>مرحلة الإفراج</TableHead>
              <TableHead>استحقاق</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={10} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">لا توجد قيود</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.entry_number}</TableCell>
                      <TableCell className="text-xs">{r.entry_date}</TableCell>
                      <TableCell className="font-medium">{r.project_name}</TableCell>
                      <TableCell className="text-xs">{r.customer_name || '-'}</TableCell>
                      <TableCell><Badge className={typeColors[r.entry_type]}>{typeLabels[r.entry_type]}</Badge></TableCell>
                      <TableCell className="text-right font-mono font-bold">{fmt(r.amount)}</TableCell>
                      <TableCell className="text-xs">{r.release_stage ? stageLabels[r.release_stage] : '-'}</TableCell>
                      <TableCell className="text-xs">{r.scheduled_release_date || '-'}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && r.status === 'active' && <Button size="sm" variant="ghost" title="إفراج" onClick={() => release(r)}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                          {canEdit && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                          {canDelete && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.entry_number}` : 'قيد ضمان جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>رقم القيد *</Label><Input value={form.entry_number || ''} onChange={e => setForm({ ...form, entry_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>التاريخ</Label><Input type="date" value={form.entry_date || ''} onChange={e => setForm({ ...form, entry_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>النوع</Label>
              <Select value={form.entry_type || 'withheld'} onValueChange={v => setForm({ ...form, entry_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2"><Label>المشروع *</Label><Input value={form.project_name || ''} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>العميل</Label><Input value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المبلغ *</Label><Input type="number" step="0.01" value={form.amount ?? 0} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={form.currency || 'EGP'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>مرحلة الإفراج</Label>
              <Select value={form.release_stage || ''} onValueChange={v => setForm({ ...form, release_stage: v })}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>{Object.entries(stageLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>تاريخ استحقاق الإفراج</Label><Input type="date" value={form.scheduled_release_date || ''} onChange={e => setForm({ ...form, scheduled_release_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>مرجع الضمان البنكي</Label><Input value={form.bank_guarantee_ref || ''} onChange={e => setForm({ ...form, bank_guarantee_ref: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>انتهاء صلاحية الضمان</Label><Input type="date" value={form.guarantee_expiry || ''} onChange={e => setForm({ ...form, guarantee_expiry: e.target.value })} /></div>
            <div className="md:col-span-3 space-y-1.5"><Label>ملاحظات</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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

export default AccRetentionPage;
