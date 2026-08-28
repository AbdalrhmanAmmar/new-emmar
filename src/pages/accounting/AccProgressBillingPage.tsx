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
import { Plus, Pencil, Trash2, FileSpreadsheet, Send, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

interface Line {
  id?: string; line_no: number; item_code?: string; description?: string; unit?: string;
  contract_qty: number; unit_price: number; contract_amount: number;
  prev_cumulative_qty: number; current_qty: number; cumulative_qty: number;
  prev_cumulative_amount: number; current_amount: number; cumulative_amount: number;
  progress_percent: number;
}
interface IPC {
  id: string; ipc_number: string; ipc_date: string; project_name: string; customer_name?: string | null;
  contract_value: number; period_from?: string | null; period_to?: string | null;
  prev_cumulative_amount: number; current_period_amount: number; cumulative_amount: number;
  retention_rate: number; retention_amount: number; advance_recovery: number; penalties: number; adjustments: number;
  net_before_vat: number; vat_rate: number; vat_amount: number; grand_total: number;
  currency: string; status: string; notes?: string | null;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'مُقدَّم', approved: 'معتمد', invoiced: 'مفوتر', paid: 'مدفوع', cancelled: 'ملغي',
};
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700', invoiced: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-primary/10 text-primary', cancelled: 'bg-gray-100 text-gray-700',
};

