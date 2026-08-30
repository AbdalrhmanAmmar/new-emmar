import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/accounting/FormPage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, HardDrive, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Disposal {
  id: string; disposal_number: string; disposal_date: string;
  asset_id?: string | null; asset_code: string; asset_name: string;
  disposal_type: 'sale' | 'scrap' | 'donation' | 'transfer' | 'loss';
  original_cost: number; accumulated_depreciation: number; book_value: number;
  disposal_proceeds: number; gain_loss: number;
  buyer_name?: string | null; reference?: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  notes?: string | null;
}

const typeLabels: Record<string, string> = {
  sale: 'بيع', scrap: 'إتلاف/كهنة', donation: 'تبرع/هبة', transfer: 'تحويل', loss: 'فقد/سرقة',
};
const typeColors: Record<string, string> = {
  sale: 'bg-emerald-100 text-emerald-700', scrap: 'bg-rose-100 text-rose-700',
  donation: 'bg-purple-100 text-purple-700', transfer: 'bg-blue-100 text-blue-700', loss: 'bg-orange-100 text-orange-700',
};
const statusLabels: Record<string, string> = { draft: 'مسودة', posted: 'مرحّل', cancelled: 'ملغي' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', posted: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-gray-100 text-gray-700',
};

const empty = (): Partial<Disposal> => ({
  disposal_number: `DSP-${Date.now().toString().slice(-6)}`,
  disposal_date: new Date().toISOString().slice(0, 10),
  asset_code: '', asset_name: '', disposal_type: 'sale',
  original_cost: 0, accumulated_depreciation: 0, disposal_proceeds: 0, status: 'draft',
});

const fmt = (n: number) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calc = (f: Partial<Disposal>) => {
  const cost = Number(f.original_cost || 0);
  const acc = Number(f.accumulated_depreciation || 0);
  const proc = Number(f.disposal_proceeds || 0);
  const bv = +(cost - acc).toFixed(2);
  const gl = +(proc - bv).toFixed(2);
  return { book_value: bv, gain_loss: gl };
};

const AccAssetDisposalPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_asset_disposal' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_asset_disposal' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_asset_disposal' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Disposal>>(empty());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_asset_disposals'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_asset_disposals').select('*').order('disposal_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Disposal[];
    },
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['acc_fixed_assets_for_disposal'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_fixed_assets').select('id, asset_code, asset_name, purchase_cost, accumulated_depreciation, status').eq('status', 'active');
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const derived = useMemo(() => calc(form), [form]);

  const totals = useMemo(() => {
    const posted = rows.filter(r => r.status === 'posted');
    return {
      count: rows.length,
      posted: posted.length,
      proceeds: posted.reduce((s, r) => s + Number(r.disposal_proceeds || 0), 0),
      gains: posted.filter(r => Number(r.gain_loss) > 0).reduce((s, r) => s + Number(r.gain_loss), 0),
      losses: posted.filter(r => Number(r.gain_loss) < 0).reduce((s, r) => s + Math.abs(Number(r.gain_loss)), 0),
    };
  }, [rows]);

  const openNew = () => { setForm(empty()); setOpen(true); };
  const openEdit = (r: Disposal) => { setForm(r); setOpen(true); };

  const pickAsset = (assetId: string) => {
    const a = assets.find((x: any) => x.id === assetId);
    if (!a) return;
    setForm(prev => ({
      ...prev, asset_id: a.id, asset_code: a.asset_code, asset_name: a.asset_name,
      original_cost: Number(a.purchase_cost || 0),
      accumulated_depreciation: Number(a.accumulated_depreciation || 0),
    }));
  };

  const save = async () => {
    if (!form.asset_code || !form.asset_name) { toast.error('بيانات الأصل مطلوبة'); return; }
    try {
      const d = calc(form);
      const payload: any = { ...form, ...d };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_asset_disposals').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_asset_disposals').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_asset_disposals'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const post = async (r: Disposal) => {
    if (!confirm(`ترحيل تصرف ${r.disposal_number}؟ سيتم تعليم الأصل كـ "متصرف به"`)) return;
    try {
      const { error: e1 } = await (supabase as any).from('acc_asset_disposals').update({ status: 'posted' }).eq('id', r.id);
      if (e1) throw e1;
      if (r.asset_id) {
        await (supabase as any).from('acc_fixed_assets').update({ status: 'disposed' }).eq('id', r.asset_id);
      }
      toast.success('تم الترحيل');
      qc.invalidateQueries({ queryKey: ['acc_asset_disposals'] });
      qc.invalidateQueries({ queryKey: ['acc_fixed_assets_for_disposal'] });
    } catch (e: any) { toast.error(e.message || 'فشل الترحيل'); }
  };

  const del = async (r: Disposal) => {
    if (r.status === 'posted') { toast.error('لا يمكن حذف تصرف مرحّل'); return; }
    if (!confirm(`حذف ${r.disposal_number}؟`)) return;
    const { error } = await (supabase as any).from('acc_asset_disposals').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_asset_disposals'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">التصرف في الأصول (Asset Disposal)</h1>
            <p className="text-xs text-muted-foreground">تسجيل البيع، الإتلاف، التبرع، والفقد للأصول الثابتة مع حساب أرباح/خسائر التصرف</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="التصرف في الأصول"
            headers={['رقم', 'التاريخ', 'الأصل', 'النوع', 'التكلفة', 'الإهلاك المتراكم', 'القيمة الدفترية', 'العائد', 'ربح/خسارة', 'الحالة']}
            rows={rows.map(r => [r.disposal_number, r.disposal_date, `${r.asset_code} — ${r.asset_name}`, typeLabels[r.disposal_type], fmt(r.original_cost), fmt(r.accumulated_depreciation), fmt(r.book_value), fmt(r.disposal_proceeds), fmt(r.gain_loss), statusLabels[r.status]])}
            kpis={[
              { label: 'الإجمالي', value: totals.count },
              { label: 'مرحّل', value: totals.posted },
              { label: 'إجمالي العائد', value: fmt(totals.proceeds) },
              { label: 'صافي ربح/خسارة', value: fmt(totals.gains - totals.losses) },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> تصرف جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي التصرفات</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مرحّلة</div><div className="text-2xl font-bold text-emerald-600">{totals.posted}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">العائد الإجمالي</div><div className="text-lg font-bold">{fmt(totals.proceeds)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">أرباح تصرفات</div><div className="text-lg font-bold text-emerald-600">{fmt(totals.gains)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">خسائر تصرفات</div><div className="text-lg font-bold text-rose-600">{fmt(totals.losses)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>سجل التصرفات ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>رقم</TableHead><TableHead>التاريخ</TableHead>
              <TableHead>الأصل</TableHead><TableHead>النوع</TableHead>
              <TableHead className="text-right">التكلفة</TableHead>
              <TableHead className="text-right">الإهلاك المتراكم</TableHead>
              <TableHead className="text-right">القيمة الدفترية</TableHead>
              <TableHead className="text-right">العائد</TableHead>
              <TableHead className="text-right">ربح/خسارة</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={11} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">لا توجد تصرفات</TableCell></TableRow>
                  : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.disposal_number}</TableCell>
                      <TableCell className="text-xs">{r.disposal_date}</TableCell>
                      <TableCell className="text-sm"><div className="font-mono text-xs">{r.asset_code}</div><div className="text-muted-foreground text-xs">{r.asset_name}</div></TableCell>
                      <TableCell><Badge className={typeColors[r.disposal_type]}>{typeLabels[r.disposal_type]}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.original_cost)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.accumulated_depreciation)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{fmt(r.book_value)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{fmt(r.disposal_proceeds)}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${Number(r.gain_loss) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(r.gain_loss)}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && r.status === 'draft' && <Button size="sm" variant="ghost" title="ترحيل" onClick={() => post(r)}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                          {canEdit && r.status !== 'posted' && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                          {canDelete && r.status !== 'posted' && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
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
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.disposal_number}` : 'تصرف جديد في أصل'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>رقم التصرف *</Label><Input value={form.disposal_number || ''} onChange={e => setForm({ ...form, disposal_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>التاريخ</Label><Input type="date" value={form.disposal_date || ''} onChange={e => setForm({ ...form, disposal_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>نوع التصرف</Label>
              <Select value={form.disposal_type || 'sale'} onValueChange={v => setForm({ ...form, disposal_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-3"><Label>اختيار الأصل من السجل</Label>
              <Select value={form.asset_id || ''} onValueChange={pickAsset}>
                <SelectTrigger><SelectValue placeholder="اختر أصلاً (يملأ الحقول تلقائياً)" /></SelectTrigger>
                <SelectContent>
                  {assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>كود الأصل *</Label><Input value={form.asset_code || ''} onChange={e => setForm({ ...form, asset_code: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>اسم الأصل *</Label><Input value={form.asset_name || ''} onChange={e => setForm({ ...form, asset_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>التكلفة الأصلية</Label><Input type="number" step="0.01" value={form.original_cost ?? 0} onChange={e => setForm({ ...form, original_cost: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الإهلاك المتراكم</Label><Input type="number" step="0.01" value={form.accumulated_depreciation ?? 0} onChange={e => setForm({ ...form, accumulated_depreciation: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>العائد من التصرف</Label><Input type="number" step="0.01" value={form.disposal_proceeds ?? 0} onChange={e => setForm({ ...form, disposal_proceeds: Number(e.target.value) })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>المشتري / الجهة المستلمة</Label><Input value={form.buyer_name || ''} onChange={e => setForm({ ...form, buyer_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>مرجع</Label><Input value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg text-sm grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">القيمة الدفترية: </span><span className="font-mono font-bold text-primary">{fmt(derived.book_value)}</span></div>
            <div><span className="text-muted-foreground">ربح/خسارة التصرف: </span><span className={`font-mono font-bold ${derived.gain_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(derived.gain_loss)}</span></div>
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

export default AccAssetDisposalPage;
