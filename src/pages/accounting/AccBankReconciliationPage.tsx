import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/accounting/FormPage';
import { Plus, GitCompare, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

interface BankAccount { id: string; code: string; name_ar: string; account_type: string; currency: string; }
interface Tx { id: string; bank_account_id: string; tx_date: string; reference?: string | null; description?: string | null; debit: number; credit: number; reconciled: boolean; }

const AccBankReconciliationPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_reconciliation' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_reconciliation' as any, 'edit');

  const [accountId, setAccountId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statementBalance, setStatementBalance] = useState<number>(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [txForm, setTxForm] = useState<Partial<Tx>>({ tx_date: new Date().toISOString().slice(0, 10), debit: 0, credit: 0 });

  const { data: accounts = [] } = useQuery({
    queryKey: ['acc_bank_accounts_list'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_bank_accounts').select('id,code,name_ar,account_type,currency').eq('status', 'active').order('code');
      if (error) throw error;
      return (data || []) as BankAccount[];
    },
  });

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['acc_bank_transactions', accountId, dateFrom, dateTo],
    enabled: !!accountId,
    queryFn: async () => {
      let q = (supabase as any).from('acc_bank_transactions').select('*').eq('bank_account_id', accountId).order('tx_date', { ascending: false });
      if (dateFrom) q = q.gte('tx_date', dateFrom);
      if (dateTo) q = q.lte('tx_date', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Tx[];
    },
  });

  const totals = useMemo(() => {
    const debit = txs.reduce((s, t) => s + Number(t.debit || 0), 0);
    const credit = txs.reduce((s, t) => s + Number(t.credit || 0), 0);
    const bookBalance = debit - credit;
    const reconciled = txs.filter(t => t.reconciled).reduce((s, t) => s + Number(t.debit || 0) - Number(t.credit || 0), 0);
    const unreconciled = bookBalance - reconciled;
    const diff = statementBalance - bookBalance;
    return { debit, credit, bookBalance, reconciled, unreconciled, diff, count: txs.length, reconciledCount: txs.filter(t => t.reconciled).length };
  }, [txs, statementBalance]);

  const toggle = (id: string) => setSelected(s => ({ ...s, [id]: !s[id] }));
  const allSelectedIds = Object.keys(selected).filter(k => selected[k]);

  const markReconciled = async (value: boolean) => {
    if (allSelectedIds.length === 0) { toast.error('اختر معاملات أولاً'); return; }
    const { error } = await (supabase as any).from('acc_bank_transactions').update({
      reconciled: value, reconciled_at: value ? new Date().toISOString() : null, reconciled_by: value ? user?.id : null,
    }).in('id', allSelectedIds);
    if (error) return toast.error(error.message);
    toast.success(value ? 'تم تحديد كمُطابق' : 'تم إلغاء المطابقة');
    setSelected({});
    qc.invalidateQueries({ queryKey: ['acc_bank_transactions'] });
  };

  const addTx = async () => {
    if (!accountId) { toast.error('اختر حسابًا'); return; }
    if (!txForm.tx_date) { toast.error('التاريخ مطلوب'); return; }
    const debit = Number(txForm.debit || 0);
    const credit = Number(txForm.credit || 0);
    if (debit === 0 && credit === 0) { toast.error('أدخل مبلغ مدين أو دائن'); return; }
    const { error } = await (supabase as any).from('acc_bank_transactions').insert({
      bank_account_id: accountId, tx_date: txForm.tx_date, reference: txForm.reference || null,
      description: txForm.description || null, debit, credit, created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success('تم الإضافة'); setAddOpen(false);
    setTxForm({ tx_date: new Date().toISOString().slice(0, 10), debit: 0, credit: 0 });
    qc.invalidateQueries({ queryKey: ['acc_bank_transactions'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <GitCompare className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">التسويات البنكية</h1>
            <p className="text-xs text-muted-foreground">مطابقة معاملات دفاترك مع كشف حساب البنك</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="التسويات البنكية"
            subtitle={accounts.find(a => a.id === accountId)?.name_ar || ''}
            headers={['التاريخ', 'المرجع', 'الوصف', 'مدين', 'دائن', 'الحالة']}
            rows={txs.map(t => [t.tx_date, t.reference || '-', t.description || '-', Number(t.debit).toLocaleString('en-GB', { minimumFractionDigits: 2 }), Number(t.credit).toLocaleString('en-GB', { minimumFractionDigits: 2 }), t.reconciled ? 'مُطابق' : 'غير مطابق'])}
            kpis={[{ label: 'رصيد الدفاتر', value: totals.bookBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }, { label: 'رصيد البنك', value: statementBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }, { label: 'الفرق', value: totals.diff.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }]}
            disabled={!accountId}
          />
          {canEdit && <Button onClick={() => setAddOpen(true)} disabled={!accountId}><Plus className="w-4 h-4 ml-2" /> معاملة يدوية</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5"><Label>الحساب البنكي</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="اختر حسابًا" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>من تاريخ</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>إلى تاريخ</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>رصيد كشف البنك (للمقارنة)</Label><Input type="number" step="0.01" value={statementBalance} onChange={e => setStatementBalance(Number(e.target.value || 0))} /></div>
          </div>
        </CardContent>
      </Card>

      {accountId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">رصيد الدفاتر</div><div className="text-lg font-bold">{totals.bookBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">رصيد كشف البنك</div><div className="text-lg font-bold">{statementBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">الفرق</div><div className={`text-lg font-bold ${Math.abs(totals.diff) < 0.01 ? 'text-emerald-600' : 'text-destructive'}`}>{totals.diff.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مُطابق / إجمالي</div><div className="text-lg font-bold">{totals.reconciledCount} / {totals.count}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>المعاملات</CardTitle>
              {canEdit && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => markReconciled(true)} disabled={allSelectedIds.length === 0}><CheckCircle2 className="w-4 h-4 ml-1 text-emerald-600" /> مُطابق ({allSelectedIds.length})</Button>
                  <Button size="sm" variant="outline" onClick={() => markReconciled(false)} disabled={allSelectedIds.length === 0}><XCircle className="w-4 h-4 ml-1 text-destructive" /> إلغاء مطابقة</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>التاريخ</TableHead><TableHead>المرجع</TableHead><TableHead>الوصف</TableHead>
                  <TableHead className="text-right">مدين</TableHead><TableHead className="text-right">دائن</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                    : txs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">لا توجد معاملات</TableCell></TableRow>
                      : txs.map(t => (
                        <TableRow key={t.id} className={t.reconciled ? 'bg-emerald-50/40' : ''}>
                          <TableCell><Checkbox checked={!!selected[t.id]} onCheckedChange={() => toggle(t.id)} /></TableCell>
                          <TableCell className="font-mono text-xs">{t.tx_date}</TableCell>
                          <TableCell className="font-mono text-xs">{t.reference || '-'}</TableCell>
                          <TableCell>{t.description || '-'}</TableCell>
                          <TableCell className="text-right font-mono">{Number(t.debit).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono">{Number(t.credit).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>{t.reconciled ? <Badge className="bg-emerald-100 text-emerald-700">مُطابق</Badge> : <Badge variant="secondary">غير مطابق</Badge>}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>معاملة بنكية يدوية</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>التاريخ</Label><Input type="date" value={txForm.tx_date || ''} onChange={e => setTxForm({ ...txForm, tx_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>المرجع</Label><Input value={txForm.reference || ''} onChange={e => setTxForm({ ...txForm, reference: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label>الوصف</Label><Input value={txForm.description || ''} onChange={e => setTxForm({ ...txForm, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>مدين (إيداع)</Label><Input type="number" step="0.01" value={txForm.debit ?? 0} onChange={e => setTxForm({ ...txForm, debit: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>دائن (سحب)</Label><Input type="number" step="0.01" value={txForm.credit ?? 0} onChange={e => setTxForm({ ...txForm, credit: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={addTx}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccBankReconciliationPage;
