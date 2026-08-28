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
import { Plus, Pencil, Trash2, Package, Lock } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Row {
  id: string; period_year: number; period_month: number;
  warehouse_code: string; warehouse_name: string;
  item_code: string; item_name: string; uom?: string | null;
  opening_qty: number; opening_value: number;
  receipts_qty: number; receipts_value: number;
  issues_qty: number; issues_value: number;
  closing_qty: number; closing_value: number;
  unit_cost: number;
  valuation_method: 'WAC' | 'FIFO' | 'LIFO' | 'STANDARD';
  status: string; notes?: string | null;
}

const methodLabels: Record<string, string> = { WAC: 'المتوسط المرجح', FIFO: 'FIFO', LIFO: 'LIFO', STANDARD: 'التكلفة المعيارية' };
const statusLabels: Record<string, string> = { draft: 'مسودة', posted: 'مرحّل', locked: 'مغلق' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', posted: 'bg-emerald-100 text-emerald-700', locked: 'bg-gray-200 text-gray-700',
};

const now = new Date();
const empty = (): Partial<Row> => ({
  period_year: now.getFullYear(), period_month: now.getMonth() + 1,
  warehouse_code: '', warehouse_name: '', item_code: '', item_name: '',
  opening_qty: 0, opening_value: 0, receipts_qty: 0, receipts_value: 0,
  issues_qty: 0, issues_value: 0, valuation_method: 'WAC', status: 'draft',
});

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calc = (f: Partial<Row>) => {
  const oq = Number(f.opening_qty || 0), ov = Number(f.opening_value || 0);
  const rq = Number(f.receipts_qty || 0), rv = Number(f.receipts_value || 0);
  const iq = Number(f.issues_qty || 0), iv = Number(f.issues_value || 0);
  const closing_qty = +(oq + rq - iq).toFixed(4);
  const closing_value = +(ov + rv - iv).toFixed(2);
  const unit_cost = closing_qty > 0 ? +(closing_value / closing_qty).toFixed(4) : 0;
  return { closing_qty, closing_value, unit_cost };
};

const AccInventoryValuationPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_inventory_valuation' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_inventory_valuation' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_inventory_valuation' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Row>>(empty());
  const [fYear, setFYear] = useState<number>(now.getFullYear());
  const [fMonth, setFMonth] = useState<number>(now.getMonth() + 1);
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_inventory_valuation', fYear, fMonth],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_inventory_valuation').select('*')
        .eq('period_year', fYear).eq('period_month', fMonth).order('warehouse_code').order('item_code');
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.item_code.toLowerCase().includes(q) || r.item_name.toLowerCase().includes(q) ||
      r.warehouse_code.toLowerCase().includes(q) || r.warehouse_name.toLowerCase().includes(q));
  }, [rows, search]);

  const derived = useMemo(() => calc(form), [form]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    opening: a.opening + Number(r.opening_value || 0),
    receipts: a.receipts + Number(r.receipts_value || 0),
    issues: a.issues + Number(r.issues_value || 0),
    closing: a.closing + Number(r.closing_value || 0),
    items: a.items + 1,
  }), { opening: 0, receipts: 0, issues: 0, closing: 0, items: 0 }), [filtered]);

  const openNew = () => { setForm({ ...empty(), period_year: fYear, period_month: fMonth }); setOpen(true); };
  const openEdit = (r: Row) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.warehouse_code || !form.item_code) { toast.error('كود المخزن والصنف مطلوب'); return; }
    try {
      const d = calc(form);
      const payload: any = { ...form, ...d };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_inventory_valuation').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_inventory_valuation').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_inventory_valuation'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const post = async (r: Row) => {
    if (!confirm(`ترحيل صنف ${r.item_code}؟`)) return;
    const { error } = await (supabase as any).from('acc_inventory_valuation').update({ status: 'posted' }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الترحيل');
    qc.invalidateQueries({ queryKey: ['acc_inventory_valuation'] });
  };

  const del = async (r: Row) => {
    if (r.status !== 'draft') { toast.error('يمكن حذف المسودات فقط'); return; }
    if (!confirm(`حذف صف ${r.item_code}؟`)) return;
    const { error } = await (supabase as any).from('acc_inventory_valuation').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_inventory_valuation'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">تقييم المخزون (Inventory Valuation)</h1>
            <p className="text-xs text-muted-foreground">أرصدة أول المدة، الحركات، وأرصدة آخر المدة بتكلفة الوحدة لكل صنف/مخزن</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={String(fYear)} onValueChange={v => setFYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(fMonth)} onValueChange={v => setFMonth(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <ExportPdfButton
            title={`تقييم المخزون — ${fYear}/${fMonth}`}
            headers={['المخزن', 'الصنف', 'اسم الصنف', 'الطريقة', 'أول', 'وارد', 'صادر', 'رصيد', 'قيمة الرصيد', 'تكلفة وحدة']}
            rows={filtered.map(r => [r.warehouse_code, r.item_code, r.item_name, r.valuation_method, fmt(r.opening_value), fmt(r.receipts_value), fmt(r.issues_value), fmt(r.closing_qty), fmt(r.closing_value), fmt(r.unit_cost)])}
            kpis={[
              { label: 'الأصناف', value: totals.items },
              { label: 'أول المدة', value: fmt(totals.opening) },
              { label: 'وارد', value: fmt(totals.receipts) },
              { label: 'رصيد آخر المدة', value: fmt(totals.closing) },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> صنف جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">عدد الأصناف</div><div className="text-2xl font-bold">{totals.items}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">أول المدة</div><div className="text-lg font-bold">{fmt(totals.opening)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الوارد</div><div className="text-lg font-bold text-emerald-600">{fmt(totals.receipts)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الصادر</div><div className="text-lg font-bold text-rose-600">{fmt(totals.issues)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">رصيد آخر المدة</div><div className="text-lg font-bold text-primary">{fmt(totals.closing)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle>سجل الفترة {fYear}/{fMonth} ({filtered.length})</CardTitle>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالصنف أو المخزن..." className="w-64" />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>المخزن</TableHead><TableHead>الصنف</TableHead>
              <TableHead>الطريقة</TableHead>
              <TableHead className="text-right">أول (قيمة)</TableHead>
              <TableHead className="text-right">وارد</TableHead>
              <TableHead className="text-right">صادر</TableHead>
              <TableHead className="text-right">كمية الرصيد</TableHead>
              <TableHead className="text-right">قيمة الرصيد</TableHead>
              <TableHead className="text-right">تكلفة وحدة</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={11} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">لا توجد بيانات لهذه الفترة</TableCell></TableRow>
                  : filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs"><div className="font-mono">{r.warehouse_code}</div><div className="text-muted-foreground">{r.warehouse_name}</div></TableCell>
                      <TableCell className="text-xs"><div className="font-mono">{r.item_code}</div><div className="text-muted-foreground">{r.item_name}</div></TableCell>
                      <TableCell><Badge variant="outline">{methodLabels[r.valuation_method]}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.opening_value)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{fmt(r.receipts_value)}</TableCell>
                      <TableCell className="text-right font-mono text-rose-600">{fmt(r.issues_value)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.closing_qty)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{fmt(r.closing_value)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.unit_cost)}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && r.status === 'draft' && <Button size="sm" variant="ghost" title="ترحيل" onClick={() => post(r)}><Lock className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                          {canEdit && r.status !== 'locked' && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                          {canDelete && r.status === 'draft' && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
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
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.item_code}` : 'صف تقييم مخزون جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>السنة</Label>
              <Select value={String(form.period_year || fYear)} onValueChange={v => setForm({ ...form, period_year: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الشهر</Label>
              <Select value={String(form.period_month || fMonth)} onValueChange={v => setForm({ ...form, period_month: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>طريقة التقييم</Label>
              <Select value={form.valuation_method || 'WAC'} onValueChange={v => setForm({ ...form, valuation_method: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(methodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>كود المخزن *</Label><Input value={form.warehouse_code || ''} onChange={e => setForm({ ...form, warehouse_code: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>اسم المخزن</Label><Input value={form.warehouse_name || ''} onChange={e => setForm({ ...form, warehouse_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>كود الصنف *</Label><Input value={form.item_code || ''} onChange={e => setForm({ ...form, item_code: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>اسم الصنف</Label><Input value={form.item_name || ''} onChange={e => setForm({ ...form, item_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الوحدة</Label><Input value={form.uom || ''} onChange={e => setForm({ ...form, uom: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>كمية أول المدة</Label><Input type="number" step="0.0001" value={form.opening_qty ?? 0} onChange={e => setForm({ ...form, opening_qty: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>قيمة أول المدة</Label><Input type="number" step="0.01" value={form.opening_value ?? 0} onChange={e => setForm({ ...form, opening_value: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>كمية الوارد</Label><Input type="number" step="0.0001" value={form.receipts_qty ?? 0} onChange={e => setForm({ ...form, receipts_qty: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>قيمة الوارد</Label><Input type="number" step="0.01" value={form.receipts_value ?? 0} onChange={e => setForm({ ...form, receipts_value: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>كمية الصادر</Label><Input type="number" step="0.0001" value={form.issues_qty ?? 0} onChange={e => setForm({ ...form, issues_qty: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>قيمة الصادر</Label><Input type="number" step="0.01" value={form.issues_value ?? 0} onChange={e => setForm({ ...form, issues_value: Number(e.target.value) })} /></div>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg text-sm grid grid-cols-3 gap-2">
            <div><span className="text-muted-foreground">كمية الرصيد: </span><span className="font-mono font-bold">{fmt(derived.closing_qty)}</span></div>
            <div><span className="text-muted-foreground">قيمة الرصيد: </span><span className="font-mono font-bold text-primary">{fmt(derived.closing_value)}</span></div>
            <div><span className="text-muted-foreground">تكلفة الوحدة: </span><span className="font-mono font-bold text-emerald-600">{fmt(derived.unit_cost)}</span></div>
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

export default AccInventoryValuationPage;
