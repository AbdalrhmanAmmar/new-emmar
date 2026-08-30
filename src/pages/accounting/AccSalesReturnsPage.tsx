import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Save } from 'lucide-react';

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
import { GL, createStockMove, money, nextDocNo, num, postJournal, qty, todayStr, weightedCost } from '@/lib/docFlow';
import { InlineFormPage } from '@/components/accounting/InlineFormPage';

const REASONS = ['رفض العميل للمواصفة', 'فرق وزن عند الاستلام', 'تلف أثناء النقل', 'خطأ في الصنف المرسل', 'إلغاء جزء من الطلب'];

const AccSalesReturnsPage: React.FC = () => {
  const refresh = useRefresh();
  const { data: returns = [] } = useTable('acc_sales_returns');
  const { data: dos = [] } = useTable('acc_deliveries');
  const { data: doLines = [] } = useTable('acc_delivery_lines');
  const { data: invoices = [] } = useTable('acc_sales_invoices');

  const [doId, setDoId] = useState('');
  const [lineId, setLineId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState(REASONS[0]);
  const [returnDate, setReturnDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  const del = dos.find((d: any) => d.id === doId);
  const availableLines = useMemo(() => doLines.filter((l: any) => l.do_id === doId), [doLines, doId]);
  const line = availableLines.find((l: any) => l.id === lineId);
  const returnedSoFar = useMemo(
    () => returns.filter((r: any) => r.do_no === del?.do_no && r.item_id === line?.item_id).reduce((s: number, r: any) => s + num(r.quantity_kg), 0),
    [returns, del, line],
  );

  const save = async () => {
    if (!del || !line) return toast.error('اختر إذن التسليم والصنف');
    if (num(quantity) <= 0) return toast.error('أدخل الكمية المرتجعة');
    if (num(quantity) + returnedSoFar > num(line.delivered_kg)) {
      return toast.error(`إجمالي المرتجع يتجاوز المسلَّم (${qty(line.delivered_kg)} كجم، مرتجع سابقاً ${qty(returnedSoFar)} كجم)`);
    }
    setSaving(true);
    try {
      const return_no = nextDocNo('acc_sales_returns', 'return_no', 'SR');
      const subtotal = Math.round(num(quantity) * num(line.unit_price) * 100) / 100;
      const vat = Math.round((subtotal * num(line.vat_rate)) / 100 * 100) / 100;
      const cost = weightedCost(line.item_id);
      const costValue = Math.round(num(quantity) * cost * 100) / 100;
      const invoice = invoices.find((i: any) => i.do_no === del.do_no);
      const journal_no = await postJournal({
        date: returnDate,
        description: `مرتجع مبيعات ${return_no} — ${del.customer_name} — ${line.item_name}`,
        source: 'sales_return',
        ref_no: return_no,
        lines: [
          { code: GL.salesReturns, description: `مردودات مبيعات ${return_no}`, debit: subtotal },
          { code: GL.vatOutput, description: 'رد ض.ق.م مبيعات', debit: vat },
          { code: GL.receivable, description: `تخفيض مديونية ${del.customer_name}`, credit: subtotal + vat },
          { code: GL.inventory, description: `إرجاع ${line.item_name} للمخزن`, debit: costValue },
          { code: GL.cogs, description: 'عكس تكلفة المبيعات', credit: costValue },
        ],
      });
      await (supabase as any).from('acc_sales_returns').insert({
        return_no, return_date: returnDate, invoice_number: invoice?.invoice_number ?? null,
        do_no: del.do_no, customer_id: del.customer_id, customer_name: del.customer_name,
        warehouse_id: del.warehouse_id, warehouse_name: del.warehouse_name,
        item_id: line.item_id, item_code: line.item_code, item_name: line.item_name,
        quantity_kg: num(quantity), unit_price: num(line.unit_price), subtotal, vat_total: vat,
        total: Math.round((subtotal + vat) * 100) / 100,
        reason, status: 'posted', journal_no, notes: null,
      });
      await createStockMove({
        move_date: returnDate, move_type: 'in', item_id: line.item_id, item_code: line.item_code, item_name: line.item_name,
        warehouse_id: del.warehouse_id, warehouse_name: del.warehouse_name,
        quantity_kg: num(quantity), unit_cost: cost, ref_type: 'sales_return', ref_no: return_no,
      });
      if (invoice) {
        const newTotal = Math.round((num(invoice.total) - subtotal - vat) * 100) / 100;
        await (supabase as any).from('acc_sales_invoices').update({
          total: Math.max(0, newTotal),
          balance: Math.max(0, Math.round((newTotal - num(invoice.paid_amount)) * 100) / 100),
        }).eq('id', invoice.id);
      }
      toast.success(`تم تسجيل المرتجع ${return_no} وترحيله (${journal_no})`);
      setQuantity(0);
      refresh('acc_sales_returns', 'acc_stock_moves', 'acc_sales_invoices', 'acc_journal_entries', 'acc_ledger_lines');
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
          <h1 className="text-2xl font-bold">مرتجعات المبيعات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            رد الأعلاف من العميل: يرجع للمخزن بتكلفته، ويخفض الإيراد والضريبة ومديونية العميل بقيد متوازن واحد.
          </p>
        </div>
        <ExportPdfButton
          title="مرتجعات المبيعات"
          headers={['رقم المرتجع', 'التاريخ', 'إذن التسليم', 'العميل', 'الصنف', 'الكمية', 'الإجمالي', 'السبب']}
          rows={returns.map((r: any) => [r.return_no, r.return_date, r.do_no, r.customer_name, r.item_name, qty(r.quantity_kg), money(r.total), r.reason])}
        />
      </div>

      <InlineFormPage title="مرتجع جديد">
          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <Label>إذن التسليم</Label>
              <Select value={doId} onValueChange={(v) => { setDoId(v); setLineId(''); }}>
                <SelectTrigger><SelectValue placeholder="اختر الإذن" /></SelectTrigger>
                <SelectContent>{dos.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.do_no} — {d.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>الصنف</Label>
              <Select value={lineId} onValueChange={setLineId}>
                <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                <SelectContent>{availableLines.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.item_name} ({qty(l.delivered_kg)} كجم)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الكمية المرتجعة (كجم)</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></div>
            <div>
              <Label>السبب</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>التاريخ</Label><Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></div>
          </div>
          {line && (
            <div className="text-sm text-muted-foreground">
              سعر البيع {money(line.unit_price)} ج.م — مرتجع سابقاً {qty(returnedSoFar)} كجم من إجمالي {qty(line.delivered_kg)} كجم.
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !lineId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} ترحيل المرتجع
            </Button>
          </div>

      </InlineFormPage>
      <Card>
        <CardHeader><CardTitle>المرتجعات ({returns.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم المرتجع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الصنف</TableHead>
                <TableHead>الكمية (كجم)</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead>القيد</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">لا توجد مرتجعات</TableCell></TableRow>
              ) : returns.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium flex items-center gap-1"><RotateCcw className="h-3 w-3 text-muted-foreground" /> {r.return_no}</TableCell>
                  <TableCell>{new Date(r.return_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{r.invoice_number ?? '—'}</TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell>{r.item_name}</TableCell>
                  <TableCell>{qty(r.quantity_kg)}</TableCell>
                  <TableCell className="font-semibold">{money(r.total)} ج.م</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>{r.journal_no ?? '—'}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccSalesReturnsPage;
