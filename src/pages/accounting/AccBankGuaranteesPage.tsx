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
import { Plus, Pencil, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

interface Guarantee {
  id: string; guarantee_number: string; issue_date: string; expiry_date: string;
  guarantee_type: 'bid_bond' | 'performance_bond' | 'advance_payment' | 'retention' | 'custom';
  direction: 'issued' | 'received';
  beneficiary: string; bank_name: string; project_name?: string | null;
  amount: number; currency: string;
  commission_rate?: number | null; commission_amount?: number | null;
  status: string; notes?: string | null;
}

const typeLabels: Record<string, string> = {
  bid_bond: 'ضمان ابتدائي', performance_bond: 'ضمان نهائي',
  advance_payment: 'ضمان دفعة مقدمة', retention: 'ضمان صيانة/احتجاز', custom: 'أخرى',
};
const typeColors: Record<string, string> = {
  bid_bond: 'bg-sky-100 text-sky-700', performance_bond: 'bg-emerald-100 text-emerald-700',
  advance_payment: 'bg-amber-100 text-amber-700', retention: 'bg-purple-100 text-purple-700',
  custom: 'bg-slate-100 text-slate-700',
};
const dirLabels: Record<string, string> = { issued: 'صادر (منّا للغير)', received: 'وارد (من الغير لنا)' };
const statusLabels: Record<string, string> = {
  active: 'نشط', released: 'مفرج عنه', forfeited: 'مصادر', expired: 'منتهي', cancelled: 'ملغي',
};
const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700', released: 'bg-emerald-100 text-emerald-700',
  forfeited: 'bg-rose-100 text-rose-700', expired: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const empty = (): Partial<Guarantee> => ({
  guarantee_number: `BG-${Date.now().toString().slice(-6)}`,
  issue_date: new Date().toISOString().slice(0, 10),
  expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  guarantee_type: 'performance_bond', direction: 'issued',
  beneficiary: '', bank_name: '', amount: 0, currency: 'SAR', commission_rate: 0, status: 'active',
});

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const AccBankGuaranteesPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_bank_guarantees' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_bank_guarantees' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_bank_guarantees' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Guarantee>>(empty());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_bank_guarantees'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_bank_guarantees').select('*').order('issue_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Guarantee[];
    },
  });

  const filtered = useMemo(() => filterStatus === 'all' ? rows : rows.filter(r => r.status === filterStatus), [rows, filterStatus]);

  const totals = useMemo(() => {
    const active = rows.filter(r => r.status === 'active');
    return {
      count: rows.length,
      activeCount: active.length,
      issued: active.filter(r => r.direction === 'issued').reduce((s, r) => s + Number(r.amount || 0), 0),
      received: active.filter(r => r.direction === 'received').reduce((s, r) => s + Number(r.amount || 0), 0),
      expiringSoon: active.filter(r => daysUntil(r.expiry_date) <= 30 && daysUntil(r.expiry_date) >= 0).length,
    };
  }, [rows]);

  const openNew = () => { setForm(empty()); setOpen(true); };
  const openEdit = (r: Guarantee) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.beneficiary || !form.bank_name) { toast.error('المستفيد واسم البنك مطلوبان'); return; }
    if (!Number(form.amount || 0)) { toast.error('المبلغ مطلوب'); return; }
    try {
      const amt = Number(form.amount || 0);
      const rate = Number(form.commission_rate || 0);
      const commission = +(amt * rate / 100).toFixed(2);
      const payload: any = { ...form, commission_amount: commission };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_bank_guarantees').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_bank_guarantees').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_bank_guarantees'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const changeStatus = async (r: Guarantee, status: string) => {
    if (!confirm(`تغيير حالة ${r.guarantee_number} إلى "${statusLabels[status]}"؟`)) return;
    const { error } = await (supabase as any).from('acc_bank_guarantees').update({ status }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم التحديث');
    qc.invalidateQueries({ queryKey: ['acc_bank_guarantees'] });
  };

  const del = async (r: Guarantee) => {
    if (!confirm(`حذف ${r.guarantee_number}؟`)) return;
    const { error } = await (supabase as any).from('acc_bank_guarantees').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_bank_guarantees'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الضمانات البنكية (Bank Guarantees)</h1>
            <p className="text-xs text-muted-foreground">إدارة الضمانات الابتدائية، النهائية، الدفعة المقدمة، والاحتجاز</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="الضمانات البنكية"
            headers={['رقم', 'النوع', 'الاتجاه', 'المستفيد', 'البنك', 'المبلغ', 'الإصدار', 'الانتهاء', 'الحالة']}
            rows={filtered.map(r => [r.guarantee_number, typeLabels[r.guarantee_type], dirLabels[r.direction], r.beneficiary, r.bank_name, fmt(r.amount), r.issue_date, r.expiry_date, statusLabels[r.status]])}
            kpis={[
              { label: 'الإجمالي', value: totals.count },
              { label: 'نشط', value: totals.activeCount },
              { label: 'صادر نشط', value: fmt(totals.issued) },
              { label: 'وارد نشط', value: fmt(totals.received) },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> ضمان جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الضمانات</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">نشطة</div><div className="text-2xl font-bold text-blue-600">{totals.activeCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">صادر نشط</div><div className="text-lg font-bold text-indigo-600">{fmt(totals.issued)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">وارد نشط</div><div className="text-lg font-bold text-emerald-600">{fmt(totals.received)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> ينتهي خلال 30 يوم</div><div className="text-2xl font-bold text-amber-600">{totals.expiringSoon}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>الضمانات ({filtered.length})</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>رقم</TableHead><TableHead>النوع</TableHead>
              <TableHead>الاتجاه</TableHead><TableHead>المستفيد</TableHead>
              <TableHead>البنك</TableHead><TableHead>المشروع</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead>الإصدار</TableHead><TableHead>الانتهاء</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={11} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">لا توجد ضمانات</TableCell></TableRow>
                  : filtered.map(r => {
                    const dl = daysUntil(r.expiry_date);
                    const expiring = r.status === 'active' && dl <= 30 && dl >= 0;
                    return (
                      <TableRow key={r.id} className={expiring ? 'bg-amber-50/40' : ''}>
                        <TableCell className="font-mono text-xs">{r.guarantee_number}</TableCell>
                        <TableCell><Badge className={typeColors[r.guarantee_type]}>{typeLabels[r.guarantee_type]}</Badge></TableCell>
                        <TableCell className="text-xs">{dirLabels[r.direction]}</TableCell>
                        <TableCell className="text-sm">{r.beneficiary}</TableCell>
                        <TableCell className="text-sm">{r.bank_name}</TableCell>
                        <TableCell className="text-xs">{r.project_name || '-'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">{fmt(r.amount)}</TableCell>
                        <TableCell className="text-xs">{r.issue_date}</TableCell>
                        <TableCell className={`text-xs ${expiring ? 'font-bold text-amber-700' : ''}`}>{r.expiry_date}{expiring && <div className="text-[10px]">({dl} يوم)</div>}</TableCell>
                        <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canEdit && r.status === 'active' && (
                              <Select onValueChange={(v) => changeStatus(r, v)}>
                                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="إجراء" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="released">إفراج</SelectItem>
                                  <SelectItem value="forfeited">مصادرة</SelectItem>
                                  <SelectItem value="expired">انتهاء</SelectItem>
                                  <SelectItem value="cancelled">إلغاء</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {canEdit && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                            {canDelete && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                          </div>
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
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.guarantee_number}` : 'ضمان بنكي جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>رقم الضمان *</Label><Input value={form.guarantee_number || ''} onChange={e => setForm({ ...form, guarantee_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>النوع</Label>
              <Select value={form.guarantee_type || 'performance_bond'} onValueChange={v => setForm({ ...form, guarantee_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الاتجاه</Label>
              <Select value={form.direction || 'issued'} onValueChange={v => setForm({ ...form, direction: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(dirLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2"><Label>المستفيد *</Label><Input value={form.beneficiary || ''} onChange={e => setForm({ ...form, beneficiary: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>البنك المصدر *</Label><Input value={form.bank_name || ''} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>المشروع</Label><Input value={form.project_name || ''} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المبلغ *</Label><Input type="number" step="0.01" value={form.amount ?? 0} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={form.currency || 'SAR'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>تاريخ الإصدار</Label><Input type="date" value={form.issue_date || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>تاريخ الانتهاء *</Label><Input type="date" value={form.expiry_date || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>نسبة العمولة السنوية %</Label><Input type="number" step="0.01" value={form.commission_rate ?? 0} onChange={e => setForm({ ...form, commission_rate: Number(e.target.value) })} /></div>
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
    </div>
  );
};

export default AccBankGuaranteesPage;
