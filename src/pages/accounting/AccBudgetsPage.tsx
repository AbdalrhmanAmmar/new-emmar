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
import { Plus, Pencil, Trash2, Target, CheckCircle2, Lock, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

interface Budget {
  id: string; name: string; fiscal_year: number;
  budget_type: 'annual' | 'quarterly' | 'monthly' | 'project';
  currency: string; status: string; total_amount: number; notes?: string | null;
}
type MonthKey = 'jan'|'feb'|'mar'|'apr'|'may'|'jun'|'jul'|'aug'|'sep'|'oct'|'nov'|'dec';
interface BudgetLine {
  id?: string; budget_id?: string; gl_account_code: string; gl_account_name?: string;
  category?: string; annual_total: number; notes?: string;
  jan: number; feb: number; mar: number; apr: number; may: number; jun: number;
  jul: number; aug: number; sep: number; oct: number; nov: number; dec: number;
}

const monthKeys: MonthKey[] = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthLabels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const typeLabels: Record<string, string> = { annual: 'سنوية', quarterly: 'ربع سنوية', monthly: 'شهرية', project: 'مشروع' };
const statusLabels: Record<string, string> = { draft: 'مسودة', approved: 'معتمدة', locked: 'مُقفلة', closed: 'مغلقة' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', approved: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-blue-100 text-blue-700', closed: 'bg-gray-100 text-gray-700',
};

const emptyLine = (): BudgetLine => ({
  gl_account_code: '', gl_account_name: '', annual_total: 0,
  jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
});

const AccBudgetsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_budgets' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_budgets' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_budgets' as any, 'delete');
  const canApprove = isAdmin || hasPermission('accounting_budgets' as any, 'approve' as any);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Budget>>({ name: '', fiscal_year: new Date().getFullYear(), budget_type: 'annual', currency: 'SAR', status: 'draft', total_amount: 0 });
  const [lines, setLines] = useState<BudgetLine[]>([emptyLine()]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_budgets'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_budgets').select('*').order('fiscal_year', { ascending: false });
      if (error) throw error;
      return (data || []) as Budget[];
    },
  });

  const totals = useMemo(() => ({
    count: rows.length,
    approved: rows.filter(r => ['approved', 'locked'].includes(r.status)).length,
    current: rows.filter(r => r.fiscal_year === new Date().getFullYear()).reduce((s, r) => s + Number(r.total_amount || 0), 0),
  }), [rows]);

  const openNew = () => {
    setForm({ name: '', fiscal_year: new Date().getFullYear(), budget_type: 'annual', currency: 'SAR', status: 'draft', total_amount: 0 });
    setLines([emptyLine()]);
    setOpen(true);
  };
  const openEdit = async (r: Budget) => {
    setForm(r);
    const { data } = await (supabase as any).from('acc_budget_lines').select('*').eq('budget_id', r.id);
    setLines(((data && data.length ? data : [emptyLine()]) as BudgetLine[]));
    setOpen(true);
  };

  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<BudgetLine>) => setLines(ls => ls.map((l, idx) => {
    if (idx !== i) return l;
    const merged = { ...l, ...patch };
    const annual = monthKeys.reduce((s, k) => s + Number(merged[k] || 0), 0);
    return { ...merged, annual_total: annual };
  }));
  const distributeEvenly = (i: number) => setLines(ls => ls.map((l, idx) => {
    if (idx !== i) return l;
    const per = Number(l.annual_total || 0) / 12;
    const patch: any = {};
    monthKeys.forEach(k => patch[k] = per);
    return { ...l, ...patch };
  }));

  const grandTotal = useMemo(() => lines.reduce((s, l) => s + Number(l.annual_total || 0), 0), [lines]);

  const save = async () => {
    if (!form.name) { toast.error('اسم الموازنة مطلوب'); return; }
    try {
      const payload: any = { ...form, total_amount: grandTotal };
      delete payload.id;
      const { data: saved, error } = form.id
        ? await (supabase as any).from('acc_budgets').update(payload).eq('id', form.id).select('id').single()
        : await (supabase as any).from('acc_budgets').insert({ ...payload, created_by: user?.id }).select('id').single();
      if (error) throw error;
      const budgetId = saved?.id || form.id;
      await (supabase as any).from('acc_budget_lines').delete().eq('budget_id', budgetId);
      const validLines = lines.filter(l => (l.gl_account_code || '').trim());
      if (validLines.length) {
        const linesPayload = validLines.map(l => {
          const r: any = { budget_id: budgetId, gl_account_code: l.gl_account_code, gl_account_name: l.gl_account_name || null, category: l.category || null, annual_total: Number(l.annual_total || 0), notes: l.notes || null };
          monthKeys.forEach(k => r[k] = Number(l[k] || 0));
          return r;
        });
        const { error: le } = await (supabase as any).from('acc_budget_lines').insert(linesPayload);
        if (le) throw le;
      }
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_budgets'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const setStatus = async (r: Budget, next: string, extra: Record<string, any> = {}) => {
    const { error } = await (supabase as any).from('acc_budgets').update({ status: next, ...extra }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم تحديث الحالة');
    qc.invalidateQueries({ queryKey: ['acc_budgets'] });
  };

  const del = async (r: Budget) => {
    if (r.status === 'locked') { toast.error('لا يمكن حذف موازنة مُقفلة'); return; }
    if (!confirm(`حذف "${r.name}"؟`)) return;
    const { error } = await (supabase as any).from('acc_budgets').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_budgets'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الموازنات التقديرية</h1>
            <p className="text-xs text-muted-foreground">إعداد موازنات سنوية موزعة على 12 شهرًا لبنود حسابات الأستاذ</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="الموازنات التقديرية"
            headers={['الاسم', 'السنة المالية', 'النوع', 'العملة', 'الإجمالي التقديري', 'الحالة']}
            rows={rows.map(r => [r.name, r.fiscal_year, typeLabels[r.budget_type], r.currency, Number(r.total_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 }), statusLabels[r.status]])}
            kpis={[{ label: 'العدد', value: totals.count }, { label: 'معتمدة', value: totals.approved }, { label: 'إجمالي هذا العام', value: totals.current.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) }]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> موازنة جديدة</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الموازنات</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">معتمدة / مُقفلة</div><div className="text-2xl font-bold text-emerald-600">{totals.approved}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي موازنات {new Date().getFullYear()}</div><div className="text-lg font-bold text-primary">{totals.current.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الموازنات ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>الاسم</TableHead><TableHead>السنة</TableHead>
              <TableHead>النوع</TableHead><TableHead>العملة</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">لا توجد موازنات</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.fiscal_year}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[r.budget_type]}</Badge></TableCell>
                      <TableCell>{r.currency}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{Number(r.total_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {canApprove && r.status === 'draft' && <Button size="sm" variant="ghost" title="اعتماد" onClick={() => setStatus(r, 'approved', { approved_by: user?.id, approved_at: new Date().toISOString() })}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                          {canApprove && r.status === 'approved' && <Button size="sm" variant="ghost" title="قفل الموازنة" onClick={() => setStatus(r, 'locked')}><Lock className="w-3.5 h-3.5 text-blue-600" /></Button>}
                          {canApprove && r.status === 'locked' && <Button size="sm" variant="ghost" title="فتح للتعديل" onClick={() => setStatus(r, 'approved')}><FileEdit className="w-3.5 h-3.5 text-amber-600" /></Button>}
                          {canEdit && r.status !== 'locked' && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                          {canDelete && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.name}` : 'موازنة جديدة'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5 md:col-span-2"><Label>اسم الموازنة *</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>السنة المالية</Label><Input type="number" value={form.fiscal_year ?? new Date().getFullYear()} onChange={e => setForm({ ...form, fiscal_year: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>النوع</Label>
              <Select value={form.budget_type || 'annual'} onValueChange={v => setForm({ ...form, budget_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={form.currency || 'SAR'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div className="md:col-span-3 space-y-1.5"><Label>ملاحظات</Label><Input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">بنود الموازنة</div>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3.5 h-3.5 ml-1" /> بند</Button>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="min-w-[110px]">حساب GL</TableHead>
                  <TableHead className="min-w-[160px]">الاسم</TableHead>
                  {monthLabels.map((m, i) => <TableHead key={i} className="text-center min-w-[90px]">{m}</TableHead>)}
                  <TableHead className="text-right min-w-[110px]">الإجمالي</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell><Input value={l.gl_account_code} onChange={e => updateLine(i, { gl_account_code: e.target.value })} className="h-8 font-mono text-xs" /></TableCell>
                      <TableCell><Input value={l.gl_account_name || ''} onChange={e => updateLine(i, { gl_account_name: e.target.value })} className="h-8" /></TableCell>
                      {monthKeys.map(k => (
                        <TableCell key={k}><Input type="number" step="0.01" value={l[k]} onChange={e => updateLine(i, { [k]: Number(e.target.value) } as any)} className="h-8 text-right font-mono text-xs" /></TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-bold">{Number(l.annual_total).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="ghost" title="توزيع بالتساوي" onClick={() => distributeEvenly(i)}>÷12</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex justify-end text-primary text-lg font-bold">الإجمالي الكلي: <span className="font-mono mr-2">{grandTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</span></div>
            <p className="text-xs text-muted-foreground mt-1">💡 أدخل الإجمالي السنوي في العمود الأخير من مبدئي، ثم اضغط «÷12» لتوزيعه بالتساوي على الشهور، أو أدخل قيم كل شهر يدويًا.</p>
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

export default AccBudgetsPage;
