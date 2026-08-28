import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Save, Scale } from 'lucide-react';

import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import StatusBadge from '@/components/accounting/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRefresh, useTable } from '@/hooks/useTable';
import { supabase } from '@/integrations/supabase/externalClient';
import {
  GL, createStockMove, getSettings, money, nextDocNo, num, onHandKg, postJournal, qty, rollupStatus, todayStr, weightedCost, withinTolerance,
} from '@/lib/docFlow';

type Line = { so_line_id: string; item_id: string; item_code: string; item_name: string; ordered_kg: number; remaining_kg: number; delivered_kg: number; unit_price: number; vat_rate: number; unit_cost: number };

const AccDeliveriesPage: React.FC = () => {
  const refresh = useRefresh();
  const s = getSettings();
  const { data: dos = [] } = useTable('acc_deliveries');
  const { data: doLines = [] } = useTable('acc_delivery_lines');
  const { data: orders = [] } = useTable('acc_sales_orders');
  const { data: orderLines = [] } = useTable('acc_sales_order_lines');

  const [soId, setSoId] = useState('');
  const [doDate, setDoDate] = useState(todayStr());
  const [truck, setTruck] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [gross, setGross] = useState(0);
  const [tare, setTare] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);

  const openOrders = useMemo(
    () => orders.filter((o: any) => o.status === 'confirmed' || o.status === 'partially_delivered'),
    [orders],
  );
  const so = orders.find((o: any) => o.id === soId);

  useEffect(() => {
    if (!soId) return setLines([]);
    setLines(orderLines.filter((l: any) => l.so_id === soId).map((l: any) => {
      const remaining = Math.max(0, num(l.quantity_kg) - num(l.delivered_kg));
      return {
        so_line_id: l.id, item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
        ordered_kg: num(l.quantity_kg), remaining_kg: remaining, delivered_kg: remaining,
        unit_price: num(l.unit_price), vat_rate: num(l.vat_rate), unit_cost: weightedCost(l.item_id),
      };
    }));
  }, [soId, orderLines]);

  const declaredNet = Math.max(0, num(gross) - num(tare));
  const linesNet = lines.reduce((sum, l) => sum + num(l.delivered_kg), 0);
  const weightMismatch = declaredNet > 0 && !withinTolerance(linesNet, declaredNet, s.weight_tolerance_pct);
  const setLine = (id: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.so_line_id === id ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!so) return toast.error('اختر أمر البيع');
    const filled = lines.filter((l) => num(l.delivered_kg) > 0);
    if (!filled.length) return toast.error('أدخل الكميات المسلَّمة');
    const over = filled.find((l) => num(l.delivered_kg) > l.remaining_kg + 0.001);
    if (over) return toast.error(`الكمية المسلَّمة من ${over.item_name} أكبر من المتبقي على الأمر`);
    const short = filled.find((l) => onHandKg(l.item_id, so.warehouse_id) < num(l.delivered_kg));
    if (short) return toast.error(`رصيد ${short.item_name} بالمخزن ${qty(onHandKg(short.item_id, so.warehouse_id))} كجم فقط`);
    setSaving(true);
    try {
      const do_no = nextDocNo('acc_deliveries', 'do_no', 'DO');
      const cogs = filled.reduce((sum, l) => sum + num(l.delivered_kg) * num(l.unit_cost), 0);
      // قيد التسليم: تكلفة المبيعات مدين / المخزون دائن (الإيراد يُقيَّد عند الفاتورة)
      const journal_no = await postJournal({
        date: doDate,
        description: `إذن تسليم ${do_no} — أمر البيع ${so.so_no} — ${so.customer_name}`,
        source: 'delivery',
        ref_no: do_no,
        lines: [
          { code: GL.cogs, description: `تكلفة مبيعات ${do_no}`, debit: cogs },
          { code: GL.inventory, description: `صرف مخزني ${do_no}`, credit: cogs },
        ],
      });
      const { data: ins, error } = await (supabase as any).from('acc_deliveries').insert({
        do_no, do_date: doDate, so_id: so.id, so_no: so.so_no,
        customer_id: so.customer_id, customer_name: so.customer_name,
        warehouse_id: so.warehouse_id, warehouse_name: so.warehouse_name,
        truck_no: truck || null, driver_name: driver || null, driver_phone: phone || null,
        gross_weight_kg: num(gross), tare_weight_kg: num(tare), net_weight_kg: declaredNet || linesNet,
        cogs_total: Math.round(cogs * 100) / 100, status: 'posted', journal_no,
        notes: weightMismatch ? 'فرق وزن خارج نسبة السماح' : null,
      }).select('*').single();
      if (error) throw error;

      let i = 1;
      for (const l of filled) {
        await (supabase as any).from('acc_delivery_lines').insert({
          do_id: ins.id, do_no, so_line_id: l.so_line_id, line_no: i++,
          item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          ordered_kg: l.ordered_kg, delivered_kg: num(l.delivered_kg),
          unit_price: num(l.unit_price), vat_rate: l.vat_rate, unit_cost: num(l.unit_cost),
          line_total: Math.round(num(l.delivered_kg) * num(l.unit_price) * (1 + l.vat_rate / 100) * 100) / 100,
          invoiced_kg: 0,
        });
        await createStockMove({
          move_date: doDate, move_type: 'out', item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          warehouse_id: so.warehouse_id, warehouse_name: so.warehouse_name,
          quantity_kg: num(l.delivered_kg), unit_cost: num(l.unit_cost), ref_type: 'delivery', ref_no: do_no,
        });
        const src = orderLines.find((x: any) => x.id === l.so_line_id);
        await (supabase as any).from('acc_sales_order_lines')
          .update({ delivered_kg: num(src?.delivered_kg) + num(l.delivered_kg) }).eq('id', l.so_line_id);
      }

      const updated = orderLines.filter((l: any) => l.so_id === so.id).map((l: any) => {
        const d = filled.find((f) => f.so_line_id === l.id);
        return { quantity_kg: l.quantity_kg, done_kg: num(l.delivered_kg) + num(d?.delivered_kg) };
      });
      await (supabase as any).from('acc_sales_orders')
        .update({ status: rollupStatus(updated, 'partially_delivered', 'delivered', 'confirmed') }).eq('id', so.id);

      toast.success(`تم تسجيل التسليم ${do_no} وترحيل تكلفة المبيعات (${journal_no})`);
      setSoId(''); setGross(0); setTare(0); setTruck(''); setDriver(''); setPhone('');
      refresh('acc_deliveries', 'acc_delivery_lines', 'acc_sales_orders', 'acc_sales_order_lines', 'acc_stock_moves', 'acc_journal_entries', 'acc_ledger_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">إذون التسليم (المرحلة 3 من دورة البيع)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            صرف الأعلاف بالوزن مع بيانات السيارة والسائق — يخصم من المخزن ويرحّل تكلفة المبيعات، ويسمح بالتسليم على دفعات.
          </p>
        </div>
        <ExportPdfButton
          title="إذون التسليم"
          headers={['رقم الإذن', 'التاريخ', 'أمر البيع', 'العميل', 'السيارة', 'الصافي (كجم)', 'الحالة']}
          rows={dos.map((d: any) => [d.do_no, d.do_date, d.so_no, d.customer_name, d.truck_no ?? '', qty(d.net_weight_kg), d.status])}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>إذن تسليم جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <Label>أمر البيع</Label>
              <Select value={soId} onValueChange={setSoId}>
                <SelectTrigger><SelectValue placeholder="أوامر مؤكدة أو مسلمة جزئياً" /></SelectTrigger>
                <SelectContent>{openOrders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.so_no} — {o.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ التسليم</Label><Input type="date" value={doDate} onChange={(e) => setDoDate(e.target.value)} /></div>
            <div><Label>رقم السيارة</Label><Input value={truck} onChange={(e) => setTruck(e.target.value)} /></div>
            <div><Label>السائق</Label><Input value={driver} onChange={(e) => setDriver(e.target.value)} /></div>
            <div><Label>هاتف السائق</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>الوزن القائم (كجم)</Label><Input type="number" value={gross} onChange={(e) => setGross(Number(e.target.value))} /></div>
            <div><Label>وزن الفارغ (كجم)</Label><Input type="number" value={tare} onChange={(e) => setTare(Number(e.target.value))} /></div>
            <div className="p-3 rounded bg-muted">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" /> الصافي بالميزان</div>
              <div className="font-bold">{qty(declaredNet)} كجم</div>
            </div>
          </div>

          {weightMismatch && (
            <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" /> فرق وزن {qty(declaredNet - linesNet)} كجم يتجاوز نسبة السماح {s.weight_tolerance_pct}%.
            </div>
          )}

          {!!lines.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>المطلوب</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>المسلَّم الآن</TableHead>
                  <TableHead>سعر البيع</TableHead>
                  <TableHead>تكلفة الكيلو</TableHead>
                  <TableHead>القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.so_line_id}>
                    <TableCell className="font-medium">{l.item_code} — {l.item_name}</TableCell>
                    <TableCell>{qty(l.ordered_kg)}</TableCell>
                    <TableCell>{qty(l.remaining_kg)}</TableCell>
                    <TableCell><Input type="number" className="w-32" value={l.delivered_kg} onChange={(e) => setLine(l.so_line_id, { delivered_kg: Number(e.target.value) })} /></TableCell>
                    <TableCell>{money(l.unit_price)}</TableCell>
                    <TableCell>{money(l.unit_cost)}</TableCell>
                    <TableCell className="font-semibold">{money(num(l.delivered_kg) * num(l.unit_price))} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !soId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} ترحيل التسليم
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>إذون التسليم ({dos.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الإذن</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>أمر البيع</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>السيارة</TableHead>
                <TableHead>الصافي (كجم)</TableHead>
                <TableHead>تكلفة المبيعات</TableHead>
                <TableHead>القيد</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dos.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد إذون تسليم</TableCell></TableRow>
              ) : dos.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.do_no}</TableCell>
                  <TableCell>{new Date(d.do_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{d.so_no}</TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>{d.truck_no ?? '—'}</TableCell>
                  <TableCell>{qty(d.net_weight_kg)}</TableCell>
                  <TableCell>{money(d.cogs_total)} ج.م</TableCell>
                  <TableCell>{d.journal_no ?? '—'}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            إجمالي أسطر التسليم: {doLines.length} سطر — الفوترة تتم من شاشة «فوترة وتحصيل المبيعات».
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccDeliveriesPage;
