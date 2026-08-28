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
import { Plus, Pencil, Trash2, Activity } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface WipRow {
  id: string; period_year: number; period_month: number;
  project_code: string; project_name: string;
  contract_value: number; estimated_total_cost: number;
  cost_to_date: number; billed_to_date: number; collected_to_date: number;
  poc_percent: number; earned_revenue: number;
  wip_amount: number; overbilling: number;
  status: string; notes?: string | null;
}

const statusLabels: Record<string, string> = { draft: 'مسودة', posted: 'مرحّل', locked: 'مغلق' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', posted: 'bg-emerald-100 text-emerald-700', locked: 'bg-gray-200 text-gray-700',
};

const now = new Date();
const empty = (): Partial<WipRow> => ({
  period_year: now.getFullYear(), period_month: now.getMonth() + 1,
  project_code: '', project_name: '', contract_value: 0, estimated_total_cost: 0,
  cost_to_date: 0, billed_to_date: 0, collected_to_date: 0, status: 'draft',
});

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calcDerived = (f: Partial<WipRow>) => {
  const contract = Number(f.contract_value || 0);
  const estCost = Number(f.estimated_total_cost || 0);
  const cost = Number(f.cost_to_date || 0);
  const billed = Number(f.billed_to_date || 0);
  const poc = estCost > 0 ? Math.min(100, +(cost / estCost * 100).toFixed(2)) : 0;
  const earned = +(contract * poc / 100).toFixed(2);
  const wip = +(earned - billed).toFixed(2); // Under-billing when +ve
  const overbill = wip < 0 ? Math.abs(wip) : 0;
  return { poc_percent: poc, earned_revenue: earned, wip_amount: wip > 0 ? wip : 0, overbilling: overbill };
};

const AccWipPocPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_wip_poc' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_wip_poc' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_wip_poc' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<WipRow>>(empty());
  const [fYear, setFYear] = useState<number>(now.getFullYear());
  const [fMonth, setFMonth] = useState<number>(now.getMonth() + 1);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_wip_poc', fYear, fMonth],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_wip_poc').select('*')
        .eq('period_year', fYear).eq('period_month', fMonth).order('project_code');
      if (error) throw error;
      return (data || []) as WipRow[];
    },
  });

  const derived = useMemo(() => calcDerived(form), [form]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    contract: acc.contract + Number(r.contract_value || 0),
    estCost: acc.estCost + Number(r.estimated_total_cost || 0),
    cost: acc.cost + Number(r.cost_to_date || 0),
    billed: acc.billed + Number(r.billed_to_date || 0),
    earned: acc.earned + Number(r.earned_revenue || 0),
    wip: acc.wip + Number(r.wip_amount || 0),
    over: acc.over + Number(r.overbilling || 0),
  }), { contract: 0, estCost: 0, cost: 0, billed: 0, earned: 0, wip: 0, over: 0 }), [rows]);

  const openNew = () => { setForm({ ...empty(), period_year: fYear, period_month: fMonth }); setOpen(true); };
  const openEdit = (r: WipRow) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.project_code || !form.project_name) { toast.error('كود واسم المشروع مطلوب'); return; }
    if (!Number(form.contract_value || 0) || !Number(form.estimated_total_cost || 0)) { toast.error('قيمة العقد والتكلفة التقديرية مطلوبة'); return; }
    try {
      const d = calcDerived(form);
      const payload: any = { ...form, ...d };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_wip_poc').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_wip_poc').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_wip_poc'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const post = async (r: WipRow) => {
    if (!confirm(`ترحيل ${r.project_code} — ${r.project_name}؟`)) return;
    const { error } = await (supabase as any).from('acc_wip_poc').update({ status: 'posted' }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الترحيل');
    qc.invalidateQueries({ queryKey: ['acc_wip_poc'] });
  };

  const del = async (r: WipRow) => {
    if (r.status !== 'draft') { toast.error('يمكن حذف المسودات فقط'); return; }
    if (!confirm(`حذف ${r.project_code}؟`)) return;
    const { error } = await (supabase as any).from('acc_wip_poc').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_wip_poc'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">تحت التنفيذ ونسبة الإنجاز (WIP / POC)</h1>
            <p className="text-xs text-muted-foreground">حساب الإيراد المكتسب على أساس نسبة الإنجاز شهرياً لكل مشروع</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={String(fYear)} onValueChange={v => setFYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(fMonth)} onValueChange={v => setFMonth(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <ExportPdfButton
            title={`WIP/POC — ${fYear}/${fMonth}`}
            headers={['كود', 'المشروع', 'العقد', 'التكلفة التقديرية', 'التكلفة الفعلية', 'POC %', 'الإيراد المكتسب', 'المفوتر', 'WIP', 'Over-billing']}
            rows={rows.map(r => [r.project_code, r.project_name, fmt(r.contract_value), fmt(r.estimated_total_cost), fmt(r.cost_to_date), `${r.poc_percent}%`, fmt(r.earned_revenue), fmt(r.billed_to_date), fmt(r.wip_amount), fmt(r.overbilling)])}
            kpis={[
              { label: 'إجمالي العقود', value: fmt(totals.contract) },
              { label: 'الإيراد المكتسب', value: fmt(totals.earned) },
              { label: 'WIP (Under-billing)', value: fmt(totals.wip) },
              { label: 'Over-billing', value: fmt(totals.over) },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> صف جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي العقود</div><div className="text-lg font-bold">{fmt(totals.contract)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">الإيراد المكتسب</div><div className="text-lg font-bold text-emerald-600">{fmt(totals.earned)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">WIP (تحت الفوترة)</div><div className="text-lg font-bold text-blue-600">{fmt(totals.wip)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Over-billing (فواتير سابقة للتنفيذ)</div><div className="text-lg font-bold text-orange-600">{fmt(totals.over)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>سجل الفترة {fYear}/{fMonth} ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>كود</TableHead><TableHead>المشروع</TableHead>
              <TableHead className="text-right">العقد</TableHead>
              <TableHead className="text-right">التكلفة التقديرية</TableHead>
              <TableHead className="text-right">التكلفة الفعلية</TableHead>
              <TableHead className="text-right">POC %</TableHead>
              <TableHead className="text-right">الإيراد المكتسب</TableHead>
              <TableHead className="text-right">المفوتر</TableHead>
              <TableHead className="text-right">WIP</TableHead>
              <TableHead className="text-right">Over</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={12} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={12} className="text-center py-6 text-muted-foreground">لا توجد سجلات لهذه الفترة</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.project_code}</TableCell>
                      <TableCell className="text-sm">{r.project_name}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.contract_value)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.estimated_total_cost)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.cost_to_date)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{r.poc_percent}%</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{fmt(r.earned_revenue)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.billed_to_date)}</TableCell>
                      <TableCell className="text-right font-mono text-blue-600">{fmt(r.wip_amount)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">{fmt(r.overbilling)}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && r.status === 'draft' && <Button size="sm" variant="ghost" title="ترحيل" onClick={() => post(r)}><Activity className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                          {canEdit && r.status !== 'locked' && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                          {canDelete && r.status === 'draft' && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
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
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.project_code}` : 'صف WIP/POC جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>السنة</Label>
              <Select value={String(form.period_year || fYear)} onValueChange={v => setForm({ ...form, period_year: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الشهر</Label>
              <Select value={String(form.period_month || fMonth)} onValueChange={v => setForm({ ...form, period_month: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>كود المشروع *</Label><Input value={form.project_code || ''} onChange={e => setForm({ ...form, project_code: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-3"><Label>اسم المشروع *</Label><Input value={form.project_name || ''} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>قيمة العقد *</Label><Input type="number" step="0.01" value={form.contract_value ?? 0} onChange={e => setForm({ ...form, contract_value: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>التكلفة التقديرية الكلية *</Label><Input type="number" step="0.01" value={form.estimated_total_cost ?? 0} onChange={e => setForm({ ...form, estimated_total_cost: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>التكلفة الفعلية حتى تاريخه</Label><Input type="number" step="0.01" value={form.cost_to_date ?? 0} onChange={e => setForm({ ...form, cost_to_date: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>المفوتر حتى تاريخه</Label><Input type="number" step="0.01" value={form.billed_to_date ?? 0} onChange={e => setForm({ ...form, billed_to_date: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>المحصّل حتى تاريخه</Label><Input type="number" step="0.01" value={form.collected_to_date ?? 0} onChange={e => setForm({ ...form, collected_to_date: Number(e.target.value) })} /></div>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-muted-foreground">POC %: </span><span className="font-bold text-primary">{derived.poc_percent}%</span></div>
              <div><span className="text-muted-foreground">الإيراد المكتسب: </span><span className="font-mono font-bold text-emerald-600">{fmt(derived.earned_revenue)}</span></div>
              <div><span className="text-muted-foreground">WIP: </span><span className="font-mono font-bold text-blue-600">{fmt(derived.wip_amount)}</span></div>
              <div><span className="text-muted-foreground">Over-billing: </span><span className="font-mono font-bold text-orange-600">{fmt(derived.overbilling)}</span></div>
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

export default AccWipPocPage;
