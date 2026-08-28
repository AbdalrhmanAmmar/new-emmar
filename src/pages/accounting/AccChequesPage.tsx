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
import { Plus, Pencil, Trash2, ScrollText, CheckCircle2, XCircle, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Cheque {
  id: string; cheque_number: string; cheque_type: 'issued' | 'received';
  bank_account_id?: string | null; drawer_bank?: string | null; drawer_name?: string | null;
  beneficiary_name: string; beneficiary_type?: string | null;
  issue_date: string; due_date: string; amount: number; currency: string;
  status: string; cleared_date?: string | null; bounced_date?: string | null; bounce_reason?: string | null;
  notes?: string | null;
}
interface BankAccount { id: string; code: string; name_ar: string; }

const typeLabels: Record<string, string> = { issued: 'صادر', received: 'وارد' };
const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار', deposited: 'مودع', cleared: 'محصّل', bounced: 'مرتد',
  cancelled: 'ملغي', postdated: 'مؤجل', handed_over: 'مسلَّم',
};
const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700', deposited: 'bg-blue-100 text-blue-700',
  cleared: 'bg-emerald-100 text-emerald-700', bounced: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700', postdated: 'bg-purple-100 text-purple-700',
  handed_over: 'bg-slate-100 text-slate-700',
};

const emptyForm = (): Partial<Cheque> => ({
  cheque_number: '', cheque_type: 'issued',
  beneficiary_name: '',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: new Date().toISOString().slice(0, 10),
  amount: 0, currency: 'SAR', status: 'pending',
});

const AccChequesPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_cheques' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_cheques' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_cheques' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Cheque>>(emptyForm());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: banks = [] } = useQuery({
    queryKey: ['acc_bank_accounts_min'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_bank_accounts').select('id,code,name_ar').eq('status', 'active').order('code');
      return (data || []) as BankAccount[];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_cheques'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_cheques').select('*').order('due_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Cheque[];
    },
  });

  const filtered = useMemo(() => rows.filter(r =>
    (filterType === 'all' || r.cheque_type === filterType) &&
    (filterStatus === 'all' || r.status === filterStatus)
  ), [rows, filterType, filterStatus]);

  const totals = useMemo(() => {
    const issued = rows.filter(r => r.cheque_type === 'issued');
    const received = rows.filter(r => r.cheque_type === 'received');
    const dueSoon = rows.filter(r => {
      const days = Math.round((new Date(r.due_date).getTime() - Date.now()) / (86400 * 1000));
      return ['pending', 'postdated', 'handed_over', 'deposited'].includes(r.status) && days <= 7 && days >= 0;
    });
    return {
      issuedCount: issued.length,
      receivedCount: received.length,
      issuedAmount: issued.reduce((s, r) => s + Number(r.amount || 0), 0),
      receivedAmount: received.reduce((s, r) => s + Number(r.amount || 0), 0),
      dueSoonCount: dueSoon.length,
    };
  }, [rows]);

  const openNew = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (r: Cheque) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.cheque_number || !form.beneficiary_name) { toast.error('رقم الشيك واسم المستفيد مطلوبان'); return; }
    try {
      const payload: any = { ...form, amount: Number(form.amount || 0) };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_cheques').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_cheques').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_cheques'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const setStatus = async (r: Cheque, next: string, extra: Record<string, any> = {}) => {
    const { error } = await (supabase as any).from('acc_cheques').update({ status: next, ...extra }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم تحديث الحالة');
    qc.invalidateQueries({ queryKey: ['acc_cheques'] });
  };

  const del = async (r: Cheque) => {
    if (!confirm(`حذف الشيك ${r.cheque_number}؟`)) return;
    const { error } = await (supabase as any).from('acc_cheques').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_cheques'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الشيكات (صادرة / واردة)</h1>
            <p className="text-xs text-muted-foreground">إدارة الشيكات مع تتبع الاستحقاق، الإيداع، التحصيل، والارتداد</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="سجل الشيكات"
            headers={['الرقم', 'النوع', 'المستفيد', 'البنك المسحوب عليه', 'تاريخ الإصدار', 'الاستحقاق', 'المبلغ', 'الحالة']}
            rows={filtered.map(r => [r.cheque_number, typeLabels[r.cheque_type], r.beneficiary_name, r.drawer_bank || '-', r.issue_date, r.due_date, Number(r.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 }), statusLabels[r.status] || r.status])}
            kpis={[{ label: 'صادرة', value: totals.issuedCount }, { label: 'واردة', value: totals.receivedCount }, { label: 'مبلغ الصادرة', value: totals.issuedAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) }, { label: 'مبلغ الواردة', value: totals.receivedAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) }]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> شيك جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">شيكات صادرة</div><div className="text-2xl font-bold text-blue-600">{totals.issuedCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">شيكات واردة</div><div className="text-2xl font-bold text-emerald-600">{totals.receivedCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مبلغ الصادرة</div><div className="text-lg font-bold">{totals.issuedAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مبلغ الواردة</div><div className="text-lg font-bold">{totals.receivedAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">تستحق خلال 7 أيام</div><div className="text-2xl font-bold text-amber-600">{totals.dueSoonCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>الشيكات ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="issued">صادر</SelectItem>
                <SelectItem value="received">وارد</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>الرقم</TableHead><TableHead>النوع</TableHead><TableHead>المستفيد</TableHead>
              <TableHead>البنك</TableHead><TableHead>الإصدار</TableHead><TableHead>الاستحقاق</TableHead>
              <TableHead className="text-right">المبلغ</TableHead><TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">لا توجد شيكات</TableCell></TableRow>
                  : filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.cheque_number}</TableCell>
                      <TableCell><Badge variant={r.cheque_type === 'issued' ? 'default' : 'secondary'}>{typeLabels[r.cheque_type]}</Badge></TableCell>
                      <TableCell className="font-medium">{r.beneficiary_name}</TableCell>
                      <TableCell className="text-xs">{r.drawer_bank || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.issue_date}</TableCell>
                      <TableCell className="font-mono text-xs">{r.due_date}</TableCell>
                      <TableCell className="text-right font-mono">{Number(r.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status] || r.status}</Badge></TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && ['pending', 'postdated', 'handed_over'].includes(r.status) && r.cheque_type === 'received' &&
                            <Button size="sm" variant="ghost" title="إيداع" onClick={() => setStatus(r, 'deposited')}><ArrowDownToLine className="w-3.5 h-3.5 text-blue-600" /></Button>}
                          {canEdit && ['pending', 'deposited', 'postdated', 'handed_over'].includes(r.status) &&
                            <Button size="sm" variant="ghost" title="تحصيل / صرف" onClick={() => setStatus(r, 'cleared', { cleared_date: new Date().toISOString().slice(0, 10) })}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                          {canEdit && ['deposited', 'pending', 'handed_over'].includes(r.status) &&
                            <Button size="sm" variant="ghost" title="ارتداد" onClick={() => { const reason = prompt('سبب الارتداد:'); if (reason) setStatus(r, 'bounced', { bounced_date: new Date().toISOString().slice(0, 10), bounce_reason: reason }); }}><XCircle className="w-3.5 h-3.5 text-red-600" /></Button>}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'تعديل شيك' : 'شيك جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>رقم الشيك *</Label><Input value={form.cheque_number || ''} onChange={e => setForm({ ...form, cheque_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>النوع</Label>
              <Select value={form.cheque_type || 'issued'} onValueChange={v => setForm({ ...form, cheque_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="issued">صادر</SelectItem><SelectItem value="received">وارد</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الحساب البنكي</Label>
              <Select value={form.bank_account_id || ''} onValueChange={v => setForm({ ...form, bank_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر حسابًا" /></SelectTrigger>
                <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.code} — {b.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>البنك المسحوب عليه</Label><Input value={form.drawer_bank || ''} onChange={e => setForm({ ...form, drawer_bank: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الساحب</Label><Input value={form.drawer_name || ''} onChange={e => setForm({ ...form, drawer_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المستفيد *</Label><Input value={form.beneficiary_name || ''} onChange={e => setForm({ ...form, beneficiary_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>نوع المستفيد</Label>
              <Select value={form.beneficiary_type || ''} onValueChange={v => setForm({ ...form, beneficiary_type: v })}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">مورد</SelectItem>
                  <SelectItem value="customer">عميل</SelectItem>
                  <SelectItem value="employee">موظف</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>تاريخ الإصدار</Label><Input type="date" value={form.issue_date || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>تاريخ الاستحقاق</Label><Input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المبلغ</Label><Input type="number" step="0.01" value={form.amount ?? 0} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={form.currency || 'SAR'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={form.status || 'pending'} onValueChange={v => setForm({ ...form, status: v })}>
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

export default AccChequesPage;
