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
import { Plus, Pencil, Trash2, ReceiptText, Send, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Line { id?: string; line_no: number; expense_date?: string; category?: string; gl_account_code?: string; description?: string; quantity: number; unit_price: number; amount: number; vat_rate: number; vat_amount: number; total: number; }
interface Claim {
  id: string; claim_number: string; claim_date: string;
  claimant_type: 'employee' | 'vendor' | 'other'; claimant_name: string;
  description?: string | null; currency: string;
  total_amount: number; vat_amount: number; net_amount: number;
  status: string; payment_method?: string | null; paid_at?: string | null;
  payment_reference?: string | null; notes?: string | null;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'مُقدَّم', approved: 'معتمد', rejected: 'مرفوض', paid: 'مدفوع', cancelled: 'ملغي',
};
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700',
  paid: 'bg-primary/10 text-primary', cancelled: 'bg-gray-100 text-gray-700',
};

const emptyLine = (n = 1): Line => ({ line_no: n, quantity: 1, unit_price: 0, amount: 0, vat_rate: 15, vat_amount: 0, total: 0 });
const emptyClaim = (): Partial<Claim> => ({
  claim_number: `EXP-${Date.now().toString().slice(-6)}`,
  claim_date: new Date().toISOString().slice(0, 10),
  claimant_type: 'employee', claimant_name: '', currency: 'SAR', status: 'draft',
  total_amount: 0, vat_amount: 0, net_amount: 0,
});

const claimantLabels: Record<string, string> = { employee: 'موظف', vendor: 'مورد', other: 'أخرى' };

const AccExpenseClaimsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_expense_claims' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_expense_claims' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_expense_claims' as any, 'delete');
  const canApprove = isAdmin || hasPermission('accounting_expense_claims' as any, 'approve' as any);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Claim>>(emptyClaim());
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_expense_claims'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_expense_claims').select('*').order('claim_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Claim[];
    },
  });

  const totals = useMemo(() => ({
    count: rows.length,
    pending: rows.filter(r => ['submitted', 'approved'].includes(r.status)).length,
    paid: rows.filter(r => r.status === 'paid').length,
    totalAmount: rows.reduce((s, r) => s + Number(r.net_amount || 0), 0),
  }), [rows]);

  const recalcLine = (l: Line): Line => {
    const amount = Number(l.quantity || 0) * Number(l.unit_price || 0);
    const vat_amount = (amount * Number(l.vat_rate || 0)) / 100;
    return { ...l, amount, vat_amount, total: amount + vat_amount };
  };

  const totalsFromLines = (ls: Line[]) => {
    const amt = ls.reduce((s, l) => s + Number(l.amount || 0), 0);
    const vat = ls.reduce((s, l) => s + Number(l.vat_amount || 0), 0);
    return { total_amount: amt, vat_amount: vat, net_amount: amt + vat };
  };

  const openNew = () => { setForm(emptyClaim()); setLines([emptyLine()]); setOpen(true); };
  const openEdit = async (r: Claim) => {
    setForm(r);
    const { data } = await (supabase as any).from('acc_expense_claim_lines').select('*').eq('claim_id', r.id).order('line_no');
    setLines((data && data.length ? data : [emptyLine()]) as Line[]);
    setOpen(true);
  };

  const addLine = () => setLines(ls => [...ls, emptyLine(ls.length + 1)]);
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, line_no: idx + 1 })));
  const updateLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, idx) => idx === i ? recalcLine({ ...l, ...patch }) : l));

  const totalsPreview = totalsFromLines(lines);

  const save = async () => {
    if (!form.claim_number || !form.claimant_name) { toast.error('الرقم واسم مقدم الطلب مطلوبان'); return; }
    if (lines.length === 0) { toast.error('أضف بندًا واحدًا على الأقل'); return; }
    try {
      const t = totalsFromLines(lines);
      const payload: any = { ...form, ...t };
      delete payload.id;
      const { data: saved, error } = form.id
        ? await (supabase as any).from('acc_expense_claims').update(payload).eq('id', form.id).select('id').single()
        : await (supabase as any).from('acc_expense_claims').insert({ ...payload, created_by: user?.id }).select('id').single();
      if (error) throw error;
      const claimId = saved?.id || form.id;
      // Replace lines
      await (supabase as any).from('acc_expense_claim_lines').delete().eq('claim_id', claimId);
      if (lines.length) {
        const linesPayload = lines.map(l => ({
          claim_id: claimId, line_no: l.line_no, expense_date: l.expense_date || null,
          category: l.category || null, gl_account_code: l.gl_account_code || null,
          description: l.description || null,
          quantity: Number(l.quantity || 0), unit_price: Number(l.unit_price || 0),
          amount: Number(l.amount || 0), vat_rate: Number(l.vat_rate || 0),
          vat_amount: Number(l.vat_amount || 0), total: Number(l.total || 0),
        }));
        const { error: le } = await (supabase as any).from('acc_expense_claim_lines').insert(linesPayload);
        if (le) throw le;
      }
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_expense_claims'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const setStatus = async (r: Claim, next: string, extra: Record<string, any> = {}) => {
    const { error } = await (supabase as any).from('acc_expense_claims').update({ status: next, ...extra }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم تحديث الحالة');
    qc.invalidateQueries({ queryKey: ['acc_expense_claims'] });
  };

  const del = async (r: Claim) => {
    if (!confirm(`حذف المطالبة ${r.claim_number}؟`)) return;
    const { error } = await (supabase as any).from('acc_expense_claims').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_expense_claims'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ReceiptText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">مطالبات المصروفات المستحقة</h1>
            <p className="text-xs text-muted-foreground">تسجيل مصروفات الموظفين والموردين، اعتمادها، وترحيل السداد</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="مطالبات المصروفات المستحقة"
            headers={['الرقم', 'التاريخ', 'مقدم الطلب', 'النوع', 'الوصف', 'الإجمالي', 'الضريبة', 'الصافي', 'الحالة']}
            rows={rows.map(r => [r.claim_number, r.claim_date, r.claimant_name, claimantLabels[r.claimant_type] || '-', r.description || '-', Number(r.total_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 }), Number(r.vat_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 }), Number(r.net_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 }), statusLabels[r.status] || r.status])}
            kpis={[{ label: 'العدد', value: totals.count }, { label: 'قيد الاعتماد', value: totals.pending }, { label: 'مدفوعة', value: totals.paid }, { label: 'الإجمالي', value: totals.totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) }]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> مطالبة جديدة</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي المطالبات</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">قيد الاعتماد</div><div className="text-2xl font-bold text-blue-600">{totals.pending}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مدفوعة</div><div className="text-2xl font-bold text-emerald-600">{totals.paid}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الصافي</div><div className="text-lg font-bold text-primary">{totals.totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>المطالبات ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>الرقم</TableHead><TableHead>التاريخ</TableHead>
              <TableHead>مقدم الطلب</TableHead><TableHead>النوع</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">الضريبة</TableHead>
              <TableHead className="text-right">الصافي</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">لا توجد مطالبات</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.claim_number}</TableCell>
                      <TableCell className="font-mono text-xs">{r.claim_date}</TableCell>
                      <TableCell className="font-medium">{r.claimant_name}</TableCell>
                      <TableCell><Badge variant="outline">{claimantLabels[r.claimant_type]}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{Number(r.total_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{Number(r.vat_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{Number(r.net_amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status] || r.status}</Badge></TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && r.status === 'draft' && <Button size="sm" variant="ghost" title="تقديم" onClick={() => setStatus(r, 'submitted', { submitted_at: new Date().toISOString() })}><Send className="w-3.5 h-3.5 text-blue-600" /></Button>}
                          {canApprove && r.status === 'submitted' && <>
                            <Button size="sm" variant="ghost" title="اعتماد" onClick={() => setStatus(r, 'approved', { approved_by: user?.id, approved_at: new Date().toISOString() })}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>
                            <Button size="sm" variant="ghost" title="رفض" onClick={() => { const reason = prompt('سبب الرفض:'); if (reason) setStatus(r, 'rejected', { rejection_reason: reason }); }}><XCircle className="w-3.5 h-3.5 text-red-600" /></Button>
                          </>}
                          {canEdit && r.status === 'approved' && <Button size="sm" variant="ghost" title="سداد" onClick={() => setStatus(r, 'paid', { paid_at: new Date().toISOString() })}><DollarSign className="w-3.5 h-3.5 text-primary" /></Button>}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.claim_number}` : 'مطالبة جديدة'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>رقم المطالبة *</Label><Input value={form.claim_number || ''} onChange={e => setForm({ ...form, claim_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>التاريخ</Label><Input type="date" value={form.claim_date || ''} onChange={e => setForm({ ...form, claim_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>نوع مقدم الطلب</Label>
              <Select value={form.claimant_type || 'employee'} onValueChange={v => setForm({ ...form, claimant_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(claimantLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5"><Label>اسم مقدم الطلب *</Label><Input value={form.claimant_name || ''} onChange={e => setForm({ ...form, claimant_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={form.currency || 'SAR'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div className="md:col-span-3 space-y-1.5"><Label>الوصف</Label><Input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">البنود</div>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3.5 h-3.5 ml-1" /> بند</Button>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>حساب GL</TableHead>
                  <TableHead className="w-20">الكمية</TableHead>
                  <TableHead className="w-28">سعر الوحدة</TableHead>
                  <TableHead className="w-24">قيمة</TableHead>
                  <TableHead className="w-20">ض.%</TableHead>
                  <TableHead className="w-24">ضريبة</TableHead>
                  <TableHead className="w-24">الإجمالي</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{l.line_no}</TableCell>
                      <TableCell><Input type="date" value={l.expense_date || ''} onChange={e => updateLine(i, { expense_date: e.target.value })} className="h-8 text-xs" /></TableCell>
                      <TableCell><Input value={l.description || ''} onChange={e => updateLine(i, { description: e.target.value })} className="h-8" /></TableCell>
                      <TableCell><Input value={l.gl_account_code || ''} onChange={e => updateLine(i, { gl_account_code: e.target.value })} className="h-8 font-mono text-xs" /></TableCell>
                      <TableCell><Input type="number" step="0.001" value={l.quantity} onChange={e => updateLine(i, { quantity: Number(e.target.value) })} className="h-8 text-right" /></TableCell>
                      <TableCell><Input type="number" step="0.01" value={l.unit_price} onChange={e => updateLine(i, { unit_price: Number(e.target.value) })} className="h-8 text-right" /></TableCell>
                      <TableCell className="font-mono text-right text-xs">{l.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Input type="number" step="0.01" value={l.vat_rate} onChange={e => updateLine(i, { vat_rate: Number(e.target.value) })} className="h-8 text-right" /></TableCell>
                      <TableCell className="font-mono text-right text-xs">{l.vat_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="font-mono text-right text-xs font-bold">{l.total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex justify-end gap-6 text-sm">
              <div>الإجمالي: <span className="font-mono font-bold">{totalsPreview.total_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</span></div>
              <div>الضريبة: <span className="font-mono font-bold">{totalsPreview.vat_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</span></div>
              <div className="text-primary">الصافي: <span className="font-mono font-bold text-lg">{totalsPreview.net_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</span></div>
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

export default AccExpenseClaimsPage;
