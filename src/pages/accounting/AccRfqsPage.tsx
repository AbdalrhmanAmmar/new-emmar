import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Award, Loader2, Plus, Save, ShoppingCart, Trash2 } from 'lucide-react';

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
import { calcTotals, money, nextDocNo, num, qty, todayStr } from '@/lib/docFlow';
import { InlineFormPage } from '@/components/accounting/InlineFormPage';

type Line = { key: string; item_id: string; quantity_kg: number; target_price: number };
const newLine = (): Line => ({ key: Math.random().toString(36).slice(2), item_id: '', quantity_kg: 0, target_price: 0 });

const AccRfqsPage: React.FC = () => {
  const refresh = useRefresh();
  const { data: rfqs = [] } = useTable('acc_rfqs');
  const { data: rfqLines = [] } = useTable('acc_rfq_lines');
  const { data: quotes = [] } = useTable('acc_rfq_quotes');
  const { data: items = [] } = useTable('acc_items');
  const { data: warehouses = [] } = useTable('acc_warehouses');
  const { data: vendors = [] } = useTable('acc_vendors');

  const [warehouseId, setWarehouseId] = useState('');
  const [rfqDate, setRfqDate] = useState(todayStr());
  const [deadline, setDeadline] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const [quoteRfq, setQuoteRfq] = useState('');
  const [quoteVendor, setQuoteVendor] = useState('');
  const [quotePrice, setQuotePrice] = useState(0);
  const [quoteLead, setQuoteLead] = useState(7);

  const setLine = (key: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!warehouseId) return toast.error('اختر المخزن المطلوب التوريد إليه');
    const filled = lines.filter((l) => l.item_id && num(l.quantity_kg) > 0);
    if (!filled.length) return toast.error('أضف صنفاً واحداً على الأقل');
    if (new Set(filled.map((l) => l.item_id)).size !== filled.length) return toast.error('لا يمكن تكرار نفس الصنف في أكثر من سطر');
    setSaving(true);
    try {
      const wh = warehouses.find((w: any) => w.id === warehouseId);
      const rfq_no = nextDocNo('acc_rfqs', 'rfq_no', 'RFQ');
      const { data: ins, error } = await (supabase as any).from('acc_rfqs').insert({
        rfq_no, rfq_date: rfqDate, deadline_date: deadline,
        warehouse_id: warehouseId, warehouse_name: wh?.name_ar ?? null,
        status: 'draft', notes: notes || null,
      }).select('*').single();
      if (error) throw error;
      let i = 1;
      for (const l of filled) {
        const it = items.find((x: any) => x.id === l.item_id);
        await (supabase as any).from('acc_rfq_lines').insert({
          rfq_id: ins.id, rfq_no, line_no: i++, item_id: l.item_id,
          item_code: it?.code, item_name: it?.name_ar, unit: 'كجم',
          quantity_kg: num(l.quantity_kg), target_price: num(l.target_price),
        });
      }
      toast.success(`تم إنشاء طلب عرض السعر ${rfq_no}`);
      setLines([newLine()]); setNotes('');
      refresh('acc_rfqs', 'acc_rfq_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const addQuote = async () => {
    if (!quoteRfq || !quoteVendor) return toast.error('اختر الطلب والمورد');
    if (num(quotePrice) <= 0) return toast.error('أدخل سعر الكيلو المعروض');
    const rfq = rfqs.find((r: any) => r.id === quoteRfq);
    const totalQty = rfqLines.filter((l: any) => l.rfq_id === quoteRfq).reduce((s: number, l: any) => s + num(l.quantity_kg), 0);
    const vendor = vendors.find((v: any) => v.id === quoteVendor);
    const { error } = await (supabase as any).from('acc_rfq_quotes').insert({
      rfq_id: quoteRfq, rfq_no: rfq?.rfq_no, vendor_id: quoteVendor, vendor_name: vendor?.name_ar,
      quote_date: todayStr(), unit_price: num(quotePrice), lead_days: num(quoteLead),
      subtotal: Math.round(totalQty * num(quotePrice) * 100) / 100, is_selected: false, notes: null,
    });
    if (error) return toast.error(error.message);
    await (supabase as any).from('acc_rfqs').update({ status: 'sent' }).eq('id', quoteRfq);
    toast.success('تم تسجيل عرض المورد');
    setQuotePrice(0);
    refresh('acc_rfq_quotes', 'acc_rfqs');
  };

  /** ترسية العرض وتحويله إلى أمر شراء بضغطة واحدة. */
  const award = async (quote: any) => {
    const rfq = rfqs.find((r: any) => r.id === quote.rfq_id);
    if (!rfq) return;
    if (rfq.status === 'selected') return toast.error('تمت الترسية على هذا الطلب بالفعل — لا يمكن التكرار');
    const rl = rfqLines.filter((l: any) => l.rfq_id === quote.rfq_id);
    if (!rl.length) return toast.error('لا توجد أصناف على هذا الطلب');
    try {
      const calcLines = rl.map((l: any) => {
        const it = items.find((x: any) => x.id === l.item_id);
        return { quantity_kg: num(l.quantity_kg), unit_price: num(quote.unit_price), vat_rate: it?.vat_applicable ? 14 : 0 };
      });
      const t = calcTotals(calcLines);
      const po_no = nextDocNo('acc_purchase_orders', 'po_no', 'PO');
      const { data: po, error } = await (supabase as any).from('acc_purchase_orders').insert({
        po_no, rfq_no: rfq.rfq_no, vendor_id: quote.vendor_id, vendor_name: quote.vendor_name,
        order_date: todayStr(), expected_date: todayStr(),
        warehouse_id: rfq.warehouse_id, warehouse_name: rfq.warehouse_name,
        payment_terms_days: 30, wht_pct: 1,
        subtotal: t.subtotal, discount_total: 0, vat_total: t.vat_total, total: t.total,
        currency: 'EGP', status: 'approved', notes: `مرسّى من ${rfq.rfq_no}`,
      }).select('*').single();
      if (error) throw error;
      let i = 1;
      for (const l of rl) {
        const it = items.find((x: any) => x.id === l.item_id);
        await (supabase as any).from('acc_purchase_order_lines').insert({
          po_id: po.id, po_no, line_no: i++, item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          unit: 'كجم', quantity_kg: num(l.quantity_kg), unit_price: num(quote.unit_price),
          discount_pct: 0, vat_rate: it?.vat_applicable ? 14 : 0,
          line_total: Math.round(num(l.quantity_kg) * num(quote.unit_price) * (it?.vat_applicable ? 1.14 : 1) * 100) / 100,
          received_kg: 0, billed_kg: 0,
        });
      }
      await (supabase as any).from('acc_rfq_quotes').update({ is_selected: true }).eq('id', quote.id);
      await (supabase as any).from('acc_rfqs').update({ status: 'selected' }).eq('id', rfq.id);
      toast.success(`تمت الترسية وإنشاء أمر الشراء ${po_no}`);
      refresh('acc_rfqs', 'acc_rfq_quotes', 'acc_purchase_orders', 'acc_purchase_order_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الترسية');
    }
  };

  const remove = async (rfq: any) => {
    if (rfq.status === 'selected') return toast.error('لا يمكن حذف طلب تمت الترسية عليه');
    await (supabase as any).from('acc_rfq_lines').delete().eq('rfq_id', rfq.id);
    await (supabase as any).from('acc_rfq_quotes').delete().eq('rfq_id', rfq.id);
    await (supabase as any).from('acc_rfqs').delete().eq('id', rfq.id);
    toast.success('تم حذف الطلب');
    refresh('acc_rfqs', 'acc_rfq_lines', 'acc_rfq_quotes');
  };

  const openRfqs = useMemo(() => rfqs.filter((r: any) => r.status !== 'selected' && r.status !== 'cancelled'), [rfqs]);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">طلبات عروض الأسعار (المرحلة 1 من دورة الشراء)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            سجّل احتياج المخزن، اجمع عروض الموردين، وقارن الأسعار — الترسية تُنشئ أمر شراء تلقائياً بدون إعادة إدخال.
          </p>
        </div>
        <ExportPdfButton
          title="طلبات عروض الأسعار"
          headers={['رقم الطلب', 'التاريخ', 'آخر موعد', 'المخزن', 'الحالة']}
          rows={rfqs.map((r: any) => [r.rfq_no, r.rfq_date, r.deadline_date, r.warehouse_name ?? '', r.status])}
        />
      </div>

      <InlineFormPage title="طلب عرض سعر جديد">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>المخزن المستلم</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                <SelectContent>{warehouses.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ الطلب</Label><Input type="date" value={rfqDate} onChange={(e) => setRfqDate(e.target.value)} /></div>
            <div><Label>آخر موعد لتقديم العروض</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
            <div><Label>ملاحظات</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="شروط التوريد" /></div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الكمية (كجم)</TableHead>
                <TableHead>السعر المستهدف</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.key}>
                  <TableCell className="min-w-[220px]">
                    <Select value={l.item_id} onValueChange={(v) => setLine(l.key, { item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                      <SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name_ar}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" min={0} className="w-32" value={l.quantity_kg} onChange={(e) => setLine(l.key, { quantity_kg: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input type="number" min={0} step="0.01" className="w-28" value={l.target_price} onChange={(e) => setLine(l.key, { target_price: Number(e.target.value) })} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setLines((p) => (p.length > 1 ? p.filter((x) => x.key !== l.key) : p))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}><Plus className="h-4 w-4 me-1" /> إضافة سطر</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} حفظ الطلب
            </Button>
          </div>

      </InlineFormPage>
      <Card>
        <CardHeader><CardTitle>تسجيل عرض مورد</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-3 items-end">
          <div>
            <Label>الطلب</Label>
            <Select value={quoteRfq} onValueChange={setQuoteRfq}>
              <SelectTrigger><SelectValue placeholder="اختر الطلب" /></SelectTrigger>
              <SelectContent>{openRfqs.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.rfq_no}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>المورد</Label>
            <Select value={quoteVendor} onValueChange={setQuoteVendor}>
              <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
              <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name_ar}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>سعر الكيلو المعروض</Label><Input type="number" step="0.01" value={quotePrice} onChange={(e) => setQuotePrice(Number(e.target.value))} /></div>
          <div><Label>مدة التوريد (يوم)</Label><Input type="number" value={quoteLead} onChange={(e) => setQuoteLead(Number(e.target.value))} /></div>
          <Button onClick={addQuote}><Plus className="h-4 w-4 me-1" /> إضافة العرض</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>مقارنة العروض ({quotes.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطلب</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>سعر الكيلو</TableHead>
                <TableHead>إجمالي العرض</TableHead>
                <TableHead>مدة التوريد</TableHead>
                <TableHead>الترسية</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد عروض</TableCell></TableRow>
              ) : quotes.map((q: any) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.rfq_no}</TableCell>
                  <TableCell>{q.vendor_name}</TableCell>
                  <TableCell>{money(q.unit_price)}</TableCell>
                  <TableCell className="font-semibold">{money(q.subtotal)} ج.م</TableCell>
                  <TableCell>{q.lead_days} يوم</TableCell>
                  <TableCell>{q.is_selected ? <StatusBadge status="selected" /> : '—'}</TableCell>
                  <TableCell>
                    <RowActions>
                      <Button variant="ghost" size="icon" title="ترسية وإنشاء أمر شراء" onClick={() => award(q)}>
                        <Award className="h-4 w-4" />
                      </Button>
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الطلبات ({rfqs.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>آخر موعد</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>الأصناف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد طلبات</TableCell></TableRow>
              ) : rfqs.map((r: any) => {
                const rl = rfqLines.filter((l: any) => l.rfq_id === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.rfq_no}</TableCell>
                    <TableCell>{new Date(r.rfq_date).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell>{new Date(r.deadline_date).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell>{r.warehouse_name ?? '—'}</TableCell>
                    <TableCell>{rl.map((l: any) => `${l.item_name} (${qty(l.quantity_kg)} كجم)`).join(' / ') || '—'}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <RowActions>
                        <Button variant="ghost" size="icon" title="حذف" onClick={() => remove(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" /> بعد الترسية تابع الأمر في شاشة «أوامر الشراء».
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccRfqsPage;