const emptyLine = (n = 1): Line => ({
  line_no: n, contract_qty: 0, unit_price: 0, contract_amount: 0,
  prev_cumulative_qty: 0, current_qty: 0, cumulative_qty: 0,
  prev_cumulative_amount: 0, current_amount: 0, cumulative_amount: 0, progress_percent: 0,
});
const emptyForm = (): Partial<IPC> => ({
  ipc_number: `IPC-${Date.now().toString().slice(-6)}`,
  ipc_date: new Date().toISOString().slice(0, 10),
  project_name: '', customer_name: '', contract_value: 0,
  prev_cumulative_amount: 0, current_period_amount: 0, cumulative_amount: 0,
  retention_rate: 10, retention_amount: 0, advance_recovery: 0, penalties: 0, adjustments: 0,
  net_before_vat: 0, vat_rate: 15, vat_amount: 0, grand_total: 0,
  currency: 'SAR', status: 'draft',
});

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccProgressBillingPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_progress_billing' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_progress_billing' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_progress_billing' as any, 'delete');
  const canApprove = isAdmin || hasPermission('accounting_progress_billing' as any, 'approve' as any);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<IPC>>(emptyForm());
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_progress_billings'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_progress_billings').select('*').order('ipc_date', { ascending: false });
      if (error) throw error;
      return (data || []) as IPC[];
    },
  });

  const totals = useMemo(() => ({
    count: rows.length,
    approved: rows.filter(r => ['approved', 'invoiced', 'paid'].includes(r.status)).reduce((s, r) => s + Number(r.grand_total || 0), 0),
    retention: rows.reduce((s, r) => s + Number(r.retention_amount || 0), 0),
    pending: rows.filter(r => r.status === 'submitted').length,
  }), [rows]);

  const recomputeHeader = (base: Partial<IPC>, ls: Line[]): Partial<IPC> => {
    const current_period_amount = ls.reduce((s, l) => s + Number(l.current_amount || 0), 0);
    const prev_cumulative_amount = ls.reduce((s, l) => s + Number(l.prev_cumulative_amount || 0), 0);
    const cumulative_amount = prev_cumulative_amount + current_period_amount;
    const retention_rate = Number(base.retention_rate ?? 10);
    const retention_amount = +(current_period_amount * retention_rate / 100).toFixed(2);
    const advance_recovery = Number(base.advance_recovery ?? 0);
    const penalties = Number(base.penalties ?? 0);
    const adjustments = Number(base.adjustments ?? 0);
    const net_before_vat = +(current_period_amount - retention_amount - advance_recovery - penalties + adjustments).toFixed(2);
    const vat_rate = Number(base.vat_rate ?? 15);
    const vat_amount = +(net_before_vat * vat_rate / 100).toFixed(2);
    const grand_total = +(net_before_vat + vat_amount).toFixed(2);
    return { ...base, current_period_amount, prev_cumulative_amount, cumulative_amount, retention_amount, net_before_vat, vat_amount, grand_total };
  };

  const openNew = () => { setForm(emptyForm()); setLines([emptyLine()]); setOpen(true); };
  const openEdit = async (r: IPC) => {
    setForm(r);
    const { data } = await (supabase as any).from('acc_progress_billing_lines').select('*').eq('ipc_id', r.id).order('line_no');
    setLines((data && data.length ? data : [emptyLine()]) as Line[]);
    setOpen(true);
  };

  const addLine = () => setLines(ls => [...ls, emptyLine(ls.length + 1)]);
  const removeLine = (i: number) => {
    const next = lines.filter((_, idx) => idx !== i);
    setLines(next); setForm(f => recomputeHeader(f, next));
  };
  const updateLine = (i: number, patch: Partial<Line>) => {
    const next = lines.map((l, idx) => {
      if (idx !== i) return l;
      const m = { ...l, ...patch };
      const contract_amount = +(Number(m.contract_qty || 0) * Number(m.unit_price || 0)).toFixed(2);
      const cumulative_qty = +(Number(m.prev_cumulative_qty || 0) + Number(m.current_qty || 0)).toFixed(3);
      const current_amount = +(Number(m.current_qty || 0) * Number(m.unit_price || 0)).toFixed(2);
      const prev_cumulative_amount = +(Number(m.prev_cumulative_qty || 0) * Number(m.unit_price || 0)).toFixed(2);
      const cumulative_amount = +(prev_cumulative_amount + current_amount).toFixed(2);
      const progress_percent = contract_amount > 0 ? +((cumulative_amount / contract_amount) * 100).toFixed(2) : 0;
      return { ...m, contract_amount, cumulative_qty, current_amount, prev_cumulative_amount, cumulative_amount, progress_percent };
    });
    setLines(next);
    setForm(f => recomputeHeader(f, next));
  };

  const updateHeader = (patch: Partial<IPC>) => setForm(f => recomputeHeader({ ...f, ...patch }, lines));

  const save = async () => {
    if (!form.project_name) { toast.error('اسم المشروع مطلوب'); return; }
    try {
      const payload: any = { ...form };
      delete payload.id;
      const { data: saved, error } = form.id
        ? await (supabase as any).from('acc_progress_billings').update(payload).eq('id', form.id).select('id').single()
        : await (supabase as any).from('acc_progress_billings').insert({ ...payload, created_by: user?.id }).select('id').single();
      if (error) throw error;
      const ipcId = saved?.id || form.id;
      await (supabase as any).from('acc_progress_billing_lines').delete().eq('ipc_id', ipcId);
      const validLines = lines.filter(l => (l.item_code || l.description || '').trim() || Number(l.current_qty || 0) > 0);
      if (validLines.length) {
        const payload2 = validLines.map((l, idx) => ({
          ipc_id: ipcId, line_no: idx + 1,
          item_code: l.item_code || null, description: l.description || null, unit: l.unit || null,
          contract_qty: Number(l.contract_qty || 0), unit_price: Number(l.unit_price || 0), contract_amount: Number(l.contract_amount || 0),
          prev_cumulative_qty: Number(l.prev_cumulative_qty || 0), current_qty: Number(l.current_qty || 0), cumulative_qty: Number(l.cumulative_qty || 0),
          prev_cumulative_amount: Number(l.prev_cumulative_amount || 0), current_amount: Number(l.current_amount || 0), cumulative_amount: Number(l.cumulative_amount || 0),
          progress_percent: Number(l.progress_percent || 0),
        }));
        const { error: le } = await (supabase as any).from('acc_progress_billing_lines').insert(payload2);
        if (le) throw le;
      }
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_progress_billings'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const setStatus = async (r: IPC, next: string, extra: Record<string, any> = {}) => {
    const { error } = await (supabase as any).from('acc_progress_billings').update({ status: next, ...extra }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم تحديث الحالة');
    qc.invalidateQueries({ queryKey: ['acc_progress_billings'] });
  };

  const del = async (r: IPC) => {
    if (!['draft', 'cancelled'].includes(r.status)) { toast.error('لا يمكن حذف مستخلص بعد الاعتماد'); return; }
    if (!confirm(`حذف ${r.ipc_number}؟`)) return;
    const { error } = await (supabase as any).from('acc_progress_billings').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_progress_billings'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">مستخلصات المقاولين (IPC)</h1>
            <p className="text-xs text-muted-foreground">فوترة على نسبة الإنجاز مع استقطاعات الضمان والدفعات المقدمة والغرامات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="مستخلصات المقاولين"
            headers={['رقم', 'التاريخ', 'المشروع', 'العميل', 'قيمة الفترة', 'الضمان', 'الإجمالي', 'الحالة']}
            rows={rows.map(r => [r.ipc_number, r.ipc_date, r.project_name, r.customer_name || '-', fmt(r.current_period_amount), fmt(r.retention_amount), fmt(r.grand_total), statusLabels[r.status]])}
            kpis={[
              { label: 'العدد', value: totals.count },
              { label: 'المعتمد', value: fmt(totals.approved) },
              { label: 'الضمان المستقطع', value: fmt(totals.retention) },
              { label: 'قيد الاعتماد', value: totals.pending },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> مستخلص جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي المستخلصات</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">قيد الاعتماد</div><div className="text-2xl font-bold text-blue-600">{totals.pending}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي المعتمد</div><div className="text-lg font-bold text-emerald-600">{fmt(totals.approved)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">ضمان محتجز</div><div className="text-lg font-bold text-primary">{fmt(totals.retention)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>المستخلصات ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>رقم</TableHead><TableHead>التاريخ</TableHead>
              <TableHead>المشروع</TableHead><TableHead>العميل</TableHead>
              <TableHead className="text-right">قيمة الفترة</TableHead>
              <TableHead className="text-right">الضمان</TableHead>
              <TableHead className="text-right">استرداد مقدم</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={10} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">لا توجد مستخلصات</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.ipc_number}</TableCell>
                      <TableCell className="text-xs">{r.ipc_date}</TableCell>
                      <TableCell className="font-medium">{r.project_name}</TableCell>
                      <TableCell className="text-xs">{r.customer_name || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.current_period_amount)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">{fmt(r.retention_amount)}</TableCell>
                      <TableCell className="text-right font-mono text-indigo-600">{fmt(r.advance_recovery)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{fmt(r.grand_total)}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {canEdit && r.status === 'draft' && <Button size="sm" variant="ghost" title="تقديم" onClick={() => setStatus(r, 'submitted', { submitted_at: new Date().toISOString() })}><Send className="w-3.5 h-3.5 text-blue-600" /></Button>}
                          {canApprove && r.status === 'submitted' && <Button size="sm" variant="ghost" title="اعتماد" onClick={() => setStatus(r, 'approved', { approved_by: user?.id, approved_at: new Date().toISOString() })}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                          {canApprove && ['submitted', 'approved'].includes(r.status) && <Button size="sm" variant="ghost" title="إلغاء" onClick={() => setStatus(r, 'cancelled')}><XCircle className="w-3.5 h-3.5 text-destructive" /></Button>}
                          {canEdit && ['draft', 'submitted'].includes(r.status) && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
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
        <DialogContent className="max-w-[97vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.ipc_number}` : 'مستخلص جديد'}</DialogTitle></DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5"><Label>رقم المستخلص *</Label><Input value={form.ipc_number || ''} onChange={e => setForm({ ...form, ipc_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>التاريخ</Label><Input type="date" value={form.ipc_date || ''} onChange={e => setForm({ ...form, ipc_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>من فترة</Label><Input type="date" value={form.period_from || ''} onChange={e => setForm({ ...form, period_from: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>إلى فترة</Label><Input type="date" value={form.period_to || ''} onChange={e => setForm({ ...form, period_to: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>المشروع *</Label><Input value={form.project_name || ''} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>العميل</Label><Input value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>قيمة العقد</Label><Input type="number" step="0.01" value={form.contract_value ?? 0} onChange={e => setForm({ ...form, contract_value: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>نسبة الضمان %</Label><Input type="number" step="0.01" value={form.retention_rate ?? 10} onChange={e => updateHeader({ retention_rate: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>استرداد الدفعة المقدمة</Label><Input type="number" step="0.01" value={form.advance_recovery ?? 0} onChange={e => updateHeader({ advance_recovery: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>غرامات التأخير</Label><Input type="number" step="0.01" value={form.penalties ?? 0} onChange={e => updateHeader({ penalties: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>تعديلات (+/-)</Label><Input type="number" step="0.01" value={form.adjustments ?? 0} onChange={e => updateHeader({ adjustments: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>نسبة الضريبة %</Label><Input type="number" step="0.01" value={form.vat_rate ?? 15} onChange={e => updateHeader({ vat_rate: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={form.currency || 'SAR'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-4"><Label>ملاحظات</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">بنود المستخلص (BOQ)</div>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3.5 h-3.5 ml-1" /> بند</Button>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="min-w-[90px]">كود</TableHead>
                  <TableHead className="min-w-[160px]">الوصف</TableHead>
                  <TableHead className="min-w-[70px]">الوحدة</TableHead>
                  <TableHead className="min-w-[90px] text-right">كمية العقد</TableHead>
                  <TableHead className="min-w-[90px] text-right">سعر الوحدة</TableHead>
                  <TableHead className="min-w-[100px] text-right">قيمة العقد</TableHead>
                  <TableHead className="min-w-[90px] text-right">كمية سابقة</TableHead>
                  <TableHead className="min-w-[90px] text-right">كمية حالية</TableHead>
                  <TableHead className="min-w-[100px] text-right">قيمة حالية</TableHead>
                  <TableHead className="min-w-[100px] text-right">تراكمي</TableHead>
                  <TableHead className="min-w-[70px] text-right">%</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell><Input value={l.item_code || ''} onChange={e => updateLine(i, { item_code: e.target.value })} className="h-8 font-mono text-xs" /></TableCell>
                      <TableCell><Input value={l.description || ''} onChange={e => updateLine(i, { description: e.target.value })} className="h-8" /></TableCell>
                      <TableCell><Input value={l.unit || ''} onChange={e => updateLine(i, { unit: e.target.value })} className="h-8 text-xs" /></TableCell>
                      <TableCell><Input type="number" step="0.001" value={l.contract_qty} onChange={e => updateLine(i, { contract_qty: Number(e.target.value) })} className="h-8 text-right font-mono text-xs" /></TableCell>
                      <TableCell><Input type="number" step="0.01" value={l.unit_price} onChange={e => updateLine(i, { unit_price: Number(e.target.value) })} className="h-8 text-right font-mono text-xs" /></TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(l.contract_amount)}</TableCell>
                      <TableCell><Input type="number" step="0.001" value={l.prev_cumulative_qty} onChange={e => updateLine(i, { prev_cumulative_qty: Number(e.target.value) })} className="h-8 text-right font-mono text-xs" /></TableCell>
                      <TableCell><Input type="number" step="0.001" value={l.current_qty} onChange={e => updateLine(i, { current_qty: Number(e.target.value) })} className="h-8 text-right font-mono text-xs" /></TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(l.current_amount)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">{fmt(l.cumulative_amount)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.progress_percent.toFixed(1)}%</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="p-2 bg-muted/40 rounded">قيمة الفترة: <span className="font-mono font-bold">{fmt(form.current_period_amount || 0)}</span></div>
              <div className="p-2 bg-muted/40 rounded">التراكمي: <span className="font-mono font-bold">{fmt(form.cumulative_amount || 0)}</span></div>
              <div className="p-2 bg-orange-50 rounded">الضمان: <span className="font-mono font-bold text-orange-700">{fmt(form.retention_amount || 0)}</span></div>
              <div className="p-2 bg-indigo-50 rounded">استرداد مقدم: <span className="font-mono font-bold text-indigo-700">{fmt(form.advance_recovery || 0)}</span></div>
              <div className="p-2 bg-muted/40 rounded">الصافي قبل الضريبة: <span className="font-mono font-bold">{fmt(form.net_before_vat || 0)}</span></div>
              <div className="p-2 bg-muted/40 rounded">ضريبة القيمة المضافة: <span className="font-mono font-bold">{fmt(form.vat_amount || 0)}</span></div>
              <div className="p-2 bg-primary/10 rounded md:col-span-2">الإجمالي المستحق: <span className="font-mono font-bold text-primary text-lg">{fmt(form.grand_total || 0)}</span></div>
            </div>
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

export default AccProgressBillingPage;
