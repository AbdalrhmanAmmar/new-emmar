import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CheckCircle2, Trash2, Wallet, Banknote, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Payment {
  id: string; payment_no: string; payment_date: string; direction: 'inbound' | 'outbound';
  method: string; status: string; party_name: string; amount: number; currency: string;
  reference_no: string | null; notes: string | null;
}

const statusColor: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800',
  posted: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};
const statusAr: Record<string, string> = { draft: 'مسوّدة', posted: 'مُعتمد', cancelled: 'ملغى' };
const methodAr: Record<string, string> = { cash: 'نقدي', bank_transfer: 'تحويل بنكي', card: 'بطاقة', cheque: 'شيك', other: 'أخرى' };

const AccPaymentsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_journals' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_journals' as any, 'edit');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    direction: 'inbound' as 'inbound' | 'outbound',
    method: 'cash', party_name: '', amount: 0, reference_no: '', notes: '',
    cash_account_id: '', ar_ap_account_id: '',
  });

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['acc_payments'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_payments')
        .select('*').order('payment_date', { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['acc_coa_leaf'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_chart_of_accounts')
        .select('id, code, name_ar, account_type').eq('is_group', false).eq('is_active', true).order('code');
      return data ?? [];
    },
  });

  const filtered = useMemo(() => directionFilter === 'all' ? payments : payments.filter((p) => p.direction === directionFilter), [payments, directionFilter]);
  const totals = useMemo(() => ({
    inbound: payments.filter((p) => p.direction === 'inbound' && p.status === 'posted').reduce((s, p) => s + Number(p.amount || 0), 0),
    outbound: payments.filter((p) => p.direction === 'outbound' && p.status === 'posted').reduce((s, p) => s + Number(p.amount || 0), 0),
  }), [payments]);

  const resetForm = () => setForm({
    payment_date: new Date().toISOString().slice(0, 10),
    direction: 'inbound', method: 'cash', party_name: '', amount: 0,
    reference_no: '', notes: '', cash_account_id: '', ar_ap_account_id: '',
  });

  const save = async () => {
    if (!form.party_name || form.amount <= 0) return toast.error('أدخل الطرف والمبلغ');
    try {
      const { data: nextNo } = await (supabase as any).rpc('acc_next_payment_no');
      const { error } = await (supabase as any).from('acc_payments').insert({
        payment_no: nextNo, payment_date: form.payment_date, direction: form.direction,
        method: form.method, status: 'draft', party_name: form.party_name, amount: form.amount,
        reference_no: form.reference_no || null, notes: form.notes || null,
        cash_account_id: form.cash_account_id || null, ar_ap_account_id: form.ar_ap_account_id || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success('تم إنشاء المستند');
      setDialogOpen(false); resetForm();
      qc.invalidateQueries({ queryKey: ['acc_payments'] });
    } catch (e: any) { toast.error(e.message); }
  };

  const post = async (p: Payment) => {
    const { error } = await (supabase as any).from('acc_payments')
      .update({ status: 'posted', posted_at: new Date().toISOString(), posted_by: user?.id }).eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('تم الاعتماد');
    qc.invalidateQueries({ queryKey: ['acc_payments'] });
  };

  const del = async (p: Payment) => {
    if (p.status !== 'draft') return toast.error('لا يمكن حذف مستند معتمد');
    if (!confirm(`حذف ${p.payment_no}؟`)) return;
    const { error } = await (supabase as any).from('acc_payments').delete().eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_payments'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية عرض المدفوعات.</div>;

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">المدفوعات والتحصيلات</h1>
            <p className="text-sm text-muted-foreground">تسجيل الدفعات الواردة والصادرة.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportPdfButton
            title="المدفوعات والتحصيلات"
            headers={['رقم المستند', 'التاريخ', 'النوع', 'الطرف', 'الطريقة', 'العملة', 'المبلغ', 'الحالة']}
            rows={payments.map(p => [
              p.payment_no,
              new Date(p.payment_date).toLocaleDateString('ar-EG'),
              p.direction === 'inbound' ? 'تحصيل' : 'دفع',
              p.party_name,
              methodAr[p.method] ?? p.method,
              p.currency,
              Number(p.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 }),
              statusAr[p.status] ?? p.status,
            ])}
            kpis={[
              { label: 'عدد المستندات', value: payments.length },
              { label: 'إجمالي التحصيلات', value: payments.filter(p => p.direction === 'inbound').reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 }) },
              { label: 'إجمالي المدفوعات', value: payments.filter(p => p.direction === 'outbound').reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 }) },
            ]}
          />
          {canEdit && <Button onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 ml-2" /> مستند جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 flex items-center justify-between">
          <div><div className="text-xs text-muted-foreground">إجمالي التحصيلات (معتمد)</div>
            <div className="text-xl font-bold text-emerald-600">{totals.inbound.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div><ArrowDownLeft className="w-8 h-8 text-emerald-500" />
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center justify-between">
          <div><div className="text-xs text-muted-foreground">إجمالي المدفوعات (معتمد)</div>
            <div className="text-xl font-bold text-red-600">{totals.outbound.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div><ArrowUpRight className="w-8 h-8 text-red-500" />
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center justify-between">
          <div><div className="text-xs text-muted-foreground">صافي الحركة</div>
            <div className="text-xl font-bold">{(totals.inbound - totals.outbound).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div><Banknote className="w-8 h-8 text-primary" />
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'inbound', 'outbound'] as const).map((d) => (
                <Button key={d} size="sm" variant={directionFilter === d ? 'default' : 'outline'} onClick={() => setDirectionFilter(d)}>
                  {d === 'all' ? 'الكل' : d === 'inbound' ? 'تحصيلات' : 'مدفوعات'}
                </Button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-normal">{filtered.length} مستند</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">لا توجد مستندات</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم</TableHead><TableHead>التاريخ</TableHead><TableHead>الاتجاه</TableHead>
                  <TableHead>الطرف</TableHead><TableHead>الطريقة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead><TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.payment_no}</TableCell>
                    <TableCell>{new Date(p.payment_date).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.direction === 'inbound' ? 'text-emerald-700 border-emerald-300' : 'text-red-700 border-red-300'}>
                        {p.direction === 'inbound' ? 'تحصيل' : 'دفع'}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.party_name}</TableCell>
                    <TableCell>{methodAr[p.method] ?? p.method}</TableCell>
                    <TableCell className="text-right font-semibold">{Number(p.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {p.currency}</TableCell>
                    <TableCell><Badge className={statusColor[p.status]}>{statusAr[p.status]}</Badge></TableCell>
                    <TableCell>
                      <RowActions>
                        {canEdit && p.status === 'draft' && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => post(p)} title="اعتماد"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => del(p)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                          </>
                        )}
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>مستند مدفوعات جديد</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">التاريخ</Label>
              <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </div>
            <div><Label className="text-xs">الاتجاه</Label>
              <Select value={form.direction} onValueChange={(v: any) => setForm({ ...form, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">تحصيل (وارد)</SelectItem>
                  <SelectItem value="outbound">دفع (صادر)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">طريقة الدفع</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                  <SelectItem value="cheque">شيك</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">المبلغ</Label>
              <Input type="number" step="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div className="col-span-2"><Label className="text-xs">اسم الطرف (عميل/مورد)</Label>
              <Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} />
            </div>
            <div><Label className="text-xs">حساب النقدية/البنك</Label>
              <Select value={form.cash_account_id} onValueChange={(v) => setForm({ ...form, cash_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {accounts.filter((a: any) => a.account_type === 'asset').map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">حساب العميل/المورد</Label>
              <Select value={form.ar_ap_account_id} onValueChange={(v) => setForm({ ...form, ar_ap_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {accounts.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.code} — {a.name_ar}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">رقم مرجعي</Label>
              <Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} />
            </div>
            <div className="col-span-2"><Label className="text-xs">ملاحظات</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccPaymentsPage;
