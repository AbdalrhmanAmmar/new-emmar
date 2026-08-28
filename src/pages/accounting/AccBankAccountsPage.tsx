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
import { Plus, Pencil, Trash2, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface BankAccount {
  id: string; code: string; name_ar: string; name_en?: string | null;
  account_type: 'bank' | 'cash' | 'wallet';
  bank_name?: string | null; account_number?: string | null; iban?: string | null; swift?: string | null;
  currency: string; opening_balance: number; opening_date?: string | null;
  gl_account_code?: string | null; status: string; notes?: string | null;
}

const emptyForm = (): Partial<BankAccount> => ({
  code: '', name_ar: '', account_type: 'bank', currency: 'EGP',
  opening_balance: 0, status: 'active',
});

const typeLabels: Record<string, string> = { bank: 'حساب بنكي', cash: 'صندوق نقدية', wallet: 'محفظة إلكترونية' };

const AccBankAccountsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_banks' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_banks' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_banks' as any, 'delete');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BankAccount>>(emptyForm());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_bank_accounts'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_bank_accounts').select('*').order('code');
      if (error) throw error;
      return (data || []) as BankAccount[];
    },
  });

  const totalBalance = useMemo(() => rows.reduce((s, r) => s + Number(r.opening_balance || 0), 0), [rows]);

  const openNew = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (r: BankAccount) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.code || !form.name_ar) { toast.error('الكود والاسم مطلوبان'); return; }
    try {
      const payload: any = { ...form, opening_balance: Number(form.opening_balance || 0) };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_bank_accounts').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_bank_accounts').insert(payload);
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_bank_accounts'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const del = async (r: BankAccount) => {
    if (!confirm(`حذف "${r.name_ar}"؟`)) return;
    const { error } = await (supabase as any).from('acc_bank_accounts').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_bank_accounts'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Landmark className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">البنوك والصناديق</h1>
            <p className="text-xs text-muted-foreground">إدارة الحسابات البنكية وصناديق النقدية وأرصدتها الافتتاحية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="البنوك والصناديق"
            headers={['الكود', 'الاسم', 'النوع', 'البنك', 'رقم الحساب / IBAN', 'العملة', 'الرصيد الافتتاحي', 'الحالة']}
            rows={rows.map(r => [r.code, r.name_ar, typeLabels[r.account_type] || '-', r.bank_name || '-', r.iban || r.account_number || '-', r.currency, Number(r.opening_balance).toLocaleString('en-GB', { minimumFractionDigits: 2 }), r.status === 'active' ? 'نشط' : 'موقوف'])}
            kpis={[{ label: 'عدد الحسابات', value: rows.length }, { label: 'إجمالي الأرصدة', value: totalBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 }) }]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> حساب جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الحسابات</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">حسابات بنكية</div><div className="text-2xl font-bold">{rows.filter(r => r.account_type === 'bank').length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الأرصدة الافتتاحية (EGP)</div><div className="text-2xl font-bold text-primary">{totalBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الحسابات ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>النوع</TableHead>
                <TableHead>البنك</TableHead><TableHead>رقم الحساب / IBAN</TableHead>
                <TableHead>العملة</TableHead><TableHead className="text-right">الرصيد الافتتاحي</TableHead>
                <TableHead>الحالة</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">لا توجد حسابات</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name_ar}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[r.account_type] || r.account_type}</Badge></TableCell>
                      <TableCell>{r.bank_name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.iban || r.account_number || '-'}</TableCell>
                      <TableCell>{r.currency}</TableCell>
                      <TableCell className="text-right font-mono">{Number(r.opening_balance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{r.status === 'active' ? <Badge className="bg-emerald-100 text-emerald-700">نشط</Badge> : <Badge variant="secondary">موقوف</Badge>}</TableCell>
                      <TableCell>
                        {canEdit && (
                          <RowActions>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                            {canDelete && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                          </RowActions>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{form.id ? 'تعديل الحساب' : 'حساب جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>الكود *</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الاسم *</Label><Input value={form.name_ar || ''} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>النوع</Label>
              <Select value={form.account_type || 'bank'} onValueChange={v => setForm({ ...form, account_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>البنك</Label><Input value={form.bank_name || ''} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>رقم الحساب</Label><Input value={form.account_number || ''} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>IBAN</Label><Input value={form.iban || ''} onChange={e => setForm({ ...form, iban: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>SWIFT</Label><Input value={form.swift || ''} onChange={e => setForm({ ...form, swift: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={form.currency || 'EGP'} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الرصيد الافتتاحي</Label><Input type="number" step="0.01" value={form.opening_balance ?? 0} onChange={e => setForm({ ...form, opening_balance: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>تاريخ الرصيد الافتتاحي</Label><Input type="date" value={form.opening_date || ''} onChange={e => setForm({ ...form, opening_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>كود حساب دفتر الأستاذ (اختياري)</Label><Input value={form.gl_account_code || ''} onChange={e => setForm({ ...form, gl_account_code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="inactive">موقوف</SelectItem></SelectContent>
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

export default AccBankAccountsPage;
