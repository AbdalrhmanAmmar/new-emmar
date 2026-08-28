import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, BadgeCheck, Banknote, Loader2, Save } from 'lucide-react';

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
import {
  GL, addDays, calcTotals, getSettings, money, nextDocNo, num, postJournal, qty, todayStr, withinTolerance,
} from '@/lib/docFlow';

type Line = { grn_line_id: string; item_code: string; item_name: string; received_kg: number; remaining_kg: number; quantity_kg: number; po_price: number; unit_price: number; vat_rate: number };

const AccVendorBillsPage: React.FC = () => {
  const refresh = useRefresh();
  const s = getSettings();
  const { data: bills = [] } = useTable('acc_vendor_bills');
  const { data: billLines = [] } = useTable('acc_vendor_bill_lines');
  const { data: grns = [] } = useTable('acc_goods_receipts');
  const { data: grnLines = [] } = useTable('acc_goods_receipt_lines');
  const { data: banks = [] } = useTable('acc_bank_accounts');

  const [grnId, setGrnId] = useState('');
  const [vendorRef, setVendorRef] = useState('');
  const [billDate, setBillDate] = useState(todayStr());
  const [whtPct, setWhtPct] = useState(s.wht_purchase_pct);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);

  const openGrns = useMemo(() => grns.filter((g: any) => g.status !== 'billed' && g.status !== 'cancelled'), [grns]);
  const grn = grns.find((g: any) => g.id === grnId);

  useEffect(() => {
    if (!grnId) return setLines([]);
    setLines(grnLines.filter((l: any) => l.grn_id === grnId).map((l: any) => {
      const remaining = Math.max(0, num(l.received_kg) - num(l.billed_kg));
      return {
        grn_line_id: l.id, item_code: l.item_code, item_name: l.item_name,
        received_kg: num(l.received_kg), remaining_kg: remaining, quantity_kg: remaining,
        po_price: num(l.unit_cost), unit_price: num(l.unit_cost), vat_rate: num(l.vat_rate),
      };
    }));
  }, [grnId, grnLines]);

  const totals = useMemo(
    () => calcTotals(lines.map((l) => ({ quantity_kg: l.quantity_kg, unit_price: l.unit_price, vat_rate: l.vat_rate })), { wht_pct: whtPct, stamp: true }),
    [lines, whtPct],
  );
  const priceMismatch = lines.filter((l) => !withinTolerance(l.po_price, l.unit_price, s.price_tolerance_pct));
  const setLine = (id: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.grn_line_id === id ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!grn) return toast.error('اختر إذن الاستلام');
    if (!vendorRef.trim()) return toast.error('أدخل رقم فاتورة المورد لمنع تكرار تسجيل نفس الفاتورة');
    const filled = lines.filter((l) => num(l.quantity_kg) > 0);
    if (!filled.length) return toast.error('لا توجد كميات لم تُفوتر على هذا الإذن');
    const over = filled.find((l) => num(l.quantity_kg) > l.remaining_kg + 0.001);
    if (over) return toast.error(`كمية ${over.item_name} أكبر من المستلم غير المفوتر`);
    setSaving(true);
    try {
      const bill_no = nextDocNo('acc_vendor_bills', 'bill_no', 'VB');
      const due_date = addDays(billDate, num(grn.payment_terms_days) || 30);
      const match_status = priceMismatch.length ? 'price_variance' : 'matched';
      // قيد الفاتورة: تسوية حساب الاستلام غير المفوتر + ض.ق.م خصم + خصم وحسم
      const journal_no = await postJournal({
        date: billDate,
        description: `فاتورة مورد ${bill_no} — ${grn.vendor_name} — ${grn.grn_no}`,
        source: 'vendor_bill',
        ref_no: bill_no,
        lines: [
          { code: GL.grni, description: `تسوية مستحق الاستلام ${grn.grn_no}`, debit: totals.subtotal },
          { code: GL.vatInput, description: 'ض.ق.م مشتريات (خصم)', debit: totals.vat_total },
          { code: GL.whtPayable, description: `خصم وحسم ${whtPct}% مستحق للمصلحة`, credit: totals.wht_total },
          { code: GL.payable, description: `مستحق للمورد ${grn.vendor_name}`, credit: totals.net_payable },
        ],
      });
      const { data: ins, error } = await (supabase as any).from('acc_vendor_bills').insert({
        bill_no, vendor_ref: vendorRef.trim(), bill_date: billDate, due_date,
        po_no: grn.po_no, grn_no: grn.grn_no, grn_id: grn.id,
        vendor_id: grn.vendor_id, vendor_name: grn.vendor_name, vendor_vat: null,
        subtotal: totals.subtotal, vat_total: totals.vat_total, wht_pct: num(whtPct), wht_total: totals.wht_total,
        stamp_total: totals.stamp_total, total: totals.total, net_payable: totals.net_payable,
        paid_amount: 0, balance: totals.net_payable,
        match_status, status: 'posted', journal_no, notes: null,
      }).select('*').single();
      if (error) throw error;

      let i = 1;
      for (const l of filled) {
        await (supabase as any).from('acc_vendor_bill_lines').insert({
          bill_id: ins.id, bill_no, line_no: i++, item_code: l.item_code, item_name: l.item_name,
          quantity_kg: num(l.quantity_kg), unit_price: num(l.unit_price), vat_rate: l.vat_rate,
          line_total: Math.round(num(l.quantity_kg) * num(l.unit_price) * 100) / 100,
        });
        const src = grnLines.find((x: any) => x.id === l.grn_line_id);
        await (supabase as any).from('acc_goods_receipt_lines')
          .update({ billed_kg: num(src?.billed_kg) + num(l.quantity_kg) }).eq('id', l.grn_line_id);
      }
      const fullyBilled = lines.every((l) => num(l.quantity_kg) >= l.remaining_kg - 0.001);
      await (supabase as any).from('acc_goods_receipts')
        .update({ status: fullyBilled ? 'billed' : 'partially_billed' }).eq('id', grn.id);

      toast.success(`تم تسجيل الفاتورة ${bill_no} وترحيلها (${journal_no})`);
      setGrnId(''); setVendorRef('');
      refresh('acc_vendor_bills', 'acc_vendor_bill_lines', 'acc_goods_receipts', 'acc_goods_receipt_lines', 'acc_journal_entries', 'acc_ledger_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const pay = async (bill: any) => {
    if (num(bill.balance) <= 0) return toast.error('الفاتورة مسددة بالكامل — لا يمكن تكرار الدفع');
    const bank = banks[0];
    const amount = num(bill.balance);
    try {
      const journal_no = await postJournal({
        date: todayStr(),
        description: `سداد فاتورة المورد ${bill.bill_no} — ${bill.vendor_name}`,
        source: 'vendor_payment',
        ref_no: bill.bill_no,
        lines: [
          { code: GL.payable, description: `سداد ${bill.vendor_name}`, debit: amount },
          { code: bank ? GL.bank : GL.cash, description: bank ? `من ${bank.bank_name ?? bank.name_ar ?? 'البنك'}` : 'من الخزينة', credit: amount },
        ],
      });
      await (supabase as any).from('acc_vendor_bills')
        .update({ paid_amount: num(bill.paid_amount) + amount, balance: 0, status: 'paid' }).eq('id', bill.id);
      toast.success(`تم سداد ${money(amount)} ج.م (${journal_no})`);
      refresh('acc_vendor_bills', 'acc_journal_entries', 'acc_ledger_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل السداد');
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">فواتير الموردين والسداد (المرحلة 4 و5 من دورة الشراء)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مطابقة ثلاثية: أمر الشراء ↔ إذن الاستلام ↔ فاتورة المورد، مع ض.ق.م 14% وخصم وحسم {s.wht_purchase_pct}% وتنبيه فرق السعر.
          </p>
        </div>
        <ExportPdfButton
          title="فواتير الموردين"
          headers={['رقم الفاتورة', 'مرجع المورد', 'التاريخ', 'المورد', 'الصافي', 'الضريبة', 'خصم وحسم', 'المستحق', 'الرصيد']}
          rows={bills.map((b: any) => [b.bill_no, b.vendor_ref, b.bill_date, b.vendor_name, money(b.subtotal), money(b.vat_total), money(b.wht_total), money(b.net_payable), money(b.balance)])}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>تسجيل فاتورة مورد من إذن استلام</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>إذن الاستلام</Label>
              <Select value={grnId} onValueChange={setGrnId}>
                <SelectTrigger><SelectValue placeholder="إذون غير مفوترة" /></SelectTrigger>
                <SelectContent>{openGrns.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.grn_no} — {g.vendor_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>رقم فاتورة المورد</Label><Input value={vendorRef} onChange={(e) => setVendorRef(e.target.value)} placeholder="3391/2026" /></div>
            <div><Label>تاريخ الفاتورة</Label><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
            <div><Label>خصم وحسم %</Label><Input type="number" step="0.1" value={whtPct} onChange={(e) => setWhtPct(Number(e.target.value))} /></div>
          </div>

          {!!priceMismatch.length && (
            <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              فرق سعر يتجاوز {s.price_tolerance_pct}% في: {priceMismatch.map((l) => l.item_name).join('، ')} — ستُسجَّل الفاتورة بحالة «فرق سعر» للمراجعة.
            </div>
          )}

          {!!lines.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>المستلم</TableHead>
                  <TableHead>غير المفوتر</TableHead>
                  <TableHead>الكمية المفوترة</TableHead>
                  <TableHead>سعر الأمر</TableHead>
                  <TableHead>سعر الفاتورة</TableHead>
                  <TableHead>ض.ق.م %</TableHead>
                  <TableHead>القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.grn_line_id}>
                    <TableCell className="font-medium">{l.item_name}</TableCell>
                    <TableCell>{qty(l.received_kg)}</TableCell>
                    <TableCell>{qty(l.remaining_kg)}</TableCell>
                    <TableCell><Input type="number" className="w-32" value={l.quantity_kg} onChange={(e) => setLine(l.grn_line_id, { quantity_kg: Number(e.target.value) })} /></TableCell>
                    <TableCell>{money(l.po_price)}</TableCell>
                    <TableCell><Input type="number" step="0.01" className="w-28" value={l.unit_price} onChange={(e) => setLine(l.grn_line_id, { unit_price: Number(e.target.value) })} /></TableCell>
                    <TableCell>{l.vat_rate}%</TableCell>
                    <TableCell className="font-semibold">{money(num(l.quantity_kg) * num(l.unit_price))} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="grid md:grid-cols-5 gap-3 text-sm">
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">الصافي</div><div className="font-bold">{money(totals.subtotal)}</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">ض.ق.م</div><div className="font-bold">{money(totals.vat_total)}</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">خصم وحسم</div><div className="font-bold">-{money(totals.wht_total)}</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">الإجمالي</div><div className="font-bold">{money(totals.total)}</div></div>
            <div className="p-3 rounded bg-primary/10 border border-primary/30"><div className="text-muted-foreground">المستحق للمورد</div><div className="font-bold text-primary">{money(totals.net_payable)} ج.م</div></div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !grnId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} ترحيل الفاتورة
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>فواتير الموردين ({bills.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>مرجع المورد</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الاستحقاق</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>الأصناف</TableHead>
                <TableHead>المستحق</TableHead>
                <TableHead>الرصيد</TableHead>
                <TableHead>المطابقة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">لا توجد فواتير</TableCell></TableRow>
              ) : bills.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.bill_no}</TableCell>
                  <TableCell>{b.vendor_ref}</TableCell>
                  <TableCell>{new Date(b.bill_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{new Date(b.due_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{b.vendor_name}</TableCell>
                  <TableCell>{billLines.filter((l: any) => l.bill_id === b.id).map((l: any) => l.item_name).join(' / ')}</TableCell>
                  <TableCell className="font-semibold">{money(b.net_payable)}</TableCell>
                  <TableCell className={num(b.balance) > 0 ? 'text-destructive font-semibold' : ''}>{money(b.balance)}</TableCell>
                  <TableCell>
                    {b.match_status === 'matched'
                      ? <span className="inline-flex items-center gap-1 text-emerald-700"><BadgeCheck className="h-4 w-4" /> مطابقة</span>
                      : <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-4 w-4" /> فرق سعر</span>}
                  </TableCell>
                  <TableCell><StatusBadge status={b.status} /></TableCell>
                  <TableCell>
                    <RowActions>
                      <Button variant="ghost" size="icon" title="سداد الفاتورة" onClick={() => pay(b)}>
                        <Banknote className="h-4 w-4" />
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

export default AccVendorBillsPage;
