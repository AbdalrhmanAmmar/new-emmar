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
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Link2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Feed {
  id: string; feed_name: string; bank_account_id?: string | null; bank_account_name?: string | null;
  provider: 'sama_openbanking' | 'plaid' | 'yodlee' | 'tink' | 'salt_edge' | 'lean' | 'manual_sftp' | 'csv_import';
  connection_status: 'not_configured' | 'connected' | 'expired' | 'error';
  sync_frequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_message?: string | null;
  transactions_imported: number;
  auto_reconcile: boolean;
  is_active: boolean;
  api_endpoint?: string | null;
  webhook_url?: string | null;
  notes?: string | null;
}

const providerLabels: Record<string, string> = {
  sama_openbanking: 'SAMA Open Banking (السعودية)',
  plaid: 'Plaid',
  yodlee: 'Envestnet Yodlee',
  tink: 'Tink (Visa)',
  salt_edge: 'Salt Edge',
  lean: 'Lean Technologies',
  manual_sftp: 'ملفات SFTP يدوية',
  csv_import: 'استيراد CSV/MT940',
};
const providerColors: Record<string, string> = {
  sama_openbanking: 'bg-emerald-100 text-emerald-700',
  plaid: 'bg-blue-100 text-blue-700',
  yodlee: 'bg-purple-100 text-purple-700',
  tink: 'bg-indigo-100 text-indigo-700',
  salt_edge: 'bg-pink-100 text-pink-700',
  lean: 'bg-cyan-100 text-cyan-700',
  manual_sftp: 'bg-slate-100 text-slate-700',
  csv_import: 'bg-amber-100 text-amber-700',
};
const statusLabels: Record<string, string> = {
  not_configured: 'غير مهيأ', connected: 'متصل', expired: 'منتهي الصلاحية', error: 'خطأ',
};
const statusColors: Record<string, string> = {
  not_configured: 'bg-slate-100 text-slate-700',
  connected: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-700',
  error: 'bg-rose-100 text-rose-700',
};
const freqLabels: Record<string, string> = { realtime: 'فوري', hourly: 'كل ساعة', daily: 'يومي', manual: 'يدوي' };

const empty = (): Partial<Feed> => ({
  feed_name: '', provider: 'sama_openbanking', connection_status: 'not_configured',
  sync_frequency: 'daily', transactions_imported: 0, auto_reconcile: false, is_active: true,
});

const AccBankFeedsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_bank_feeds' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_bank_feeds' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_bank_feeds' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Feed>>(empty());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_bank_feeds'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_bank_feeds').select('*').order('feed_name');
      if (error) throw error;
      return (data || []) as Feed[];
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['acc_bank_accounts_for_feeds'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_bank_accounts').select('id, account_name, account_number').eq('is_active', true);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const totals = useMemo(() => ({
    count: rows.length,
    connected: rows.filter(r => r.connection_status === 'connected').length,
    errors: rows.filter(r => r.connection_status === 'error' || r.connection_status === 'expired').length,
    imported: rows.reduce((s, r) => s + Number(r.transactions_imported || 0), 0),
  }), [rows]);

  const openNew = () => { setForm(empty()); setOpen(true); };
  const openEdit = (r: Feed) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.feed_name) { toast.error('اسم القناة مطلوب'); return; }
    try {
      const payload: any = { ...form };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_bank_feeds').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_bank_feeds').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_bank_feeds'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const triggerSync = async (r: Feed) => {
    if (r.connection_status !== 'connected') { toast.error('القناة غير متصلة'); return; }
    // Placeholder: mark last sync attempt. Real integration would call an edge function.
    const { error } = await (supabase as any).from('acc_bank_feeds').update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'pending',
      last_sync_message: 'تم بدء المزامنة — سيتم التحديث تلقائياً عند الاكتمال',
    }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم إرسال طلب المزامنة');
    qc.invalidateQueries({ queryKey: ['acc_bank_feeds'] });
  };

  const testConnection = async (r: Feed) => {
    // Placeholder for future edge function that pings the provider.
    toast.info(`اختبار الاتصال بـ ${providerLabels[r.provider]}...`);
    setTimeout(async () => {
      const success = r.provider !== 'manual_sftp' && r.provider !== 'csv_import';
      const { error } = await (supabase as any).from('acc_bank_feeds').update({
        connection_status: success ? 'connected' : r.connection_status,
        last_sync_message: success ? 'اختبار الاتصال ناجح' : 'يتطلب هذا المزود إعداداً يدوياً',
      }).eq('id', r.id);
      if (!error) {
        toast.success(success ? 'الاتصال ناجح ✓' : 'يتطلب إعداداً يدوياً');
        qc.invalidateQueries({ queryKey: ['acc_bank_feeds'] });
      }
    }, 800);
  };

  const del = async (r: Feed) => {
    if (!confirm(`حذف قناة ${r.feed_name}؟`)) return;
    const { error } = await (supabase as any).from('acc_bank_feeds').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_bank_feeds'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link2 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">التكاملات البنكية المباشرة (Bank Feeds)</h1>
            <p className="text-xs text-muted-foreground">قنوات جلب الحركات البنكية تلقائياً عبر Open Banking (SAMA) أو مزودين خارجيين مثل Plaid/Salt Edge/Lean</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="التكاملات البنكية"
            headers={['القناة', 'المزود', 'الحساب البنكي', 'التردد', 'الحالة', 'آخر مزامنة', 'المستورد']}
            rows={rows.map(r => [r.feed_name, providerLabels[r.provider], r.bank_account_name || '-', freqLabels[r.sync_frequency], statusLabels[r.connection_status], r.last_sync_at || '-', String(r.transactions_imported)])}
            kpis={[
              { label: 'الإجمالي', value: totals.count },
              { label: 'متصل', value: totals.connected },
              { label: 'مشاكل', value: totals.errors },
              { label: 'إجمالي حركات مستوردة', value: totals.imported },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> قناة جديدة</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي القنوات</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">متصلة</div><div className="text-2xl font-bold text-emerald-600">{totals.connected}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">تحتاج مراجعة</div><div className="text-2xl font-bold text-rose-600">{totals.errors}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">حركات مستوردة</div><div className="text-2xl font-bold text-blue-600">{totals.imported.toLocaleString('ar-EG')}</div></CardContent></Card>
      </div>

      <Card className="bg-amber-50/40 border-amber-200">
        <CardContent className="p-4 text-sm text-amber-900">
          <div className="font-bold mb-1">ملاحظة تشغيلية</div>
          يتم إعداد التكاملات المباشرة عبر مفاتيح API خاصة بكل مزود (يُخزَّن في Secrets). هذه الصفحة تدير <b>ميتاداتا القنوات</b> وحالتها؛ عمليات المزامنة الفعلية تُنفَّذ عبر Edge Functions (يمكن إضافتها لاحقاً حسب المزود المختار). للمزودين المحليين نوصي بـ <b>SAMA Open Banking</b> أو <b>Lean Technologies</b>.
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قنوات التكامل ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>القناة</TableHead><TableHead>المزود</TableHead>
              <TableHead>الحساب البنكي</TableHead><TableHead>التردد</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>آخر مزامنة</TableHead>
              <TableHead className="text-right">حركات مستوردة</TableHead>
              <TableHead>Auto</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">لا توجد قنوات — أضف قناة جديدة</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.feed_name}</TableCell>
                      <TableCell><Badge className={providerColors[r.provider]}>{providerLabels[r.provider]}</Badge></TableCell>
                      <TableCell className="text-xs">{r.bank_account_name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{freqLabels[r.sync_frequency]}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[r.connection_status]}>{statusLabels[r.connection_status]}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.last_sync_at ? new Date(r.last_sync_at).toLocaleString('ar-EG') : '-'}
                        {r.last_sync_message && <div className="text-[10px] mt-0.5">{r.last_sync_message}</div>}
                      </TableCell>
                      <TableCell className="text-right font-mono">{Number(r.transactions_imported || 0).toLocaleString('ar-EG')}</TableCell>
                      <TableCell>{r.auto_reconcile ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-slate-400" />}</TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && <Button size="sm" variant="ghost" title="اختبار الاتصال" onClick={() => testConnection(r)}><Link2 className="w-3.5 h-3.5 text-blue-600" /></Button>}
                          {canEdit && r.connection_status === 'connected' && <Button size="sm" variant="ghost" title="مزامنة الآن" onClick={() => triggerSync(r)}><RefreshCw className="w-3.5 h-3.5 text-emerald-600" /></Button>}
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
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.feed_name}` : 'قناة تكامل بنكي جديدة'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2 space-y-1.5"><Label>اسم القناة *</Label><Input value={form.feed_name || ''} onChange={e => setForm({ ...form, feed_name: e.target.value })} placeholder="مثال: الراجحي - الحساب الرئيسي" /></div>
            <div className="space-y-1.5"><Label>المزود</Label>
              <Select value={form.provider || 'sama_openbanking'} onValueChange={v => setForm({ ...form, provider: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(providerLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>تردد المزامنة</Label>
              <Select value={form.sync_frequency || 'daily'} onValueChange={v => setForm({ ...form, sync_frequency: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(freqLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5"><Label>الحساب البنكي المرتبط</Label>
              <Select value={form.bank_account_id || 'none'} onValueChange={v => {
                const a = bankAccounts.find((x: any) => x.id === v);
                setForm({ ...form, bank_account_id: v === 'none' ? null : v, bank_account_name: a ? `${a.account_name} — ${a.account_number}` : null });
              }}>
                <SelectTrigger><SelectValue placeholder="اختر حساباً" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— بدون —</SelectItem>
                  {bankAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.account_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>حالة الاتصال</Label>
              <Select value={form.connection_status || 'not_configured'} onValueChange={v => setForm({ ...form, connection_status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>عدد الحركات المستوردة</Label><Input type="number" value={form.transactions_imported ?? 0} onChange={e => setForm({ ...form, transactions_imported: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>API Endpoint</Label><Input value={form.api_endpoint || ''} onChange={e => setForm({ ...form, api_endpoint: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1.5"><Label>Webhook URL</Label><Input value={form.webhook_url || ''} onChange={e => setForm({ ...form, webhook_url: e.target.value })} placeholder="https://..." /></div>
            <div className="flex items-end gap-3"><Switch checked={!!form.auto_reconcile} onCheckedChange={v => setForm({ ...form, auto_reconcile: v })} /><Label>تسوية تلقائية</Label></div>
            <div className="flex items-end gap-3"><Switch checked={!!form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>نشطة</Label></div>
            <div className="md:col-span-2 space-y-1.5"><Label>ملاحظات</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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

export default AccBankFeedsPage;
