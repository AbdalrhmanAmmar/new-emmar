import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRightLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';

import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import RowActions from '@/components/accounting/RowActions';
import StatusBadge from '@/components/accounting/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRefresh, useTable } from '@/hooks/useTable';
import { supabase } from '@/integrations/supabase/externalClient';
import { addDays, availableKg, calcTotals, getSettings, money, nextDocNo, num, qty, todayStr } from '@/lib/docFlow';

type Line = { key: string; item_id: string; quantity_kg: number; unit_price: number; discount_pct: number; vat_rate: number };
const newLine = (): Line => ({ key: Math.random().toString(36).slice(2), item_id: '', quantity_kg: 0, unit_price: 0, discount_pct: 0, vat_rate: getSettings().vat_rate });

const AccSalesQuotationsPage: React.FC = () => {
  const refresh = useRefresh();
  const { data: quotes = [] } = useTable('acc_sales_quotations');
  const { data: quoteLines = [] } = useTable('acc_sales_quotation_lines');
  const { data: customers = [] } = useTable('acc_customers');
  const { data: items = [] } = useTable('acc_items');
  const { data: warehouses = [] } = useTable('acc_warehouses');

  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quoteDate, setQuoteDate] = useState(todayStr());
  const [validUntil, setValidUntil] = useState(addDays(todayStr(), 14));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => calcTotals(lines), [lines]);
  const setLine = (key: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickItem = (key: string, id: string) => {
    const it = items.find((i: any) => i.id === id);
    if (!it) return;
    setLine(key, { item_id: id, unit_price: num(it.sale_price), vat_rate: it.vat_applicable ? getSettings().vat_rate : 0 });
  };

  const save = async () => {
    if (!customerId) return toast.error('اختر العميل');
    if (!warehouseId) return toast.error('اختر المخزن المسلّم منه');
    const filled = lines.filter((l) => l.item_id && num(l.quantity_kg) > 0);
    if (!filled.length) return toast.error('أضف صنفاً واحداً على الأقل');
    if (new Set(filled.map((l) => l.item_id)).size !== filled.length) return toast.error('لا يمكن تكرار نفس الصنف في أكثر من سطر');
    setSaving(true);
    try {
      const cust = customers.find((c: any) => c.id === customerId);
      const wh = warehouses.find((w: any) => w.id === warehouseId);
      const quote_no = nextDocNo('acc_sales_quotations', 'quote_no', 'QT');
      const { data: ins, error } = await (supabase as any).from('acc_sales_quotations').insert({
        quote_no, quote_date: quoteDate, valid_until: validUntil,
        customer_id: customerId, customer_name: cust?.name_ar, customer_vat: cust?.vat_number ?? null,
        warehouse_id: warehouseId, warehouse_name: wh?.name_ar,
        subtotal: totals.subtotal, discount_total: totals.discount_total, vat_total: totals.vat_total, total: totals.total,
        status: 'draft', notes: notes || null,
      }).select('*').single();
      if (error) throw error;
      let i = 1;
      for (const l of filled) {
        const it = items.find((x: any) => x.id === l.item_id);
        await (supabase as any).from('acc_sales_quotation_lines').insert({
          quote_id: ins.id, quote_no, line_no: i++, item_id: l.item_id, item_code: it?.code, item_name: it?.name_ar,
          quantity_kg: num(l.quantity_kg), unit_price: num(l.unit_price), discount_pct: num(l.discount_pct), vat_rate: num(l.vat_rate),
          line_total: Math.round(num(l.quantity_kg) * num(l.unit_price) * (1 - num(l.discount_pct) / 100) * (1 + num(l.vat_rate) / 100) * 100) / 100,
        });
      }
      toast.success(`تم إنشاء عرض السعر ${quote_no}`);
      setLines([newLine()]); setNotes('');
      refresh('acc_sales_quotations', 'acc_sales_quotation_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  /** تحويل عرض السعر إلى أمر بيع مع حجز المخزون. */
  const confirm = async (q: any) => {
    if (q.status === 'confirmed') return toast.error('تم تحويل هذا العرض إلى أمر بيع بالفعل');
    const ql = quoteLines.filter((l: any) => l.quote_id === q.id);
    if (!ql.length) return toast.error('لا توجد أصناف على هذا العرض');
    const short = ql.find((l: any) => availableKg(l.item_id, q.warehouse_id) < num(l.quantity_kg));
    if (short) return toast.error(`الرصيد المتاح من ${short.item_name} غير كافٍ (${qty(availableKg(short.item_id, q.warehouse_id))} كجم متاح)`);
    try {
      const so_no = nextDocNo('acc_sales_orders', 'so_no', 'SO');
      const { data: so, error } = await (supabase as any).from('acc_sales_orders').insert({
        so_no, so_date: todayStr(), quote_no: q.quote_no,
        customer_id: q.customer_id, customer_name: q.customer_name, customer_vat: q.customer_vat,
        warehouse_id: q.warehouse_id, warehouse_name: q.warehouse_name,
        payment_terms_days: 30, delivery_date: todayStr(),
        subtotal: q.subtotal, discount_total: q.discount_total, vat_total: q.vat_total, total: q.total,
        status: 'confirmed', notes: `مرحّل من عرض السعر ${q.quote_no}`,
      }).select('*').single();
      if (error) throw error;
      let i = 1;
      for (const l of ql) {
        await (supabase as any).from('acc_sales_order_lines').insert({
          so_id: so.id, so_no, line_no: i++, item_id: l.item_id, item_code: l.item_code, item_name: l.item_name, unit: 'كجم',
          warehouse_id: q.warehouse_id, warehouse_name: q.warehouse_name,
          quantity_kg: num(l.quantity_kg), unit_price: num(l.unit_price), discount_pct: num(l.discount_pct), vat_rate: num(l.vat_rate),
          line_total: num(l.line_total), delivered_kg: 0, invoiced_kg: 0,
        });
      }
      await (supabase as any).from('acc_sales_quotations').update({ status: 'confirmed' }).eq('id', q.id);
      toast.success(`تم تحويل العرض إلى أمر البيع ${so_no} وحجز الكميات`);
      refresh('acc_sales_quotations', 'acc_sales_orders', 'acc_sales_order_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل التحويل');
    }
  };

  const remove = async (q: any) => {
    if (q.status === 'confirmed') return toast.error('لا يمكن حذف عرض تم تحويله إلى أمر بيع');
    await (supabase as any).from('acc_sales_quotation_lines').delete().eq('quote_id', q.id);
    await (supabase as any).from('acc_sales_quotations').delete().eq('id', q.id);
    toast.success('تم حذف العرض');
    refresh('acc_sales_quotations', 'acc_sales_quotation_lines');
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">عروض أسعار العملاء (المرحلة 1 من دورة البيع)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            عرض سعر بصلاحية زمنية وخصومات — التأكيد يحوّله إلى أمر بيع ويحجز الكميات بالمخزن دون إعادة إدخال.
          </p>
        </div>
        <ExportPdfButton
          title="عروض أسعار العملاء"
          headers={['رقم العرض', 'التاريخ', 'صالح حتى', 'العميل', 'الصافي', 'الضريبة', 'الإجمالي', 'الحالة']}
          rows={quotes.map((q: any) => [q.quote_no, q.quote_date, q.valid_until, q.customer_name, money(q.subtotal), money(q.vat_total), money(q.total), q.status])}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>عرض سعر جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <Label>العميل</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>المخزن</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                <SelectContent>{warehouses.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ العرض</Label><Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} /></div>
            <div><Label>صالح حتى</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
            <div><Label>ملاحظات</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>المتاح (كجم)</TableHead>
                <TableHead>الكمية (كجم)</TableHead>
                <TableHead>سعر الكيلو</TableHead>
                <TableHead>خصم %</TableHead>
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
                      <SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name_ar}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{l.item_id ? qty(availableKg(l.item_id, warehouseId || null)) : '—'}</TableCell>
                  <TableCell><Input type="number" className="w-28" value={l.quantity_kg} onChange={(e) => setLine(l.key, { quantity_kg: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input type="number" step="0.01" className="w-28" value={l.unit_price} onChange={(e) => setLine(l.key, { unit_price: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input type="number" step="0.1" className="w-20" value={l.discount_pct} onChange={(e) => setLine(l.key, { discount_pct: Number(e.target.value) })} /></TableCell>
                  <TableCell>{l.vat_rate}%</TableCell>
                  <TableCell className="font-semibold">
                    {money(num(l.quantity_kg) * num(l.unit_price) * (1 - num(l.discount_pct) / 100) * (1 + num(l.vat_rate) / 100))}
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

          <div className="flex items-center justify-between flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}><Plus className="h-4 w-4 me-1" /> إضافة سطر</Button>
            <div className="flex gap-3 text-sm">
              <div className="p-3 rounded bg-muted"><span className="text-muted-foreground">الصافي </span><b>{money(totals.subtotal)}</b></div>
              <div className="p-3 rounded bg-muted"><span className="text-muted-foreground">ض.ق.م </span><b>{money(totals.vat_total)}</b></div>
              <div className="p-3 rounded bg-primary/10 border border-primary/30"><span className="text-muted-foreground">الإجمالي </span><b className="text-primary">{money(totals.total)} ج.م</b></div>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} حفظ العرض
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>عروض الأسعار ({quotes.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم العرض</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>صالح حتى</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الأصناف</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد عروض</TableCell></TableRow>
              ) : quotes.map((q: any) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.quote_no}</TableCell>
                  <TableCell>{new Date(q.quote_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{new Date(q.valid_until).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{q.customer_name}</TableCell>
                  <TableCell>{quoteLines.filter((l: any) => l.quote_id === q.id).map((l: any) => `${l.item_name} (${qty(l.quantity_kg)})`).join(' / ')}</TableCell>
                  <TableCell className="font-semibold">{money(q.total)} ج.م</TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell>
                    <RowActions>
                      <Button variant="ghost" size="icon" title="تحويل إلى أمر بيع" onClick={() => confirm(q)}>
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="حذف" onClick={() => remove(q)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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

export default AccSalesQuotationsPage;
