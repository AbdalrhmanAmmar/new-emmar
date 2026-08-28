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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Lock, Unlock, CheckCircle2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Closing {
  id: string; period_year: number; period_month: number;
  closing_type: 'monthly' | 'quarterly' | 'yearly';
  status: 'open' | 'in_review' | 'closed' | 'reopened';
  checklist: Record<string, boolean>;
  closed_at?: string | null;
  closed_by?: string | null;
  notes?: string | null;
}

const CHECKLIST_ITEMS = [
  { key: 'bank_reconciliation', label: 'تسوية جميع الحسابات البنكية' },
  { key: 'ar_reconciliation', label: 'تسوية أرصدة العملاء (AR)' },
  { key: 'ap_reconciliation', label: 'تسوية أرصدة الموردين (AP)' },
  { key: 'inventory_valuation', label: 'إقفال تقييم المخزون (WAC/FIFO)' },
  { key: 'depreciation_posted', label: 'ترحيل قيود الإهلاك الشهرية' },
  { key: 'payroll_posted', label: 'ترحيل قيود الرواتب' },
  { key: 'accruals_prepaid', label: 'تسوية المستحقات والمصروفات المدفوعة مقدماً' },
  { key: 'wip_poc_posted', label: 'تحديث WIP / POC للمشاريع' },
  { key: 'retention_reviewed', label: 'مراجعة ضمانات حسن التنفيذ' },
  { key: 'vat_return_filed', label: 'إعداد إقرار ضريبة القيمة المضافة' },
  { key: 'zatca_submissions', label: 'التحقق من إرسال جميع الفواتير لهيئة الزكاة' },
  { key: 'trial_balance_reviewed', label: 'مراجعة ميزان المراجعة' },
  { key: 'management_reports', label: 'إصدار تقارير الإدارة (P&L، Balance Sheet)' },
];

const statusLabels: Record<string, string> = { open: 'مفتوحة', in_review: 'قيد المراجعة', closed: 'مقفلة', reopened: 'أُعيد فتحها' };
const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', in_review: 'bg-amber-100 text-amber-700',
  closed: 'bg-emerald-100 text-emerald-700', reopened: 'bg-orange-100 text-orange-700',
};
const typeLabels: Record<string, string> = { monthly: 'شهري', quarterly: 'ربع سنوي', yearly: 'سنوي' };

const now = new Date();
const emptyChecklist = () => Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.key, false])) as Record<string, boolean>;
const empty = (): Partial<Closing> => ({
  period_year: now.getFullYear(), period_month: now.getMonth() + 1,
  closing_type: 'monthly', status: 'open', checklist: emptyChecklist(),
});

const AccPeriodClosingPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_period_closing' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_period_closing' as any, 'edit');
  const canClose = isAdmin || hasPermission('accounting_period_closing' as any, 'approve');
  const canDelete = isAdmin || hasPermission('accounting_period_closing' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Closing>>(empty());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_period_closing'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_period_closing').select('*')
        .order('period_year', { ascending: false }).order('period_month', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({ ...r, checklist: r.checklist || emptyChecklist() })) as Closing[];
    },
  });

  const totals = useMemo(() => ({
    total: rows.length,
    open: rows.filter(r => r.status === 'open').length,
    review: rows.filter(r => r.status === 'in_review').length,
    closed: rows.filter(r => r.status === 'closed').length,
  }), [rows]);

  const progress = useMemo(() => {
    const cl = form.checklist || {};
    const done = CHECKLIST_ITEMS.filter(i => cl[i.key]).length;
    return { done, total: CHECKLIST_ITEMS.length, pct: Math.round(done / CHECKLIST_ITEMS.length * 100) };
  }, [form.checklist]);

  const openNew = () => { setForm(empty()); setOpen(true); };
  const openEdit = (r: Closing) => { setForm({ ...r, checklist: { ...emptyChecklist(), ...(r.checklist || {}) } }); setOpen(true); };

  const save = async () => {
    try {
      const payload: any = { ...form };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_period_closing').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_period_closing').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_period_closing'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const closePeriod = async (r: Closing) => {
    const cl = r.checklist || {};
    const done = CHECKLIST_ITEMS.filter(i => cl[i.key]).length;
    if (done < CHECKLIST_ITEMS.length) {
      if (!confirm(`لم تكتمل جميع بنود القائمة (${done}/${CHECKLIST_ITEMS.length}). هل تريد المتابعة وإقفال الفترة؟`)) return;
    } else {
      if (!confirm(`إقفال الفترة ${r.period_year}/${r.period_month}؟ لن يمكن إدخال قيود بعدها إلا بإعادة الفتح.`)) return;
    }
    const { error } = await (supabase as any).from('acc_period_closing').update({
      status: 'closed', closed_at: new Date().toISOString(), closed_by: user?.id,
    }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم إقفال الفترة');
    qc.invalidateQueries({ queryKey: ['acc_period_closing'] });
  };

  const reopen = async (r: Closing) => {
    if (!confirm(`إعادة فتح الفترة ${r.period_year}/${r.period_month}؟`)) return;
    const { error } = await (supabase as any).from('acc_period_closing').update({
      status: 'reopened', closed_at: null, closed_by: null,
    }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تمت إعادة فتح الفترة');
    qc.invalidateQueries({ queryKey: ['acc_period_closing'] });
  };

  const toReview = async (r: Closing) => {
    const { error } = await (supabase as any).from('acc_period_closing').update({ status: 'in_review' }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('انتقلت إلى قيد المراجعة');
    qc.invalidateQueries({ queryKey: ['acc_period_closing'] });
  };

  const del = async (r: Closing) => {
    if (r.status === 'closed') { toast.error('لا يمكن حذف فترة مقفلة — أعد فتحها أولاً'); return; }
    if (!confirm(`حذف سجل الفترة ${r.period_year}/${r.period_month}؟`)) return;
    const { error } = await (supabase as any).from('acc_period_closing').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_period_closing'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">إقفال نهاية الفترة (Period Closing)</h1>
            <p className="text-xs text-muted-foreground">قائمة تحقق شاملة لإقفال الفترات المحاسبية شهرياً وسنوياً</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="إقفالات الفترات"
            headers={['السنة', 'الشهر', 'النوع', 'الحالة', 'تاريخ الإقفال']}
            rows={rows.map(r => [String(r.period_year), String(r.period_month), typeLabels[r.closing_type], statusLabels[r.status], r.closed_at || '-'])}
            kpis={[
              { label: 'الإجمالي', value: totals.total },
              { label: 'مفتوحة', value: totals.open },
              { label: 'قيد المراجعة', value: totals.review },
              { label: 'مقفلة', value: totals.closed },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> فترة جديدة</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-2xl font-bold">{totals.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مفتوحة</div><div className="text-2xl font-bold text-blue-600">{totals.open}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">قيد المراجعة</div><div className="text-2xl font-bold text-amber-600">{totals.review}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مقفلة</div><div className="text-2xl font-bold text-emerald-600">{totals.closed}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>سجل الإقفالات ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>الفترة</TableHead><TableHead>النوع</TableHead>
              <TableHead>إنجاز القائمة</TableHead>
              <TableHead>الحالة</TableHead><TableHead>تاريخ الإقفال</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">لا توجد فترات مسجلة</TableCell></TableRow>
                  : rows.map(r => {
                    const cl = r.checklist || {};
                    const done = CHECKLIST_ITEMS.filter(i => cl[i.key]).length;
                    const pct = Math.round(done / CHECKLIST_ITEMS.length * 100);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.period_year}/{String(r.period_month).padStart(2, '0')}</TableCell>
                        <TableCell><Badge variant="outline">{typeLabels[r.closing_type]}</Badge></TableCell>
                        <TableCell>
                          <div className="w-40">
                            <div className="text-xs mb-1">{done}/{CHECKLIST_ITEMS.length} ({pct}%)</div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full ${pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                        <TableCell className="text-xs">{r.closed_at ? new Date(r.closed_at).toLocaleDateString('ar-EG') : '-'}</TableCell>
                        <TableCell>
                          <RowActions>
                            {canEdit && r.status === 'open' && <Button size="sm" variant="ghost" title="إرسال للمراجعة" onClick={() => toReview(r)}><CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /></Button>}
                            {canClose && (r.status === 'in_review' || r.status === 'open' || r.status === 'reopened') && <Button size="sm" variant="ghost" title="إقفال الفترة" onClick={() => closePeriod(r)}><Lock className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                            {canClose && r.status === 'closed' && <Button size="sm" variant="ghost" title="إعادة فتح" onClick={() => reopen(r)}><Unlock className="w-3.5 h-3.5 text-orange-600" /></Button>}
                            {canEdit && r.status !== 'closed' && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                            {canDelete && r.status !== 'closed' && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
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
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? `تعديل فترة ${form.period_year}/${form.period_month}` : 'فترة إقفال جديدة'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>السنة</Label>
              <Select value={String(form.period_year || now.getFullYear())} onValueChange={v => setForm({ ...form, period_year: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الشهر</Label>
              <Select value={String(form.period_month || now.getMonth() + 1)} onValueChange={v => setForm({ ...form, period_month: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>نوع الإقفال</Label>
              <Select value={form.closing_type || 'monthly'} onValueChange={v => setForm({ ...form, closing_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">قائمة التحقق للإقفال</h3>
              <Badge className={progress.pct === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                {progress.done}/{progress.total} ({progress.pct}%)
              </Badge>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
              <div className={`h-full ${progress.pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress.pct}%` }} />
            </div>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map(item => (
                <div key={item.key} className="flex items-center gap-2 p-2 hover:bg-muted/40 rounded">
                  <Checkbox
                    id={item.key}
                    checked={!!(form.checklist || {})[item.key]}
                    onCheckedChange={(v) => setForm({ ...form, checklist: { ...(form.checklist || emptyChecklist()), [item.key]: !!v } })}
                  />
                  <Label htmlFor={item.key} className="text-sm cursor-pointer flex-1">{item.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5"><Label>ملاحظات</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccPeriodClosingPage;
