import React, { useState, useMemo, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Users, CheckCircle2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Payroll {
  id: string; reference: string; period_month: number; period_year: number;
  posting_date: string; description?: string | null;
  employees_count: number;
  gross_salaries: number; allowances: number; overtime: number; bonuses: number;
  gosi_employee: number; gosi_employer: number; income_tax: number;
  loans_deductions: number; advances_deductions: number; absence_deductions: number; other_deductions: number;
  net_pay: number; status: string; posted_at?: string | null; notes?: string | null;
}

const statusLabels: Record<string, string> = { draft: 'مسودة', posted: 'مُرحّل', reversed: 'مُلغى' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', posted: 'bg-emerald-100 text-emerald-700', reversed: 'bg-red-100 text-red-700',
};

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const emptyForm = (): Partial<Payroll> => {
  const d = new Date();
  return {
    reference: `PAY-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    period_month: d.getMonth() + 1, period_year: d.getFullYear(),
    posting_date: d.toISOString().slice(0, 10),
    employees_count: 0,
    gross_salaries: 0, allowances: 0, overtime: 0, bonuses: 0,
    gosi_employee: 0, gosi_employer: 0, income_tax: 0,
    loans_deductions: 0, advances_deductions: 0, absence_deductions: 0, other_deductions: 0,
    net_pay: 0, status: 'draft',
  };
};

const calcNet = (f: Partial<Payroll>): number => {
  const gross = Number(f.gross_salaries || 0) + Number(f.allowances || 0) + Number(f.overtime || 0) + Number(f.bonuses || 0);
  const ded = Number(f.gosi_employee || 0) + Number(f.income_tax || 0) + Number(f.loans_deductions || 0)
    + Number(f.advances_deductions || 0) + Number(f.absence_deductions || 0) + Number(f.other_deductions || 0);
  return gross - ded;
};

const AccPayrollJournalPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_payroll_journal' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_payroll_journal' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_payroll_journal' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Payroll>>(emptyForm());

  useEffect(() => { setForm(f => ({ ...f, net_pay: calcNet(f) })); }, [
    form.gross_salaries, form.allowances, form.overtime, form.bonuses,
    form.gosi_employee, form.income_tax, form.loans_deductions,
    form.advances_deductions, form.absence_deductions, form.other_deductions,
  ]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_payroll_journals'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_payroll_journals').select('*').order('period_year', { ascending: false }).order('period_month', { ascending: false });
      if (error) throw error;
      return (data || []) as Payroll[];
    },
  });

  const totals = useMemo(() => ({
    count: rows.length,
    posted: rows.filter(r => r.status === 'posted').length,
    ytdGross: rows.filter(r => r.period_year === new Date().getFullYear()).reduce((s, r) => s + Number(r.gross_salaries || 0) + Number(r.allowances || 0) + Number(r.overtime || 0) + Number(r.bonuses || 0), 0),
    ytdNet: rows.filter(r => r.period_year === new Date().getFullYear()).reduce((s, r) => s + Number(r.net_pay || 0), 0),
  }), [rows]);

  const openNew = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (r: Payroll) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.reference) { toast.error('المرجع مطلوب'); return; }
    try {
      const netPay = calcNet(form);
      const payload: any = {
        ...form,
        employees_count: Number(form.employees_count || 0),
        gross_salaries: Number(form.gross_salaries || 0),
        allowances: Number(form.allowances || 0),
        overtime: Number(form.overtime || 0),
        bonuses: Number(form.bonuses || 0),
        gosi_employee: Number(form.gosi_employee || 0),
        gosi_employer: Number(form.gosi_employer || 0),
        income_tax: Number(form.income_tax || 0),
        loans_deductions: Number(form.loans_deductions || 0),
        advances_deductions: Number(form.advances_deductions || 0),
        absence_deductions: Number(form.absence_deductions || 0),
        other_deductions: Number(form.other_deductions || 0),
        net_pay: netPay,
      };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_payroll_journals').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_payroll_journals').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_payroll_journals'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const post = async (r: Payroll) => {
    if (!confirm(`ترحيل قيد الرواتب لفترة ${monthNames[r.period_month - 1]} ${r.period_year}؟`)) return;
    const { error } = await (supabase as any).from('acc_payroll_journals').update({
      status: 'posted', posted_at: new Date().toISOString(), posted_by: user?.id,
    }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الترحيل');
    qc.invalidateQueries({ queryKey: ['acc_payroll_journals'] });
  };

  const reverse = async (r: Payroll) => {
    if (!confirm('إلغاء الترحيل؟')) return;
    const { error } = await (supabase as any).from('acc_payroll_journals').update({ status: 'reversed' }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الإلغاء');
    qc.invalidateQueries({ queryKey: ['acc_payroll_journals'] });
  };

  const del = async (r: Payroll) => {
    if (r.status === 'posted') { toast.error('لا يمكن حذف قيد مُرحّل — قم بالإلغاء أولًا'); return; }
    if (!confirm(`حذف ${r.reference}؟`)) return;
    const { error } = await (supabase as any).from('acc_payroll_journals').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_payroll_journals'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">قيود الرواتب</h1>
            <p className="text-xs text-muted-foreground">قيد شهري إجمالي للرواتب والاستقطاعات والتأمينات مع الترحيل للأستاذ العام</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="قيود الرواتب"
            headers={['المرجع', 'الفترة', 'الموظفين', 'الأساسي', 'البدلات', 'تأمينات', 'استقطاعات', 'الصافي', 'الحالة']}
            rows={rows.map(r => [r.reference, `${monthNames[r.period_month - 1]} ${r.period_year}`, r.employees_count, Number(r.gross_salaries).toLocaleString('en-GB', { minimumFractionDigits: 2 }), Number(r.allowances).toLocaleString('en-GB', { minimumFractionDigits: 2 }), Number(r.gosi_employee).toLocaleString('en-GB', { minimumFractionDigits: 2 }), (Number(r.loans_deductions) + Number(r.advances_deductions) + Number(r.absence_deductions) + Number(r.other_deductions)).toLocaleString('en-GB', { minimumFractionDigits: 2 }), Number(r.net_pay).toLocaleString('en-GB', { minimumFractionDigits: 2 }), statusLabels[r.status]])}
            kpis={[{ label: 'إجمالي القيود', value: totals.count }, { label: 'مُرحّلة', value: totals.posted }, { label: 'إجمالي الأجور YTD', value: totals.ytdGross.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }, { label: 'صافي YTD', value: totals.ytdNet.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> قيد رواتب</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي القيود</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مُرحّلة</div><div className="text-2xl font-bold text-emerald-600">{totals.posted}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الأجور YTD</div><div className="text-lg font-bold">{totals.ytdGross.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">صافي المدفوع YTD</div><div className="text-lg font-bold text-primary">{totals.ytdNet.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>القيود ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>المرجع</TableHead><TableHead>الفترة</TableHead>
              <TableHead className="text-center">الموظفون</TableHead>
              <TableHead className="text-right">الأساسي</TableHead>
              <TableHead className="text-right">البدلات</TableHead>
              <TableHead className="text-right">تأمينات</TableHead>
              <TableHead className="text-right">استقطاعات</TableHead>
              <TableHead className="text-right">الصافي</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={10} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">لا توجد قيود</TableCell></TableRow>
                  : rows.map(r => {
                    const ded = Number(r.loans_deductions) + Number(r.advances_deductions) + Number(r.absence_deductions) + Number(r.other_deductions);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                        <TableCell>{monthNames[r.period_month - 1]} {r.period_year}</TableCell>
                        <TableCell className="text-center">{r.employees_count}</TableCell>
                        <TableCell className="text-right font-mono">{Number(r.gross_salaries).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{Number(r.allowances).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{Number(r.gosi_employee).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-orange-600">{ded.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">{Number(r.net_pay).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                        <TableCell>
                          <RowActions>
                            {canEdit && r.status === 'draft' && <Button size="sm" variant="ghost" title="ترحيل" onClick={() => post(r)}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                            {canEdit && r.status === 'posted' && <Button size="sm" variant="ghost" title="إلغاء الترحيل" onClick={() => reverse(r)}><Undo2 className="w-3.5 h-3.5 text-amber-600" /></Button>}
                            {canEdit && r.status !== 'posted' && <Button title="تعديل" aria-label="تعديل" size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.reference}` : 'قيد رواتب جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>المرجع *</Label><Input value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الشهر</Label>
              <Select value={String(form.period_month || 1)} onValueChange={v => setForm({ ...form, period_month: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{monthNames.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>السنة</Label><Input type="number" value={form.period_year ?? new Date().getFullYear()} onChange={e => setForm({ ...form, period_year: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>تاريخ القيد</Label><Input type="date" value={form.posting_date || ''} onChange={e => setForm({ ...form, posting_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>عدد الموظفين</Label><Input type="number" value={form.employees_count ?? 0} onChange={e => setForm({ ...form, employees_count: Number(e.target.value) })} /></div>
            <div className="md:col-span-3 border-t pt-2 font-semibold text-sm text-emerald-700">الاستحقاقات (+)</div>
            <div className="space-y-1.5"><Label>الرواتب الأساسية</Label><Input type="number" step="0.01" value={form.gross_salaries ?? 0} onChange={e => setForm({ ...form, gross_salaries: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>البدلات</Label><Input type="number" step="0.01" value={form.allowances ?? 0} onChange={e => setForm({ ...form, allowances: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>العمل الإضافي</Label><Input type="number" step="0.01" value={form.overtime ?? 0} onChange={e => setForm({ ...form, overtime: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>مكافآت / حوافز</Label><Input type="number" step="0.01" value={form.bonuses ?? 0} onChange={e => setForm({ ...form, bonuses: Number(e.target.value) })} /></div>
            <div className="md:col-span-3 border-t pt-2 font-semibold text-sm text-red-700">الاستقطاعات (−)</div>
            <div className="space-y-1.5"><Label>تأمينات (حصة الموظف)</Label><Input type="number" step="0.01" value={form.gosi_employee ?? 0} onChange={e => setForm({ ...form, gosi_employee: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>تأمينات (حصة الشركة)</Label><Input type="number" step="0.01" value={form.gosi_employer ?? 0} onChange={e => setForm({ ...form, gosi_employer: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>ضريبة دخل</Label><Input type="number" step="0.01" value={form.income_tax ?? 0} onChange={e => setForm({ ...form, income_tax: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>سُلف</Label><Input type="number" step="0.01" value={form.advances_deductions ?? 0} onChange={e => setForm({ ...form, advances_deductions: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>أقساط قروض</Label><Input type="number" step="0.01" value={form.loans_deductions ?? 0} onChange={e => setForm({ ...form, loans_deductions: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>غياب/تأخير</Label><Input type="number" step="0.01" value={form.absence_deductions ?? 0} onChange={e => setForm({ ...form, absence_deductions: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>خصومات أخرى</Label><Input type="number" step="0.01" value={form.other_deductions ?? 0} onChange={e => setForm({ ...form, other_deductions: Number(e.target.value) })} /></div>
            <div className="md:col-span-3 space-y-1.5"><Label>ملاحظات</Label><Input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="mt-3 flex justify-end text-primary text-lg font-bold">صافي المدفوع: <span className="font-mono mr-2">{calcNet(form).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span> ج.م</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccPayrollJournalPage;
