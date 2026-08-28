import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Undo2 } from 'lucide-react';

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
import { GL, createStockMove, money, nextDocNo, num, onHandKg, postJournal, qty, todayStr } from '@/lib/docFlow';

const REASONS = ['نسبة رطوبة أعلى من المواصفة', 'شوائب أو تكسير', 'اختلاف في المواصفة', 'فرق وزن', 'تلف أثناء النقل'];

const AccPurchaseReturnsPage: React.FC = () => {
  const refresh = useRefresh();
  const { data: returns = [] } = useTable('acc_purchase_returns');
  const { data: grns = [] } = useTable('acc_goods_receipts');
  const { data: grnLines = [] } = useTable('acc_goods_receipt_lines');

  const [grnId, setGrnId] = useState('');
  const [lineId, setLineId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState(REASONS[0]);
  const [returnDate, setReturnDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  const grn = grns.find((g: any) => g.id === grnId);
  const availableLines = useMemo(() => grnLines.filter((l: any) => l.grn_id === grnId), [grnLines, grnId]);
  const line = availableLines.find((l: any) => l.id === lineId);
  const onHand = line ? onHandKg(line.item_id, grn?.warehouse_id) : 0;

  const save = async () => {
    if (!grn || !line) return toast.error('اختر إذن الاستلام والصنف');
    if (num(quantity) <= 0) return toast.error('أدخل الكمية المرتجعة');
    if (num(quantity) > num(line.received_kg)) return toast.error('الكمية المرتجعة أكبر من المستلم');
    if (num(quantity) > onHand) return toast.error(`الرصيد المتاح بالمخزن ${qty(onHand)} كجم فقط`);
    setSaving(true);
    try {
      const return_no = nextDocNo('acc_purchase_returns', 'return_no', 'PR');
      const unit = num(line.landed_unit_cost || line.unit_cost);
      const subtotal = Math.round(num(quantity) * unit * 100) / 100;
      const vat = Math.round((subtotal * num(line.vat_rate)) / 100 * 100) / 100;
      const journal_no = await postJournal({
        date: returnDate,
        description: `مرتجع مشتريات ${return_no} — ${grn.vendor_name} — ${line.item_name}`,
        source: 'purchase_return',
        ref_no: return_no,
        lines: [
          { code: GL.payable, description: `تخفيض مستحق ${grn.vendor_name}`, debit: subtotal + vat },
          { code: GL.inventory, description: `إخراج مرتجع ${line.item_name}`, credit: subtotal },
          { code: GL.vatInput, description: 'رد ض.ق.م مشتريات', credit: vat },
        ],
      });
      await (supabase as any).from('acc_purchase_returns').insert({
        return_no, return_date: returnDate, grn_id: grn.id, grn_no: grn.grn_no, po_no: grn.po_no,
        vendor_id: grn.vendor_id, vendor_name: grn.vendor_name,
        warehouse_id: grn.warehouse_id, warehouse_name: grn.warehouse_name,
        item_id: line.item_id, item_code: line.item_code, item_name: line.item_name,
        quantity_kg: num(quantity), unit_cost: unit, subtotal, vat_total: vat,
        total: Math.round((subtotal + vat) * 100) / 100,
        reason, status: 'posted', journal_no, notes: null,
      });
      await createStockMove({
        move_date: returnDate, move_type: 'out', item_id: line.item_id, item_code: line.item_code, item_name: line.item_name,
        warehouse_id: grn.warehouse_id, warehouse_name: grn.warehouse_name,
        quantity_kg: num(quantity), unit_cost: unit, ref_type: 'purchase_return', ref_no: return_no,
      });
      toast.success(`تم تسجيل المرتجع ${return_no} وترحيله (${journal_no})`);
      setQuantity(0);
      refresh('acc_purchase_returns', 'acc_stock_moves', 'acc_journal_entries', 'acc_ledger_lines');
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
          <h1 className="text-2xl font-bold">مرتجعات المشتريات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            رد الخامات غير المطابقة للمورد — يخصم من المخزون ويخفض مستحقات المورد والضريبة بقيد واحد.
          </p>
        </div>
        <ExportPdfButton
          title="مرتجعات المشتريات"
          headers={['رقم المرتجع', 'التاريخ', 'إذن الاستلام', 'المورد', 'الصنف', 'الكمية', 'الإجمالي', 'السبب']}
          rows={returns.map((r: any) => [r.return_no, r.return_date, r.grn_no, r.vendor_name, r.item_name, qty(r.quantity_kg), money(r.total), r.reason])}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>مرتجع جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <Label>إذن الاستلام</Label>
              <Select value={grnId} onValueChange={(v) => { setGrnId(v); setLineId(''); }}>
                <SelectTrigger><SelectValue placeholder="اختر الإذن" /></SelectTrigger>
                <SelectContent>{grns.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.grn_no} — {g.vendor_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>الصنف</Label>
              <Select value={lineId} onValueChange={setLineId}>
                <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                <SelectContent>{availableLines.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.item_name} ({qty(l.received_kg)} كجم)</SelectItem>)}</SelectContent>
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
              تكلفة الكيلو {money(line.landed_unit_cost || line.unit_cost)} ج.م — الرصيد المتاح بالمخزن {qty(onHand)} كجم.
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !lineId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} ترحيل المرتجع
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>المرتجعات ({returns.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم المرتجع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إذن الاستلام</TableHead>
                <TableHead>المورد</TableHead>
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
                  <TableCell className="font-medium flex items-center gap-1"><Undo2 className="h-3 w-3 text-muted-foreground" /> {r.return_no}</TableCell>
                  <TableCell>{new Date(r.return_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{r.grn_no}</TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
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

export default AccPurchaseReturnsPage;
