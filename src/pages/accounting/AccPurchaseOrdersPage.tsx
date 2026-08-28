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
import { Loader2, Plus, Save, Trash2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import RowActions from '@/components/accounting/RowActions';

const VAT_RATE = 14;
const money = (n: any) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusLabel: Record<string, string> = { draft: 'مسودة', approved: 'معتمد', received: 'تم الاستلام', closed: 'مقفل' };
const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-100 text-blue-700',
  received: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-700',
};

interface Line {
  key: string; item_id: string; item_code: string; item_name: string;
  quantity_kg: number; unit_price: number; vat_rate: number;
}
const newLine = (): Line => ({ key: Math.random().toString(36).slice(2), item_id: '', item_code: '', item_name: '', quantity_kg: 0, unit_price: 0, vat_rate: VAT_RATE });

const AccPurchaseOrdersPage: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit = isAdmin || hasPermission('accounting_purchases' as any, 'edit');

  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['acc_vendors'],
    queryFn: async () => (await (supabase as any).from('acc_vendors').select('*')).data ?? [],
  });
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ['acc_items'],
    queryFn: async () => (await (supabase as any).from('acc_items').select('*')).data ?? [],
  });
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['acc_warehouses'],
    queryFn: async () => (await (supabase as any).from('acc_warehouses').select('*')).data ?? [],
  });
  const { data: orders = [], refetch } = useQuery<any[]>({
    queryKey: ['acc_purchase_orders'],
    queryFn: async () => (await (supabase as any).from('acc_purchase_orders').select('*')).data ?? [],
  });
  const { data: poLines = [] } = useQuery<any[]>({
    queryKey: ['acc_purchase_order_lines'],
    queryFn: async () => (await (supabase as any).from('acc_purchase_order_lines').select('*')).data ?? [],
  });

  const totals = useMemo(() => {
    let subtotal = 0, vat = 0;
    lines.forEach((l) => {
      const net = Number(l.quantity_kg || 0) * Number(l.unit_price || 0);
      subtotal += net;
      vat += net * (Number(l.vat_rate || 0) / 100);
    });
    subtotal = Math.round(subtotal * 100) / 100;
    vat = Math.round(vat * 100) / 100;
    return { subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100 };
  }, [lines]);

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickItem = (key: string, id: string) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setLine(key, { item_id: it.id, item_code: it.code, item_name: it.name_ar, unit_price: Number(it.cost_price), vat_rate: it.vat_applicable ? VAT_RATE : 0 });
  };

  const save = async () => {
    if (!vendorId) return toast.error('اختر المورد');
    if (!warehouseId) return toast.error('اختر المخزن المستلم');
    const filled = lines.filter((l) => l.item_id && Number(l.quantity_kg) > 0);
    if (!filled.length) return toast.error('أضف صنفاً واحداً على الأقل');
    const dup = filled.map((l) => l.item_id).find((id, i, arr) => arr.indexOf(id) !== i);
    if (dup) return toast.error('لا يمكن تكرار نفس الصنف في أكثر من سطر');

    setSaving(true);
    try {
      const vendor = vendors.find((v) => v.id === vendorId);
      const wh = warehouses.find((w) => w.id === warehouseId);
      const poNo = `PO-${2100 + orders.length + 1}`;
      const { data: ins, error } = await (supabase as any).from('acc_purchase_orders').insert({
        po_no: poNo, vendor_id: vendorId, vendor_name: vendor?.name_ar ?? vendor?.name ?? '',
        order_date: orderDate, expected_date: expectedDate,
        warehouse_id: warehouseId, warehouse_name: wh?.name_ar ?? null,
        subtotal: totals.subtotal, vat_total: totals.vat, total: totals.total,
        currency: 'EGP', status: 'draft', notes: null,
      }).select('id').single();
      if (error) throw error;

      for (const l of filled) {
        await (supabase as any).from('acc_purchase_order_lines').insert({
          po_id: ins.id, po_no: poNo, item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          quantity_kg: Number(l.quantity_kg), unit_price: Number(l.unit_price), vat_rate: Number(l.vat_rate),
          line_total: Math.round(Number(l.quantity_kg) * Number(l.unit_price) * 100) / 100,
        });
      }
      toast.success(`تم إنشاء أمر الشراء ${poNo}`);
      setLines([newLine()]);
      qc.invalidateQueries({ queryKey: ['acc_purchase_orders'] });
      qc.invalidateQueries({ queryKey: ['acc_purchase_order_lines'] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const receive = async (po: any) => {
    if (po.status === 'received' || po.status === 'closed') return toast.error('تم استلام هذا الأمر بالفعل — لا يمكن تكرار الاستلام');
    const pl = poLines.filter((l) => l.po_no === po.po_no);
    if (!pl.length) return toast.error('لا توجد أصناف على هذا الأمر');
    try {
      const { data: moves } = await (supabase as any).from('acc_stock_moves').select('*');
      let seq = (moves ?? []).length + 1;
      for (const l of pl) {
        const it = items.find((i) => i.code === l.item_code);
        await (supabase as any).from('acc_stock_moves').insert({
          move_no: `IN-${po.po_no}-${seq++}`, move_date: new Date().toISOString().slice(0, 10), move_type: 'in',
          item_id: it?.id ?? l.item_id ?? null, item_code: l.item_code, item_name: l.item_name,
          warehouse_id: po.warehouse_id ?? null, warehouse_name: po.warehouse_name ?? null,
          quantity_kg: Number(l.quantity_kg), unit_cost: Number(l.unit_price),
          total_cost: Math.round(Number(l.quantity_kg) * Number(l.unit_price) * 100) / 100,
          ref_type: 'purchase', ref_no: po.po_no, notes: null,
        });
      }
      await (supabase as any).from('acc_purchase_orders').update({ status: 'received' }).eq('id', po.id);
      toast.success(`تم استلام أصناف ${po.po_no} وإضافتها للمخزن`);
      qc.invalidateQueries({ queryKey: ['acc_stock_moves'] });
      qc.invalidateQueries({ queryKey: ['acc_purchase_orders'] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الاستلام');
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">أوامر شراء الخامات والأعلاف</h1>
          <p className="text-sm text-muted-foreground mt-1">
            من الموردين إلى المخازن — الاستلام يضيف الكميات للمخزون تلقائياً ولا يُنفَّذ أكثر من مرة.
          </p>
        </div>
        <ExportPdfButton
          title="أوامر الشراء"
          headers={['رقم الأمر', 'المورد', 'التاريخ', 'المخزن', 'الصافي', 'الضريبة', 'الإجمالي', 'الحالة']}
          rows={orders.map((o) => [
            o.po_no, o.vendor_name, new Date(o.order_date).toLocaleDateString('en-GB'),
            o.warehouse_name ?? '', money(o.subtotal), money(o.vat_total), money(o.total), statusLabel[o.status] ?? o.status,
          ])}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>أمر شراء جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>المورد</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name_ar ?? v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المخزن المستلم</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ الأمر</Label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
            <div><Label>تاريخ التوريد المتوقع</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الكمية (كجم)</TableHead>
                <TableHead>سعر الكيلو</TableHead>
                <TableHead>ض.ق.م %</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.key}>
                  <TableCell className="min-w-[220px]">
                    <Select value={l.item_id} onValueChange={(v) => pickItem(l.key, v)}>
                      <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                      <SelectContent>
                        {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name_ar}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" min={0} className="w-28" value={l.quantity_kg} onChange={(e) => setLine(l.key, { quantity_kg: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input type="number" min={0} step="0.01" className="w-28" value={l.unit_price} onChange={(e) => setLine(l.key, { unit_price: Number(e.target.value) })} /></TableCell>
                  <TableCell>{l.vat_rate}%</TableCell>
                  <TableCell className="font-semibold">
                    {money(Number(l.quantity_kg || 0) * Number(l.unit_price || 0) * (1 + Number(l.vat_rate || 0) / 100))}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setLines((p) => (p.length > 1 ? p.filter((x) => x.key !== l.key) : p))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
            <Plus className="h-4 w-4 me-1" /> إضافة سطر
          </Button>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">الصافي</div><div className="font-bold">{money(totals.subtotal)} ج.م</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">ض.ق.م 14%</div><div className="font-bold">{money(totals.vat)} ج.م</div></div>
            <div className="p-3 rounded bg-primary/10 border border-primary/30"><div className="text-muted-foreground">الإجمالي</div><div className="font-bold text-primary">{money(totals.total)} ج.م</div></div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={!canEdit || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} حفظ أمر الشراء
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>أوامر الشراء ({orders.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الأمر</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>الصافي</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد أوامر شراء</TableCell></TableRow>
              ) : orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.po_no}</TableCell>
                  <TableCell>{o.vendor_name}</TableCell>
                  <TableCell>{new Date(o.order_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{o.warehouse_name ?? '—'}</TableCell>
                  <TableCell>{money(o.subtotal)}</TableCell>
                  <TableCell className="font-semibold">{money(o.total)} ج.م</TableCell>
                  <TableCell><Badge className={statusColor[o.status] ?? ''}>{statusLabel[o.status] ?? o.status}</Badge></TableCell>
                  <TableCell>
                    <RowActions>
                      <Button variant="ghost" size="icon" title="استلام الأصناف" disabled={!canEdit} onClick={() => receive(o)}>
                        <PackageCheck className="h-4 w-4" />
                      </Button>
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccPurchaseOrdersPage;
