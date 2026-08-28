import React, { useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Lock, Unlock, CalendarDays, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RowActions } from "@/components/accounting/RowActions";

interface Period {
  id: string; name: string; start_date: string; end_date: string; status: string;
}
const statusColor: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-800',
  locked: 'bg-red-100 text-red-800',
};
const statusAr: Record<string, string> = { open: 'مفتوحة', closed: 'مُقفلة', locked: 'مقفلة نهائياً' };

const AccFiscalPeriodsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_reports' as any, 'view');
  const canEdit = isAdmin;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });

  const { data: periods = [], isLoading } = useQuery<Period[]>({
    queryKey: ['acc_fiscal_periods'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_fiscal_periods')
        .select('*').order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Period[];
    },
  });

  const { data: closings = [] } = useQuery({
    queryKey: ['acc_year_end_closings'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_year_end_closings').select('*');
      return data ?? [];
    },
  });

  const { data: retainedAccounts = [] } = useQuery({
    queryKey: ['acc_retained_accounts'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_chart_of_accounts')
        .select('id, code, name_ar').eq('account_type', 'equity').eq('is_group', false).order('code');
      return data ?? [];
    },
  });

  const save = async () => {
    if (!form.name || !form.start_date || !form.end_date) return toast.error('أكمل البيانات');
    const { error } = await (supabase as any).from('acc_fiscal_periods').insert({
      name: form.name, start_date: form.start_date, end_date: form.end_date, status: 'open', created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success('تم إنشاء الفترة');
    setDialogOpen(false); setForm({ name: '', start_date: '', end_date: '' });
    qc.invalidateQueries({ queryKey: ['acc_fiscal_periods'] });
  };

  const runClosing = async (p: Period) => {
    if (retainedAccounts.length === 0) return toast.error('لا يوجد حساب حقوق ملكية لترحيل الأرباح');
    const retained = window.prompt(`اختر رقم حساب الأرباح المحتجزة:\n${retainedAccounts.map((a: any) => `${a.code}: ${a.name_ar}`).join('\n')}`);
    if (!retained) return;
    const acc = retainedAccounts.find((a: any) => a.code === retained.trim());
    if (!acc) return toast.error('رمز حساب غير صحيح');
    if (!confirm(`إقفال الفترة ${p.name}؟ لا يمكن التراجع.`)) return;
    const { error } = await (supabase as any).rpc('acc_close_fiscal_period', { _period_id: p.id, _retained_account_id: acc.id });
    if (error) return toast.error(error.message);
    toast.success('تم إقفال الفترة بنجاح');
    qc.invalidateQueries({ queryKey: ['acc_fiscal_periods'] });
    qc.invalidateQueries({ queryKey: ['acc_year_end_closings'] });
  };

  const reopen = async (p: Period) => {
    if (!confirm(`إعادة فتح الفترة ${p.name}؟`)) return;
    const { error } = await (supabase as any).from('acc_fiscal_periods').update({ status: 'open' }).eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('تم فتح الفترة');
    qc.invalidateQueries({ queryKey: ['acc_fiscal_periods'] });
  };

  const del = async (p: Period) => {
    if (p.status !== 'open') return toast.error('لا يمكن حذف فترة مقفلة');
    if (!confirm(`حذف الفترة ${p.name}؟`)) return;
    const { error } = await (supabase as any).from('acc_fiscal_periods').delete().eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_fiscal_periods'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية عرض الفترات المالية.</div>;

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الفترات المالية والإقفال السنوي</h1>
            <p className="text-sm text-muted-foreground">إدارة السنوات المالية وترحيل الأرباح إلى الأرباح المحتجزة.</p>
          </div>
        </div>
        {canEdit && <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 ml-2" /> فترة جديدة</Button>}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">الفترات ({periods.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : periods.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">لا توجد فترات — أنشئ فترة جديدة للبدء.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الفترة</TableHead><TableHead>من</TableHead><TableHead>إلى</TableHead>
                <TableHead>الحالة</TableHead><TableHead>صافي الربح</TableHead><TableHead>إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {periods.map((p) => {
                  const closing = closings.find((c: any) => c.fiscal_period_id === p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{p.name}</TableCell>
                      <TableCell>{new Date(p.start_date).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell>{new Date(p.end_date).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell><Badge className={statusColor[p.status]}>{statusAr[p.status] ?? p.status}</Badge></TableCell>
                      <TableCell>{closing ? Number(closing.net_income).toLocaleString('en-GB', { minimumFractionDigits: 2 }) : '—'}</TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && p.status === 'open' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => runClosing(p)}>
                                <Lock className="w-3 h-3 ml-1" /> إقفال
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => del(p)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                            </>
                          )}
                          {canEdit && p.status === 'closed' && (
                            <Button size="sm" variant="outline" onClick={() => reopen(p)}>
                              <Unlock className="w-3 h-3 ml-1" /> إعادة فتح
                            </Button>
                          )}
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>فترة مالية جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">اسم الفترة (مثل: السنة المالية 2025)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">من</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div><Label className="text-xs">إلى</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
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

export default AccFiscalPeriodsPage;
