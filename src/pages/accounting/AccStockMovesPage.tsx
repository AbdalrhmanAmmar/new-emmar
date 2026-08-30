import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { InlineFormPage } from '@/components/accounting/InlineFormPage';

const money = (n: any) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const typeLabel: Record<string, string> = { in: 'إضافة (وارد)', out: 'صرف (منصرف)', transfer: 'تحويل بين المخازن', adjust: 'تسوية جرد' };
const typeColor: Record<string, string> = {
  in: 'bg-emerald-100 text-emerald-700',
  out: 'bg-amber-100 text-amber-700',
  transfer: 'bg-blue-100 text-blue-700',
  adjust: 'bg-muted text-muted-foreground',
};

interface Line { key: string; item_id: string; qty: number; unit_cost: number; batch_no: string; }
const newLine = (): Line => ({ key: Math.random().toString(36).slice(2), item_id: '', qty: 0, unit_cost: 0, batch_no: '' });

const AccStockMovesPage: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit = isAdmin || hasPermission('accounting_inventory' as any, 'edit');

  const [moveType, setMoveType] = useState<'in' | 'out' | 'transfer' | 'adjust'>('in');
  const [warehouseId, setWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [moveDate, setMoveDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterItem, setFilterItem] = useState('all');

  const { data: items = [] } = useQuery<any[]>({
    queryKey: ['acc_items'],
    queryFn: async () => (await (supabase as any).from('acc_items').select('*')).data ?? [],
  });
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['acc_warehouses'],
    queryFn: async () => (await (supabase as any).from('acc_warehouses').select('*')).data ?? [],
  });
  const { data: moves = [], refetch } = useQuery<any[]>({
    queryKey: ['acc_stock_moves'],
    queryFn: async () => (await (supabase as any).from('acc_stock_moves').select('*')).data ?? [],
  });

  const balance = (iId: string, wId: string) =>
    moves
      .filter((m) => m.item_id === iId && (!wId || m.warehouse_id === wId))
      .reduce((s, m) => s + Number(m.quantity_kg || 0) * (m.move_type === 'out' ? -1 : 1), 0);

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const totals = useMemo(() => lines.reduce((a, l) => {
    const it = items.find((i) => i.id === l.item_id);
    const cost = Number(l.unit_cost || it?.cost_price || 0);
    return { qty: a.qty + Number(l.qty || 0), value: a.value + Number(l.qty || 0) * cost };
  }, { qty: 0, value: 0 }), [lines, items]);

  const sorted = useMemo(
    () => [...moves]
      .filter((m) => filterItem === 'all' || m.item_id === filterItem)
      .sort((a, b) => String(b.move_date).localeCompare(String(a.move_date)))
      .slice(0, 200),
    [moves, filterItem],
  );

  const save = async () => {
    if (!warehouseId) return toast.error('اختر المخزن');
    if (moveType === 'transfer' && !toWarehouseId) return toast.error('اختر المخزن المستلم');
    if (moveType === 'transfer' && toWarehouseId === warehouseId) return toast.error('لا يمكن التحويل لنفس المخزن');
    const valid = lines.filter((l) => l.item_id && Number(l.qty) > 0);
    if (valid.length === 0) return toast.error('أضف صنفاً واحداً على الأقل بكمية أكبر من صفر');
    const dupe = valid.map((l) => l.item_id).find((id, i, a) => a.indexOf(id) !== i);
    if (dupe) return toast.error('لا يمكن تكرار نفس الصنف في نفس الحركة');
    if (moveType === 'out' || moveType === 'transfer') {
      for (const l of valid) {
        const av = balance(l.item_id, warehouseId);
        if (Number(l.qty) > av) {
          const it = items.find((i) => i.id === l.item_id);
          return toast.error(`الرصيد غير كافٍ للصنف ${it?.name_ar ?? ''} — المتاح ${money(av)} كجم`);
        }
      }
    }

    setSaving(true);
    try {
      const wh = warehouses.find((w) => w.id === warehouseId);
      const toWh = warehouses.find((w) => w.id === toWarehouseId);
      let seq = moves.length + 1;
      const docNo = `${moveType === 'transfer' ? 'TRF' : moveType.toUpperCase()}-${String(seq).padStart(5, '0')}`;

      for (const l of valid) {
        const it = items.find((i) => i.id === l.item_id);
        const cost = Number(l.unit_cost || it?.cost_price || 0);
        const base = {
          move_date: moveDate, item_id: l.item_id, item_code: it?.code, item_name: it?.name_ar,
          quantity_kg: Number(l.qty), unit_cost: cost,
          total_cost: Math.round(Number(l.qty) * cost * 100) / 100,
          batch_no: l.batch_no || null, ref_type: 'manual', ref_no: docNo, notes: notes || null,
        };
        if (moveType === 'transfer') {
          const { error: e1 } = await (supabase as any).from('acc_stock_moves').insert({
            ...base, move_no: `TRF-O-${String(seq++).padStart(5, '0')}`, move_type: 'out',
            warehouse_id: warehouseId, warehouse_name: wh?.name_ar, notes: `تحويل إلى ${toWh?.name_ar}`,
          });
          if (e1) throw e1;
          const { error: e2 } = await (supabase as any).from('acc_stock_moves').insert({
            ...base, move_no: `TRF-I-${String(seq++).padStart(5, '0')}`, move_type: 'in',
            warehouse_id: toWarehouseId, warehouse_name: toWh?.name_ar, notes: `تحويل من ${wh?.name_ar}`,
          });
          if (e2) throw e2;
        } else {
          const { error } = await (supabase as any).from('acc_stock_moves').insert({
            ...base,
            move_no: `${moveType.toUpperCase()}-${String(seq++).padStart(5, '0')}`,
            move_type: moveType, warehouse_id: warehouseId, warehouse_name: wh?.name_ar,
          });
          if (error) throw error;
        }
      }
      toast.success(`تم تسجيل ${valid.length} سطر في الحركة ${docNo}`);
      setLines([newLine()]); setNotes('');
      qc.invalidateQueries({ queryKey: ['acc_stock_moves'] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل تسجيل الحركة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">حركة المخزون (وارد / منصرف / تحويل)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            كل الكميات بالكيلوجرام — يمكن إضافة عدة أصناف في نفس الحركة، ولا يُسمح بالصرف أو التحويل بأكثر من الرصيد المتاح.
          </p>
        </div>
        <ExportPdfButton
          title="حركة المخزون"
          headers={['رقم الحركة', 'التاريخ', 'النوع', 'الصنف', 'المخزن', 'الكمية كجم', 'التكلفة']}
          rows={sorted.map((m) => [
            m.move_no, new Date(m.move_date).toLocaleDateString('en-GB'), typeLabel[m.move_type] ?? m.move_type,
            m.item_name, m.warehouse_name, money(m.quantity_kg), money(m.total_cost),
          ])}
        />
      </div>

      <InlineFormPage title="حركة جديدة" description="بيانات الحركة ثم أضف أسطر الأصناف">
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <Label>نوع الحركة</Label>
            <Select value={moveType} onValueChange={(v) => setMoveType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{moveType === 'transfer' ? 'من مخزن' : 'المخزن'}</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
              <SelectContent searchable searchPlaceholder="ابحث عن مخزن...">
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {moveType === 'transfer' && (
            <div>
              <Label>إلى مخزن</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن المستلم" /></SelectTrigger>
                <SelectContent searchable searchPlaceholder="ابحث عن مخزن...">
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>التاريخ</Label>
            <Input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-center w-8">#</th>
                <th className="p-2 text-center min-w-56">الصنف</th>
                <th className="p-2 text-center w-32">الكمية (كجم)</th>
                <th className="p-2 text-center w-32">تكلفة الكيلو</th>
                <th className="p-2 text-center w-28">الرصيد المتاح</th>
                <th className="p-2 text-center w-32">التشغيلة</th>
                <th className="p-2 text-center w-28">الإجمالي</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const it = items.find((i) => i.id === l.item_id);
                const cost = Number(l.unit_cost || it?.cost_price || 0);
                return (
                  <tr key={l.key} className="border-t">
                    <td className="p-2 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="p-2">
                      <Select value={l.item_id} onValueChange={(v) => {
                        const item = items.find((i) => i.id === v);
                        setLine(l.key, { item_id: v, unit_cost: Number(item?.cost_price || 0) });
                      }}>
                        <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                        <SelectContent searchable searchPlaceholder="ابحث بالكود أو الاسم...">
                          {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name_ar}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input type="number" min={0} value={l.qty} onChange={(e) => setLine(l.key, { qty: Number(e.target.value) })} />
                    </td>
                    <td className="p-2">
                      <Input type="number" step="0.01" value={l.unit_cost} onChange={(e) => setLine(l.key, { unit_cost: Number(e.target.value) })} />
                    </td>
                    <td className="p-2 text-center font-mono text-xs">
                      {l.item_id ? money(balance(l.item_id, warehouseId)) : '—'}
                    </td>
                    <td className="p-2">
                      <Input value={l.batch_no} onChange={(e) => setLine(l.key, { batch_no: e.target.value })} />
                    </td>
                    <td className="p-2 text-center font-mono">{money(Number(l.qty || 0) * cost)}</td>
                    <td className="p-2 text-center">
                      <Button size="icon" variant="ghost" title="حذف السطر"
                        onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="outline" onClick={() => setLines((ls) => [...ls, newLine()])} className="gap-1.5">
            <Plus className="size-4" /> إضافة سطر
          </Button>
          <div className="flex items-center gap-4 text-sm">
            <span>إجمالي الكمية: <span className="font-bold font-mono">{money(totals.qty)} كجم</span></span>
            <span>إجمالي القيمة: <span className="font-bold font-mono text-primary">{money(totals.value)} ج.م</span></span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!canEdit || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} تسجيل الحركة
          </Button>
        </div>
      </InlineFormPage>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>سجل الحركات (آخر 200)</CardTitle>
          <Select value={filterItem} onValueChange={setFilterItem}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent searchable searchPlaceholder="ابحث عن صنف...">
              <SelectItem value="all">كل الأصناف</SelectItem>
              {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name_ar}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الحركة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الصنف</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>الكمية (كجم)</TableHead>
                <TableHead>تكلفة الكيلو</TableHead>
                <TableHead>المرجع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد حركات</TableCell></TableRow>
              ) : sorted.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.move_no}</TableCell>
                  <TableCell>{new Date(m.move_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell><Badge className={typeColor[m.move_type] ?? ''}>{typeLabel[m.move_type] ?? m.move_type}</Badge></TableCell>
                  <TableCell>{m.item_name}</TableCell>
                  <TableCell>{m.warehouse_name}</TableCell>
                  <TableCell>{money(m.quantity_kg)}</TableCell>
                  <TableCell>{money(m.unit_cost)}</TableCell>
                  <TableCell>{m.ref_no ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccStockMovesPage;
