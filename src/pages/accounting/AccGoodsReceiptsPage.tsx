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
  GL, calcTotals, createStockMove, getSettings, money, nextDocNo, num, postJournal, qty, rollupStatus, todayStr, withinTolerance,
} from '@/lib/docFlow';

type Line = { po_line_id: string; item_id: string; item_code: string; item_name: string; ordered_kg: number; remaining_kg: number; received_kg: number; unit_cost: number; vat_rate: number };

const AccGoodsReceiptsPage: React.FC = () => {
  const refresh = useRefresh();
  const settings = getSettings();
  const { data: grns = [] } = useTable('acc_goods_receipts');
  const { data: grnLines = [] } = useTable('acc_goods_receipt_lines');
  const { data: pos = [] } = useTable('acc_purchase_orders');
  const { data: poLines = [] } = useTable('acc_purchase_order_lines');

  const [poId, setPoId] = useState('');
  const [grnDate, setGrnDate] = useState(todayStr());
  const [truck, setTruck] = useState('');
  const [driver, setDriver] = useState('');
  const [gross, setGross] = useState(0);
  const [tare, setTare] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);

  const openPos = useMemo(
    () => pos.filter((p: any) => p.status === 'approved' || p.status === 'partially_received'),
    [pos],
  );
  const po = pos.find((p: any) => p.id === poId);

  useEffect(() => {
    if (!poId) return setLines([]);
    const pl = poLines.filter((l: any) => l.po_id === poId);
    setLines(pl.map((l: any) => {
      const remaining = Math.max(0, num(l.quantity_kg) - num(l.received_kg));
      return {
        po_line_id: l.id, item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
        ordered_kg: num(l.quantity_kg), remaining_kg: remaining, received_kg: remaining,
        unit_cost: num(l.unit_price), vat_rate: num(l.vat_rate),
      };
    }));
  }, [poId, poLines]);

  const declaredNet = useMemo(() => Math.max(0, num(gross) - num(tare)), [gross, tare]);
  const linesNet = useMemo(() => lines.reduce((s, l) => s + num(l.received_kg), 0), [lines]);
  const weightMismatch = declaredNet > 0 && !withinTolerance(linesNet, declaredNet, settings.weight_tolerance_pct);

  const setLine = (id: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.po_line_id === id ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!po) return toast.error('اختر أمر الشراء');
    const filled = lines.filter((l) => num(l.received_kg) > 0);
    if (!filled.length) return toast.error('أدخل الكميات المستلمة');
    if (settings.block_over_receipt) {
      const over = filled.find((l) => num(l.received_kg) > l.remaining_kg + 0.001);
      if (over) return toast.error(`الكمية المستلمة من ${over.item_name} أكبر من المتبقي على الأمر (${qty(over.remaining_kg)} كجم)`);
    }
    setSaving(true);
    try {
      const grn_no = nextDocNo('acc_goods_receipts', 'grn_no', 'GRN');
      const t = calcTotals(filled.map((l) => ({ quantity_kg: l.received_kg, unit_price: l.unit_cost, vat_rate: l.vat_rate })));
      const variance = declaredNet > 0 ? Math.round((declaredNet - linesNet) * 100) / 100 : 0;

      // الترحيل المحاسبي: المخزون مدين / فواتير موردين مستحقة غير مسددة (GRNI) دائن
      const journal_no = await postJournal({
        date: grnDate,
        description: `استلام مخزني ${grn_no} — أمر الشراء ${po.po_no} — ${po.vendor_name}`,
        source: 'goods_receipt',
        ref_no: grn_no,
        lines: [
          { code: GL.inventory, description: `مخزون واصل ${grn_no}`, debit: t.subtotal },
          { code: GL.grni, description: `مستحق للمورد ${po.vendor_name}`, credit: t.subtotal },
        ],
      });

      const { data: ins, error } = await (supabase as any).from('acc_goods_receipts').insert({
        grn_no, grn_date: grnDate, po_id: po.id, po_no: po.po_no,
        vendor_id: po.vendor_id, vendor_name: po.vendor_name,
        warehouse_id: po.warehouse_id, warehouse_name: po.warehouse_name,
        truck_no: truck || null, driver_name: driver || null,
        gross_weight_kg: num(gross), tare_weight_kg: num(tare), net_weight_kg: declaredNet || linesNet,
        variance_kg: variance, landed_cost_total: 0,
        status: 'posted', journal_no, notes: weightMismatch ? 'فرق وزن خارج نسبة السماح — تمت المراجعة' : null,
      }).select('*').single();
      if (error) throw error;

      let i = 1;
      for (const l of filled) {
        await (supabase as any).from('acc_goods_receipt_lines').insert({
          grn_id: ins.id, grn_no, po_line_id: l.po_line_id, line_no: i++,
          item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          ordered_kg: l.ordered_kg, received_kg: num(l.received_kg),
          unit_cost: num(l.unit_cost), landed_unit_cost: num(l.unit_cost), vat_rate: l.vat_rate,
          line_total: Math.round(num(l.received_kg) * num(l.unit_cost) * 100) / 100, billed_kg: 0,
        });
        await createStockMove({
          move_date: grnDate, move_type: 'in', item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          warehouse_id: po.warehouse_id, warehouse_name: po.warehouse_name,
          quantity_kg: num(l.received_kg), unit_cost: num(l.unit_cost),
          ref_type: 'goods_receipt', ref_no: grn_no, batch_no: `B-${grn_no}`,
        });
        const target = poLines.find((x: any) => x.id === l.po_line_id);
        await (supabase as any).from('acc_purchase_order_lines')
          .update({ received_kg: num(target?.received_kg) + num(l.received_kg) }).eq('id', l.po_line_id);
      }

      const updated = poLines
        .filter((l: any) => l.po_id === po.id)
        .map((l: any) => {
          const rec = filled.find((f) => f.po_line_id === l.id);
          return { quantity_kg: l.quantity_kg, done_kg: num(l.received_kg) + num(rec?.received_kg) };
        });
      await (supabase as any).from('acc_purchase_orders')
        .update({ status: rollupStatus(updated, 'partially_received', 'received', 'approved') }).eq('id', po.id);

      toast.success(`تم تسجيل إذن الاستلام ${grn_no} وترحيله (${journal_no})`);
      setPoId(''); setGross(0); setTare(0); setTruck(''); setDriver('');
      refresh('acc_goods_receipts', 'acc_goods_receipt_lines', 'acc_purchase_orders', 'acc_purchase_order_lines', 'acc_stock_moves', 'acc_journal_entries', 'acc_ledger_lines');
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
          <h1 className="text-2xl font-bold">إذون الاستلام المخزني (المرحلة 3 من دورة الشراء)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            استلام بالقائمة الوزنية (قائم – فارغ = صافي)، يقيّد الكميات في المخزن ويرحّل قيد المخزون مقابل حساب الفواتير المستحقة تلقائياً.
          </p>
        </div>
        <ExportPdfButton
          title="إذون الاستلام"
          headers={['رقم الإذن', 'التاريخ', 'أمر الشراء', 'المورد', 'المخزن', 'الصافي (كجم)', 'الحالة']}
          rows={grns.map((g: any) => [g.grn_no, g.grn_date, g.po_no, g.vendor_name, g.warehouse_name, qty(g.net_weight_kg), g.status])}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>إذن استلام جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>أمر الشراء</Label>
              <Select value={poId} onValueChange={setPoId}>
                <SelectTrigger><SelectValue placeholder="أوامر معتمدة أو مستلمة جزئياً" /></SelectTrigger>
                <SelectContent>
                  {openPos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.po_no} — {p.vendor_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ الاستلام</Label><Input type="date" value={grnDate} onChange={(e) => setGrnDate(e.target.value)} /></div>
            <div><Label>رقم السيارة</Label><Input value={truck} onChange={(e) => setTruck(e.target.value)} placeholder="ق ص ط 4471" /></div>
            <div><Label>اسم السائق</Label><Input value={driver} onChange={(e) => setDriver(e.target.value)} /></div>
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
              <AlertTriangle className="h-4 w-4" />
              فرق وزن {qty(declaredNet - linesNet)} كجم بين الميزان وأسطر الاستلام — يتجاوز نسبة السماح {settings.weight_tolerance_pct}%.
            </div>
          )}

          {!!lines.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>المطلوب</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>المستلم الآن</TableHead>
                  <TableHead>سعر الكيلو</TableHead>
                  <TableHead>القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.po_line_id}>
                    <TableCell className="font-medium">{l.item_code} — {l.item_name}</TableCell>
                    <TableCell>{qty(l.ordered_kg)}</TableCell>
                    <TableCell>{qty(l.remaining_kg)}</TableCell>
                    <TableCell>
                      <Input type="number" min={0} className="w-32" value={l.received_kg}
                        onChange={(e) => setLine(l.po_line_id, { received_kg: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>{money(l.unit_cost)}</TableCell>
                    <TableCell className="font-semibold">{money(num(l.received_kg) * num(l.unit_cost))} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !poId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} ترحيل الاستلام
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>إذون الاستلام ({grns.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الإذن</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>أمر الشراء</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>الصافي (كجم)</TableHead>
                <TableHead>الأصناف</TableHead>
                <TableHead>القيد</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد إذون استلام</TableCell></TableRow>
              ) : grns.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.grn_no}</TableCell>
                  <TableCell>{new Date(g.grn_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{g.po_no}</TableCell>
                  <TableCell>{g.vendor_name}</TableCell>
                  <TableCell>{g.warehouse_name}</TableCell>
                  <TableCell>{qty(g.net_weight_kg)}</TableCell>
                  <TableCell>{grnLines.filter((l: any) => l.grn_id === g.id).map((l: any) => l.item_name).join(' / ')}</TableCell>
                  <TableCell>{g.journal_no ?? '—'}</TableCell>
                  <TableCell><StatusBadge status={g.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccGoodsReceiptsPage;
