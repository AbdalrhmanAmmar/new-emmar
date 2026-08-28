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
import { Plus, Pencil, Trash2, CircleDollarSign, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Advance {
  id: string; advance_number: string; advance_date: string;
  direction: 'received' | 'paid';
  party_type: 'customer' | 'vendor' | 'subcontractor' | 'employee';
  party_name: string; project_name?: string | null;
  amount: number; currency: string;
  recovery_percent: number; recovered_amount: number; remaining_amount: number;
  payment_method?: string | null; payment_reference?: string | null;
  guarantee_ref?: string | null; guarantee_expiry?: string | null;
  status: string; notes?: string | null;
}

const dirLabels: Record<string, string> = { received: 'مقبوضة (من عميل)', paid: 'مدفوعة (لمورد/باطن)' };
const dirColors: Record<string, string> = { received: 'bg-emerald-100 text-emerald-700', paid: 'bg-indigo-100 text-indigo-700' };
const partyLabels: Record<string, string> = { customer: 'عميل', vendor: 'مورد', subcontractor: 'مقاول باطن', employee: 'موظف' };
const statusLabels: Record<string, string> = { draft: 'مسودة', active: 'نشطة', fully_recovered: 'مستردة بالكامل', cancelled: 'ملغاة' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', active: 'bg-blue-100 text-blue-700',
  fully_recovered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-gray-100 text-gray-700',
};

const emptyAdv = (): Partial<Advance> => ({
  advance_number: `ADV-${Date.now().toString().slice(-6)}`,
  advance_date: new Date().toISOString().slice(0, 10),
  direction: 'received', party_type: 'customer', party_name: '',
  amount: 0, currency: 'SAR', recovery_percent: 20, recovered_amount: 0, remaining_amount: 0,
  status: 'active',
});

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccAdvancePaymentsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_advances' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_advances' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_advances' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Advance>>(emptyAdv());
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverAdv, setRecoverAdv] = useState<Advance | null>(null);
  const [recoverAmount, setRecoverAmount] = useState<number>(0);
  const [recoverDate, setRecoverDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [recoverRef, setRecoverRef] = useState<string>('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_advance_payments'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_advance_payments').select('*').order('advance_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Advance[];
    },
  });

  const totals = useMemo(() => {
    const received = rows.filter(r => r.direction === 'received' && r.status !== 'cancelled').reduce((s, r) => s + Number(r.remaining_amount || 0), 0);
    const paid = rows.filter(r => r.direction === 'paid' && r.status !== 'cancelled').reduce((s, r) => s + Number(r.remaining_amount || 0), 0);
    return { count: rows.length, received, paid, active: rows.filter(r => r.status === 'active').length };
  }, [rows]);

  const openNew = () => { setForm(emptyAdv()); setOpen(true); };
  const openEdit = (r: Advance) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.party_name) { toast.error('اسم الطرف مطلوب'); return; }
    if (!Number(form.amount || 0)) { toast.error('المبلغ مطلوب'); return; }
    try {
      const amt = Number(form.amount || 0);
      const rec = Number(form.recovered_amount || 0);
      const remaining = +(amt - rec).toFixed(2);
      const status = remaining <= 0 ? 'fully_recovered' : (form.status === 'draft' ? 'draft' : 'active');
      const payload: any = { ...form, remaining_amount: remaining, status };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_advance_payments').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_advance_payments').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_advance_payments'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const openRecover = (r: Advance) => {
    setRecoverAdv(r); setRecoverAmount(0); setRecoverDate(new Date().toISOString().slice(0, 10)); setRecoverRef(''); setRecoverOpen(true);
  };
  const applyRecover = async () => {
    if (!recoverAdv) return;
    if (!recoverAmount || recoverAmount <= 0) { toast.error('أدخل مبلغ الاسترداد'); return; }
    if (recoverAmount > Number(recoverAdv.remaining_amount || 0)) { toast.error('المبلغ يتجاوز المتبقي'); return; }
    try {
      const { error: e1 } = await (supabase as any).from('acc_advance_recoveries').insert({
        advance_id: recoverAdv.id, recovery_date: recoverDate, amount: recoverAmount, reference: recoverRef || null, created_by: user?.id,
      });
      if (e1) throw e1;
      const newRecovered = Number(recoverAdv.recovered_amount || 0) + recoverAmount;
      const newRemaining = +(Number(recoverAdv.amount) - newRecovered).toFixed(2);
      const newStatus = newRemaining <= 0 ? 'fully_recovered' : 'active';
      const { error: e2 } = await (supabase as any).from('acc_advance_payments').update({
        recovered_amount: newRecovered, remaining_amount: newRemaining, status: newStatus,
      }).eq('id', recoverAdv.id);
      if (e2) throw e2;
      toast.success('تم تسجيل الاسترداد');
      setRecoverOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_advance_payments'] });
    } catch (e: any) { toast.error(e.message || 'فشل تسجيل الاسترداد'); }
  };

  const del = async (r: Advance) => {
    if (Number(r.recovered_amount || 0) > 0) { toast.error('لا يمكن حذف دفعة مع استردادات مسجلة'); return; }
    if (!confirm(`حذف ${r.advance_number}؟`)) return;
    const { error } = await (supabase as any).from('acc_advance_payments').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_advance_payments'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CircleDollarSign className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الدفعات المقدمة (Advance Payments)</h1>
            <p className="text-xs text-muted-foreground">إدارة الدفعات المقدمة المقبوضة والمدفوعة وجدول استردادها</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="الدفعات المقدمة"
            headers={['رقم', 'التاريخ', 'الاتجاه', 'الطرف', 'المشروع', 'المبلغ', 'المسترد', 'المتبقي', 'الحالة']}
            rows={rows.map(r => [r.advance_number, r.advance_date, dirLabels[r.direction], r.party_name, r.project_name || '-', fmt(r.amount), fmt(r.recovered_amount), fmt(r.remaining_amount), statusLabels[r.status]])}
            kpis={[
              { label: 'العدد', value: totals.count },
              { label: 'مقبوض متبقي', value: fmt(totals.received) },
              { label: 'مدفوع متبقي', value: fmt(totals.paid) },
              { label: 'نشطة', value: totals.active },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> دفعة جديدة</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الدفعات</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">نشطة</div><div className="text-2xl font-bold text-blue-600">{totals.active}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مقبوض متبقي</div><div className="text-lg font-bold text-emerald-600">{fmt(totals.received)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مدفوع متبقي</div><div className="text-lg font-bold text-indigo-600">{fmt(totals.paid)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الدفعات المقدمة ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>رقم</TableHead><TableHead>التاريخ</TableHead>
              <TableHead>الاتجاه</TableHead><TableHead>الطرف</TableHead>
              <TableHead>المشروع</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">المسترد</TableHead>
              <TableHead className="text-right">المتبقي</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={10} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">لا توجد دفعات</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.advance_number}</TableCell>
                      <TableCell className="text-xs">{r.advance_date}</TableCell>
                      <TableCell><Badge className={dirColors[r.direction]}>{dirLabels[r.direction]}</Badge></TableCell>
                      <TableCell><div className="text-sm font-medium">{r.party_name}</div><div className="text-xs text-muted-foreground">{partyLabels[r.party_type]}</div></TableCell>
                      <TableCell className="text-xs">{r.project_name || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{fmt(r.recovered_amount)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{fmt(r.remaining_amount)}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && r.status === 'active' && Number(r.remaining_amount || 0) > 0 && <Button size="sm" variant="ghost" title="استرداد جزئي" onClick={() => openRecover(r)}><MinusCircle className="w-3.5 h-3.5 text-orange-600" /></Button>}
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
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.advance_number}` : 'دفعة مقدمة جديدة'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>رقم الدفعة *</Label><Input value={form.advance_number || ''} onChange={e => setForm({ ...form, advance_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>التاريخ</Label><Input type="date" value={form.advance_date || ''} onChange={e => setForm({ ...form, advance_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الاتجاه</Label>
              <Select value={form.direction || 'received'} onValueChange={v => setForm({ ...form, direction: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(dirLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>نوع الطرف</Label>
              <Select value={form.party_type || 'customer'} onValueChange={v => setForm({ ...form, party_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(partyLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2"><Label>اسم الطرف *</Label><Input value={form.party_name || ''} onChange={e => setForm({ ...form, party_name: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>المشروع</Label><Input value={form.project_name || ''} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المبلغ *</Label><Input type="number" step="0.01" value={form.amount ?? 0} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={form.currency || 'SAR'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>نسبة الاسترداد لكل مستخلص %</Label><Input type="number" step="0.01" value={form.recovery_percent ?? 20} onChange={e => setForm({ ...form, recovery_percent: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>المسترد حتى الآن</Label><Input type="number" step="0.01" value={form.recovered_amount ?? 0} onChange={e => setForm({ ...form, recovered_amount: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>طريقة الدفع</Label><Input value={form.payment_method || ''} onChange={e => setForm({ ...form, payment_method: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>مرجع الدفع</Label><Input value={form.payment_reference || ''} onChange={e => setForm({ ...form, payment_reference: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>مرجع الضمان البنكي</Label><Input value={form.guarantee_ref || ''} onChange={e => setForm({ ...form, guarantee_ref: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>انتهاء صلاحية الضمان</Label><Input type="date" value={form.guarantee_expiry || ''} onChange={e => setForm({ ...form, guarantee_expiry: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1.5"><Label>ملاحظات</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recoverOpen} onOpenChange={setRecoverOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>استرداد جزئي — {recoverAdv?.advance_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/40 rounded text-sm">
              <div>المتبقي حالياً: <span className="font-mono font-bold text-primary">{fmt(Number(recoverAdv?.remaining_amount || 0))}</span></div>
            </div>
            <div className="space-y-1.5"><Label>تاريخ الاسترداد</Label><Input type="date" value={recoverDate} onChange={e => setRecoverDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>المبلغ *</Label><Input type="number" step="0.01" value={recoverAmount} onChange={e => setRecoverAmount(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>المرجع (مستخلص/فاتورة)</Label><Input value={recoverRef} onChange={e => setRecoverRef(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecoverOpen(false)}>إلغاء</Button>
            <Button onClick={applyRecover}>تسجيل الاسترداد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccAdvancePaymentsPage;
